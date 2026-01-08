import cron from 'node-cron';
import { ScheduledPost } from '../models';
import { AutopilotService } from '../services/AutopilotService';
import { Op } from 'sequelize';
import { AppError, ExternalServiceError, DatabaseError } from '../errors';
import { sleep } from '../utils/errorHelpers';

export const startScheduledPostsJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] Checking for scheduled posts to publish...`);

    try {
      const now = new Date();
      const posts = await ScheduledPost.findAll({
        where: {
          status: 'pending',
          scheduledFor: {
            [Op.lte]: now,
          },
        },
        limit: 10,
      });

      console.log(`Found ${posts.length} pending posts to publish`);

      for (const post of posts) {
        await processScheduledPost(post);
      }

      console.log(`[${new Date().toISOString()}] Scheduled posts job completed`);
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] Scheduled posts job error:`, {
        message: error.message,
        name: error.name,
        timestamp: new Date().toISOString(),
      });
    }
  });

  console.log('Scheduled posts job started (runs every 5 minutes)');
};

async function processScheduledPost(post: ScheduledPost): Promise<void> {
  const maxRetries = 3;
  let attempt = 0;
  let lastError: any;

  console.log(`Processing scheduled post ${post.id} (attempt ${attempt + 1}/${maxRetries})`);

  while (attempt < maxRetries) {
    try {
      post.status = 'processing';
      post.retryCount = (post.retryCount || 0) + 1;
      post.lastRetryAt = new Date();

      try {
        await post.save();
      } catch (saveError: any) {
        console.error(`Failed to update post status to processing: ${post.id}`, saveError.message);
        throw new DatabaseError('Failed to update post status', { postId: post.id });
      }

      await AutopilotService.executeScheduledPost(post.id);

      console.log(`✅ Successfully published scheduled post: ${post.id}`);
      return;

    } catch (error: any) {
      lastError = error;
      attempt++;

      const isRateLimitError = error instanceof AppError && error.statusCode === 429;
      const isTemporaryError = error instanceof ExternalServiceError || isRateLimitError;
      const shouldRetry = attempt < maxRetries && isTemporaryError;

      console.error(`❌ Failed to publish post ${post.id} (attempt ${attempt}/${maxRetries}):`, {
        error: error.message,
        errorType: error.constructor.name,
        statusCode: error.statusCode,
        shouldRetry,
      });

      if (shouldRetry) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        console.log(`⏳ Retrying post ${post.id} in ${backoffDelay}ms...`);
        await sleep(backoffDelay);
      } else {
        break;
      }
    }
  }

  try {
    post.status = 'failed';
    post.errorMessage = lastError?.message || 'Unknown error occurred';
    post.metadata = {
      ...post.metadata,
      failedAt: new Date().toISOString(),
      attempts: attempt,
      errorType: lastError?.constructor?.name,
    };
    await post.save();

    console.error(`💀 Post ${post.id} permanently failed after ${attempt} attempts:`, post.errorMessage);
  } catch (saveError: any) {
    console.error(`Failed to update post status to 'failed':`, {
      postId: post.id,
      saveError: saveError.message,
      originalError: lastError?.message,
    });
  }
}
