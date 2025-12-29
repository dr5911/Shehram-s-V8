import OpenAI from 'openai';
import { AutopilotSettings, ScheduledPost, TrendResearch, FacebookAccount } from '../models';
import { FacebookService } from './FacebookService';
import { Op } from 'sequelize';

export class AutopilotService {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

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

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const trends = JSON.parse(response.choices[0].message.content || '{}');
    
    const savedTrends = [];
    for (const trend of trends.topics || []) {
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
    }

    return savedTrends;
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

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
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

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  static async suggestOptimalPostingTimes(accountId: string) {
    // This would analyze historical performance data
    // For now, return common optimal times
    return {
      weekday: [9, 12, 15, 19, 21],
      weekend: [10, 14, 19, 20],
      best: [9, 15, 19],
    };
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

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.hashtags || [];
  }

  static async scheduleAutoPosts(accountId: string) {
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
    }

    return scheduledPosts;
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
      return null;
    }

    try {
      post.status = 'processing';
      await post.save();

      const account = post.facebookAccount;
      if (!account.pageId || !account.pageAccessToken) {
        throw new Error('Account not properly configured');
      }

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
      post.status = 'failed';
      post.errorMessage = error.message;
      await post.save();
      throw error;
    }
  }
}
