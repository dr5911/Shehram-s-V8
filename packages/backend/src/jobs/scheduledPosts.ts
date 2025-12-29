import cron from 'node-cron';
import { ScheduledPost } from '../models';
import { AutopilotService } from '../services/AutopilotService';
import { Op } from 'sequelize';
import { Logger } from '../utils/logger';
import { calculateExponentialBackoff, sleep } from '../utils/retry';
import { ScheduledPostError } from '../utils/customErrors';

const logger = Logger.getInstance();

// Maximum retries for scheduled posts
const MAX_RETRIES = 3;

export const startScheduledPostsJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Starting scheduled posts check...');

    try {
      const now = new Date();
      // Get posts that are pending or failed with retries remaining
      const posts = await ScheduledPost.findAll({
        where: {
          [Op.or]: [
            { status: 'pending' },
            { 
              status: 'failed',
              [Op.and]: {
                [Op.or]: [
                  { metadata: { [Op.is]: null } },
                  { 'metadata.retryCount': { [Op.lt]: MAX_RETRIES } }
                ]
              }
            }
          ],
          scheduledFor: {
            [Op.lte]: now,
          },
        },
        limit: 10,
      });

      logger.info(`Found ${posts.length} posts to process`);

      for (const post of posts) {
        try {
          await processScheduledPost(post);
        } catch (error) {
          logger.error(`Failed to process post ${post.id}`, { error });
        }
      }
    } catch (error) {
      logger.error('Scheduled posts job error', { error });
    }
  });

  logger.info('Scheduled posts job started (runs every 5 minutes)');
};

/**
 * Process a single scheduled post with retry logic
 */
async function processScheduledPost(post: ScheduledPost): Promise<void> {
  const retryCount = post.metadata?.retryCount || 0;
  
  logger.info(`Processing scheduled post ${post.id}`, {
    retryCount,
    maxRetries: MAX_RETRIES
  });

  try {
    // If this is a retry, apply exponential backoff
    if (retryCount > 0) {
      const delay = calculateExponentialBackoff(retryCount - 1);
      logger.info(`Applying backoff delay of ${delay}ms for post ${post.id}`);
      await sleep(delay);
    }

    // Mark as processing
    post.status = 'processing';
    await post.save();

    // Execute the post
    await AutopilotService.executeScheduledPost(post.id);
    
    logger.info(`Successfully published scheduled post: ${post.id}`);
  } catch (error: any) {
    const newRetryCount = retryCount + 1;
    
    logger.error(`Failed to publish post ${post.id} (attempt ${newRetryCount}/${MAX_RETRIES})`, {
      error: error.message,
      retryCount: newRetryCount
    });

    // Check if we should retry
    if (newRetryCount < MAX_RETRIES) {
      // Update retry count and keep status as pending for next run
      post.metadata = {
        ...post.metadata,
        retryCount: newRetryCount,
        lastError: error.message,
        lastRetryAt: new Date().toISOString()
      };
      post.status = 'pending'; // Reset to pending for retry
      
      logger.info(`Post ${post.id} will be retried`, {
        retryCount: newRetryCount,
        nextRetryAfter: calculateExponentialBackoff(newRetryCount - 1)
      });
    } else {
      // Max retries reached, mark as failed
      post.status = 'failed';
      post.errorMessage = error.message;
      post.metadata = {
        ...post.metadata,
        retryCount: newRetryCount,
        finalError: error.message,
        failedAt: new Date().toISOString()
      };
      
      logger.error(`Post ${post.id} failed permanently after ${MAX_RETRIES} retries`, {
        error: error.message
      });
    }
    
    await post.save();
    
    // Throw custom error for tracking
    throw new ScheduledPostError(
      `Failed to publish scheduled post: ${error.message}`,
      post.id,
      newRetryCount,
      error
    );
  }
}
