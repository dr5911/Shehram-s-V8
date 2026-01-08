import OpenAI from 'openai';
import { AutopilotSettings, ScheduledPost, TrendResearch, FacebookAccount } from '../models';
import { FacebookService } from './FacebookService';
import { Op } from 'sequelize';
import { ExternalServiceError, RateLimitError, AppError, DatabaseError } from '../errors';
import { withRetry, handleOpenAIError } from '../utils/errorHelpers';

export class AutopilotService {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
  });

  static async researchTrendingTopics(category?: string) {
    try {
      const prompt = `As a social media expert, identify 5 trending topics ${
        category ? `in the ${category} category` : 'across all categories'
      } that are currently popular on Facebook and Instagram. For each topic, provide:
1. Topic name
2. Brief description (2-3 sentences)
3. Trend score (1-100)
4. 5 suggested hashtags
5. 3 related subtopics
6. Content suggestion for creating viral posts

Return the response as a JSON array.`;

      const response = await withRetry(
        () => this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
          maxDelayMs: 30000,
        }
      );

      const trends = JSON.parse(response.choices[0].message.content || '{}');
      
      const savedTrends = [];
      for (const trend of trends.topics || []) {
        try {
          const savedTrend = await TrendResearch.create({
            topic: trend.name,
            category: category || 'general',
            description: trend.description,
            trendScore: trend.trendScore,
            suggestedHashtags: trend.hashtags,
            relatedTopics: trend.relatedTopics,
            contentSuggestion: trend.contentSuggestion,
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
          savedTrends.push(savedTrend);
        } catch (dbError: any) {
          console.error(`Failed to save trend "${trend.name}":`, dbError.message);
        }
      }

      return savedTrends;
    } catch (error: any) {
      handleOpenAIError(error);
      return [];
    }
  }

  static async generateContentIdeas(
    topic: string,
    targetAudience?: string,
    contentType?: string
  ) {
    try {
      const prompt = `Generate 3 unique content ideas for Facebook/Instagram about "${topic}".
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${contentType ? `Content type: ${contentType}` : ''}

For each idea, provide:
1. Title/Hook
2. Full caption (engaging, 100-200 words)
3. Suggested hashtags (5-10)
4. Best posting time
5. Expected engagement prediction (1-100)
6. Content format recommendation

Return as JSON array.`;

      const response = await withRetry(
        () => this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
        }
      );

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error: any) {
      handleOpenAIError(error);
      return { ideas: [], fallback: 'Unable to generate ideas at this time. Please try again later.' };
    }
  }

  static async predictPostPerformance(
    content: string,
    hashtags: string[],
    historicalData?: any
  ) {
    try {
      const prompt = `Analyze this social media post and predict its performance:

Content: "${content}"
Hashtags: ${hashtags.join(', ')}

Consider:
1. Content quality and engagement potential
2. Hashtag effectiveness
3. Optimal posting time
4. Predicted reach
5. Expected engagement rate
6. Virality potential

${historicalData ? `Historical performance data: ${JSON.stringify(historicalData)}` : ''}

Provide a performance score (1-100) and detailed analysis as JSON.`;

      const response = await withRetry(
        () => this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
        {
          maxAttempts: 2,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
        }
      );

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error: any) {
      handleOpenAIError(error);
      return {
        performanceScore: 50,
        analysis: 'Unable to generate performance prediction. Content quality assessment unavailable.',
        engagementRate: '3-5%',
        reach: 'moderate',
      };
    }
  }

  static async suggestOptimalPostingTimes(accountId: string) {
    try {
      const settings = await AutopilotSettings.findOne({
        where: { facebookAccountId: accountId },
      });

      if (settings && settings.preferredHours) {
        return {
          weekday: settings.preferredHours,
          weekend: settings.preferredHours,
          best: settings.preferredHours.slice(0, 3),
        };
      }

      return {
        weekday: [9, 12, 15, 19, 21],
        weekend: [10, 14, 19, 20],
        best: [9, 15, 19],
      };
    } catch (error: any) {
      console.error('Failed to get optimal posting times:', error.message);
      return {
        weekday: [9, 12, 15, 19, 21],
        weekend: [10, 14, 19, 20],
        best: [9, 15, 19],
      };
    }
  }

  static async generateHashtags(content: string, niche?: string) {
    try {
      const prompt = `Generate 10-15 relevant and trending hashtags for this social media content:
Content: "${content}"
${niche ? `Niche: ${niche}` : ''}

Mix of:
- Popular broad hashtags (high reach)
- Niche-specific hashtags (targeted)
- Trending hashtags (current)

Return as JSON array.`;

      const response = await withRetry(
        () => this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
        }
      );

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.hashtags || [];
    } catch (error: any) {
      handleOpenAIError(error);
      const words = content.split(/\s+/).filter((word: string) => word.length > 4).slice(0, 5);
      const hashtags = words.map((word: string) => `#${word.replace(/[^a-zA-Z0-9]/g, '')}`);
      return hashtags.length > 0 ? hashtags : ['#socialmedia', '#content', '#trending'];
    }
  }

  static async scheduleAutoPosts(accountId: string) {
    try {
      const settings = await AutopilotSettings.findOne({
        where: { facebookAccountId: accountId },
      });

      if (!settings || !settings.autoPostEnabled) {
        return [];
      }

      const trends = await TrendResearch.findAll({
        where: {
          validUntil: { [Op.gte]: new Date() },
          trendScore: { [Op.gte]: 70 },
        },
        order: [['trendScore', 'DESC']],
        limit: settings.postsPerDay,
      });

      const scheduledPosts = [];
      for (let i = 0; i < trends.length; i++) {
        try {
          const trend = trends[i];
          const ideas = await this.generateContentIdeas(
            trend.topic,
            undefined,
            'post'
          );

          if (ideas.ideas && ideas.ideas.length > 0) {
            const idea = ideas.ideas[0];
            
            const scheduledFor = this.calculateNextPostTime(
              settings.preferredHours || [9, 14, 19],
              i
            );

            const post = await ScheduledPost.create({
              userId: settings.userId,
              facebookAccountId: accountId,
              content: idea.caption,
              contentType: 'post',
              hashtags: idea.hashtags,
              scheduledFor,
              metadata: {
                trendId: trend.id,
                predictedScore: idea.expectedEngagement,
              },
            });

            scheduledPosts.push(post);
          }
        } catch (error: any) {
          console.error(`Failed to schedule post for trend ${trends[i].id}:`, error.message);
        }
      }

      return scheduledPosts;
    } catch (error: any) {
      console.error('Failed to schedule auto posts:', error.message);
      throw new ExternalServiceError('Failed to schedule posts', { accountId });
    }
  }

  private static calculateNextPostTime(preferredHours: number[], offset: number): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + Math.floor(offset / preferredHours.length));
    
    const hourIndex = offset % preferredHours.length;
    tomorrow.setHours(preferredHours[hourIndex], 0, 0, 0);
    
    return tomorrow;
  }

  static async executeScheduledPost(postId: string) {
    const post = await ScheduledPost.findByPk(postId, {
      include: [FacebookAccount],
    });

    if (!post || post.status !== 'pending') {
      throw new AppError('Post not found or already processed', 404, true, { postId });
    }

    try {
      post.status = 'processing';
      await post.save();
    } catch (error: any) {
      console.error(`Failed to update post status to processing: ${postId}`, error.message);
      throw new DatabaseError('Failed to update post status', { postId });
    }

    const account = post.facebookAccount;
    if (!account || !account.pageId || !account.pageAccessToken) {
      throw new AppError('Account not properly configured', 400, true, {
        postId,
        hasAccount: !!account,
        hasPageId: !!account?.pageId,
        hasAccessToken: !!account?.pageAccessToken,
      });
    }

    try {
      const result = await FacebookService.publishPost(
        account.pageId,
        account.pageAccessToken,
        post.content
      );

      post.status = 'published';
      post.publishedContentId = result.id;
      post.publishedAt = new Date();
      await post.save();

      return post;
    } catch (error: any) {
      if (!(error instanceof AppError)) {
        console.error(`Failed to publish post ${postId}:`, {
          message: error.message,
          name: error.name,
        });
      }

      throw error;
    }
  }
}
