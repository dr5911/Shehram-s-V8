import cron from 'node-cron';
import { ScheduledPost } from '../models';
import { AutopilotService } from '../services/AutopilotService';
import { Op } from 'sequelize';

export const startScheduledPostsJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    console.log('Checking for scheduled posts to publish...');

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

      for (const post of posts) {
        try {
          await AutopilotService.executeScheduledPost(post.id);
          console.log(`Published scheduled post: ${post.id}`);
        } catch (error: any) {
          console.error(`Failed to publish post ${post.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Scheduled posts job error:', error);
    }
  });

  console.log('Scheduled posts job started (runs every 5 minutes)');
};
