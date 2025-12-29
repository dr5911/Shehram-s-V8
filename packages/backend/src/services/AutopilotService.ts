import OpenAI from 'openai';
import { AutopilotSettings, ScheduledPost, TrendResearch, FacebookAccount } from '../models';
import { FacebookService } from './FacebookService';
import { Op } from 'sequelize';
import { retryExternalAPICall } from '../utils/retry';
import { Logger } from '../utils/logger';
import { OpenAIError, ScheduledPostError, FacebookAPIError } from '../utils/customErrors';

const logger = Logger.getInstance();

export class AutopilotService {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  private static readonly OPENAI_TIMEOUT_MS = 120000; // 2 minutes timeout for OpenAI
  private static readonly MAX_OPENAI_TOKENS = 4000;

  static async researchTrendingTopics(category?: string) {
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

    try {
      logger.info('Researching trending topics', { category });
      
      const response = await retryExternalAPICall(
        async () => {
          return this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            max_tokens: this.MAX_OPENAI_TOKENS,
            timeout: this.OPENAI_TIMEOUT_MS,
          });
        },
        'OpenAI_trendResearch',
        2 // Max 2 retries for OpenAI calls
      );

      const trends = JSON.parse(response.choices[0]?.message?.content || '{}');
      
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
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          });
          savedTrends.push(savedTrend);
        } catch (dbError) {
          logger.error('Failed to save trending topic to database', { 
            error: dbError,
            trend: trend.name 
          });
          // Continue with other trends
        }
      }

      logger.info(`Successfully researched and saved ${savedTrends.length} trending topics`);
      return savedTrends;
    } catch (error: any) {
      logger.error('Failed to research trending topics', { error });
      
      if (error.message?.includes('429') || error.code === 'rate_limit_exceeded') {
        throw new OpenAIError('OpenAI rate limit exceeded. Please try again later.', error);
      }
      
      if (error.code === 'timeout') {
        throw new OpenAIError('OpenAI request timed out. Please try again.', error);
      }
      
      throw new OpenAIError(`Failed to research trending topics: ${error.message}`, error);
    }
  }

  static async generateContentIdeas(
    topic: string,
    targetAudience?: string,
    contentType?: string
  ) {
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

    try {
      logger.info('Generating content ideas', { topic, targetAudience, contentType });
      
      const response = await retryExternalAPICall(
        async () => {
          return this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            max_tokens: this.MAX_OPENAI_TOKENS,
            timeout: this.OPENAI_TIMEOUT_MS,
          });
        },
        'OpenAI_contentIdeas',
        2
      );

      const ideas = JSON.parse(response.choices[0]?.message?.content || '{}');
      logger.info('Successfully generated content ideas', { topic, count: ideas.ideas?.length || 0 });
      
      return ideas;
    } catch (error: any) {
      logger.error('Failed to generate content ideas', { error, topic });
      
      // Return fallback ideas if OpenAI fails
      const fallbackIdeas = {
        ideas: [{
          title: "Engaging Content Idea",
          caption: `Share your thoughts about ${topic} with your audience. What makes this interesting to you?`,
          hashtags: ["#community", "#discussion", "#sharing"],
          bestPostingTime: "14:00",
          expectedEngagement: 65,
          format: "Text post with question"
        }]
      };
      
      logger.warn('Returning fallback content ideas due to OpenAI failure', { topic });
      return fallbackIdeas;
    }
  }

  static async predictPostPerformance(
    content: string,
    hashtags: string[],
    historicalData?: any
  ) {
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

    try {
      logger.info('Predicting post performance', { contentLength: content.length, hashtagsCount: hashtags.length });
      
      const response = await retryExternalAPICall(
        async () => {
          return this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            max_tokens: this.MAX_OPENAI_TOKENS,
            timeout: this.OPENAI_TIMEOUT_MS,
          });
        },
        'OpenAI_performancePrediction',
        2
      );

      const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');
      logger.info('Successfully predicted post performance', { 
        score: analysis.performanceScore || 0 
      });
      
      return analysis;
    } catch (error: any) {
      logger.error('Failed to predict post performance', { error });
      
      // Return reasonable fallback prediction
      const fallback = {
        performanceScore: 70,
        analysis: "Unable to analyze due to service issues",
        optimalPostingTime: "15:00",
        predictedReach: 1000,
        engagementRate: "3.5%",
        viralityPotential: "Moderate"
      };
      
      logger.warn('Returning fallback performance prediction due to OpenAI failure');
      return fallback;
    }
  }

  static async suggestOptimalPostingTimes(accountId: string) {
    logger.info('Suggesting optimal posting times', { accountId });
    
    try {
      // This would analyze historical performance data from the database
      // For now, return common optimal times based on research
      const optimalTimes = {
        weekday: [9, 12, 15, 19, 21],
        weekend: [10, 14, 19, 20],
        best: [9, 15, 19],
        analysis: "Based on general social media engagement patterns"
      };
      
      logger.info('Successfully generated optimal posting times', { accountId });
      return optimalTimes;
    } catch (error) {
      logger.error('Failed to suggest optimal posting times', { error, accountId });
      
      // Return safe defaults
      return {
        weekday: [9, 15, 19],
        weekend: [10, 16, 20],
        best: [15, 19],
        analysis: "Fallback times due to analysis failure"
      };
    }
  }

  static async generateHashtags(content: string, niche?: string) {
    const prompt = `Generate 10-15 relevant and trending hashtags for this social media content:
Content: "${content}"
${niche ? `Niche: ${niche}` : ''}

Mix of:
- Popular broad hashtags (high reach)
- Niche-specific hashtags (targeted)
- Trending hashtags (current)

Return as JSON array.`;

    try {
      logger.info('Generating hashtags', { contentLength: content.length, niche });
      
      const response = await retryExternalAPICall(
        async () => {
          return this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            max_tokens: 1000,
            timeout: this.OPENAI_TIMEOUT_MS,
          });
        },
        'OpenAI_hashtagGeneration',
        2
      );

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      const hashtags = result.hashtags || [];
      
      logger.info('Successfully generated hashtags', { count: hashtags.length });
      return hashtags;
    } catch (error: any) {
      logger.error('Failed to generate hashtags', { error });
      
      // Return fallback hashtags
      const fallback = niche ? 
        [`#${niche.replace(/\s+/g, '')}`, '#content', '#socialmedia', '#marketing'] :
        ['#content', '#socialmedia', '#marketing', '#engagement'];
      
      logger.warn('Returning fallback hashtags due to OpenAI failure', { niche });
      return fallback;
    }
  }

  static async scheduleAutoPosts(accountId: string) {
    logger.info('Scheduling auto posts', { accountId });
    
    try {
      const settings = await AutopilotSettings.findOne({
        where: { facebookAccountId: accountId },
      });

      if (!settings || !settings.autoPostEnabled) {
        logger.info('Auto posting disabled or settings not found', { accountId });
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

      logger.info(`Found ${trends.length} trending topics for auto posting`, { accountId });

      const scheduledPosts = [];
      for (let i = 0; i < trends.length; i++) {
        const trend = trends[i];
        
        try {
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
            logger.info(`Scheduled auto post for trend: ${trend.topic}`, { postId: post.id });
          }
        } catch (error) {
          logger.error(`Failed to schedule post for trend ${trend.topic}`, { 
            error,
            accountId 
          });
          // Continue with other trends
        }
      }

      logger.info(`Successfully scheduled ${scheduledPosts.length} auto posts`, { accountId });
      return scheduledPosts;
    } catch (error: any) {
      logger.error('Failed to schedule auto posts', { error, accountId });
      
      if (error instanceof OpenAIError) {
        throw error;
      }
      
      throw new OpenAIError(`Failed to schedule auto posts: ${error.message}`, error);
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
    logger.info('Executing scheduled post', { postId });
    
    const post = await ScheduledPost.findByPk(postId, {
      include: [FacebookAccount],
    });

    if (!post || post.status !== 'pending') {
      logger.warn('Post not found or not in pending status', { postId, status: post?.status });
      return null;
    }

    try {
      post.status = 'processing';
      await post.save();
      logger.info('Post status updated to processing', { postId });

      const account = post.facebookAccount;
      if (!account.pageId || !account.pageAccessToken) {
        throw new ScheduledPostError(
          'Account not properly configured',
          postId,
          post.metadata?.retryCount || 0
        );
      }

      logger.info('Publishing to Facebook', { postId, pageId: account.pageId });
      
      const result = await FacebookService.publishPost(
        account.pageId,
        account.pageAccessToken,
        post.content
      );

      post.status = 'published';
      post.publishedContentId = result.id;
      post.publishedAt = new Date();
      await post.save();

      logger.info('Post published successfully', { postId, facebookId: result.id });
      return post;
    } catch (error: any) {
      logger.error('Failed to execute scheduled post', { error, postId });
      
      post.status = 'failed';
      post.errorMessage = error.message;
      await post.save();
      
      // Wrap Facebook errors appropriately
      if (error instanceof FacebookAPIError) {
        throw error;
      }
      
      throw new ScheduledPostError(
        `Failed to execute scheduled post: ${error.message}`,
        postId,
        post.metadata?.retryCount || 0,
        error
      );
    }
  }
}