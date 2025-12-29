import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AutopilotService } from '../services/AutopilotService';
import { AutopilotSettings, ScheduledPost, TrendResearch, FacebookAccount } from '../models';
import { Op } from 'sequelize';

export class AutopilotController {
  static async getSettings(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;
      const userId = req.user!.id;

      const account = await FacebookAccount.findOne({
        where: { id: accountId, userId },
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found',
        });
      }

      const [settings] = await AutopilotSettings.findOrCreate({
        where: {
          userId,
          facebookAccountId: accountId,
        },
        defaults: {
          userId,
          facebookAccountId: accountId,
        },
      });

      res.json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async updateSettings(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;
      const userId = req.user!.id;

      const account = await FacebookAccount.findOne({
        where: { id: accountId, userId },
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found',
        });
      }

      const [settings] = await AutopilotSettings.findOrCreate({
        where: {
          userId,
          facebookAccountId: accountId,
        },
        defaults: {
          userId,
          facebookAccountId: accountId,
        },
      });

      await settings.update(req.body);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async researchTrends(req: AuthRequest, res: Response) {
    try {
      const { category } = req.query;

      const trends = await AutopilotService.researchTrendingTopics(
        category as string | undefined
      );

      res.json({
        success: true,
        data: trends,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async getTrends(req: AuthRequest, res: Response) {
    try {
      const { category, minScore } = req.query;

      const where: any = {
        validUntil: { [Op.gte]: new Date() },
      };

      if (category) {
        where.category = category;
      }

      if (minScore) {
        where.trendScore = { [Op.gte]: parseInt(minScore as string) };
      }

      const trends = await TrendResearch.findAll({
        where,
        order: [['trendScore', 'DESC']],
        limit: 20,
      });

      res.json({
        success: true,
        data: trends,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async generateContent(req: AuthRequest, res: Response) {
    try {
      const { topic, targetAudience, contentType } = req.body;

      const ideas = await AutopilotService.generateContentIdeas(
        topic,
        targetAudience,
        contentType
      );

      res.json({
        success: true,
        data: ideas,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async predictPerformance(req: AuthRequest, res: Response) {
    try {
      const { content, hashtags, historicalData } = req.body;

      const prediction = await AutopilotService.predictPostPerformance(
        content,
        hashtags,
        historicalData
      );

      res.json({
        success: true,
        data: prediction,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async generateHashtags(req: AuthRequest, res: Response) {
    try {
      const { content, niche } = req.body;

      const hashtags = await AutopilotService.generateHashtags(content, niche);

      res.json({
        success: true,
        data: hashtags,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async scheduleAutoPosts(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;
      const userId = req.user!.id;

      const account = await FacebookAccount.findOne({
        where: { id: accountId, userId },
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found',
        });
      }

      const posts = await AutopilotService.scheduleAutoPosts(accountId);

      res.json({
        success: true,
        data: posts,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async getScheduledPosts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { accountId, status } = req.query;

      const where: any = { userId };

      if (accountId) {
        where.facebookAccountId = accountId;
      }

      if (status) {
        where.status = status;
      }

      const posts = await ScheduledPost.findAll({
        where,
        include: [FacebookAccount],
        order: [['scheduledFor', 'ASC']],
      });

      res.json({
        success: true,
        data: posts,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async createScheduledPost(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        facebookAccountId,
        content,
        contentType,
        mediaUrls,
        hashtags,
        scheduledFor,
      } = req.body;

      const account = await FacebookAccount.findOne({
        where: { id: facebookAccountId, userId },
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found',
        });
      }

      const post = await ScheduledPost.create({
        userId,
        facebookAccountId,
        content,
        contentType,
        mediaUrls,
        hashtags,
        scheduledFor: new Date(scheduledFor),
      });

      res.status(201).json({
        success: true,
        data: post,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async cancelScheduledPost(req: AuthRequest, res: Response) {
    try {
      const { postId } = req.params;
      const userId = req.user!.id;

      const post = await ScheduledPost.findOne({
        where: { id: postId, userId },
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found',
        });
      }

      if (post.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Cannot cancel post with current status',
        });
      }

      post.status = 'cancelled';
      await post.save();

      res.json({
        success: true,
        data: post,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async getOptimalPostingTimes(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;

      const times = await AutopilotService.suggestOptimalPostingTimes(accountId);

      res.json({
        success: true,
        data: times,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
