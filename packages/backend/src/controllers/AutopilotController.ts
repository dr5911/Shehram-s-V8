import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AutopilotService } from '../services/AutopilotService';
import { AutopilotSettings, ScheduledPost, TrendResearch, FacebookAccount } from '../models';
import { Op } from 'sequelize';
import { AppError, NotFoundError, ValidationError } from '../errors';
import { handleSequelizeError } from '../utils/errorHelpers';

export class AutopilotController {
  static async getSettings(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;
      const userId = req.user!.id;

      const account = await FacebookAccount.findOne({
        where: { id: accountId, userId },
      });

      if (!account) {
        throw new NotFoundError('Account not found');
      }

      try {
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
        handleSequelizeError(error);
      }
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve autopilot settings',
        });
      }
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
        throw new NotFoundError('Account not found');
      }

      try {
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
        handleSequelizeError(error);
      }
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update autopilot settings',
        });
      }
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
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to research trending topics',
        });
      }
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
        const parsedScore = parseInt(minScore as string);
        if (isNaN(parsedScore)) {
          throw new ValidationError('Invalid minScore value');
        }
        where.trendScore = { [Op.gte]: parsedScore };
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
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve trending topics',
        });
      }
    }
  }

  static async generateContent(req: AuthRequest, res: Response) {
    try {
      const { topic, targetAudience, contentType } = req.body;

      if (!topic) {
        throw new ValidationError('Topic is required');
      }

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
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to generate content ideas',
        });
      }
    }
  }

  static async predictPerformance(req: AuthRequest, res: Response) {
    try {
      const { content, hashtags, historicalData } = req.body;

      if (!content) {
        throw new ValidationError('Content is required');
      }

      if (!hashtags || !Array.isArray(hashtags)) {
        throw new ValidationError('Hashtags must be an array');
      }

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
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to predict post performance',
        });
      }
    }
  }

  static async generateHashtags(req: AuthRequest, res: Response) {
    try {
      const { content, niche } = req.body;

      if (!content) {
        throw new ValidationError('Content is required');
      }

      const hashtags = await AutopilotService.generateHashtags(content, niche);

      res.json({
        success: true,
        data: hashtags,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to generate hashtags',
        });
      }
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
        throw new NotFoundError('Account not found');
      }

      const posts = await AutopilotService.scheduleAutoPosts(accountId);

      res.json({
        success: true,
        data: posts,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to schedule auto posts',
        });
      }
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
        const validStatuses = ['pending', 'processing', 'published', 'failed', 'cancelled'];
        if (!validStatuses.includes(status as string)) {
          throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
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
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve scheduled posts',
        });
      }
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

      if (!facebookAccountId || !content || !contentType || !scheduledFor) {
        throw new ValidationError('Missing required fields: facebookAccountId, content, contentType, scheduledFor');
      }

      const scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        throw new ValidationError('Invalid scheduledFor date');
      }

      if (scheduledDate < new Date()) {
        throw new ValidationError('Scheduled time must be in the future');
      }

      const account = await FacebookAccount.findOne({
        where: { id: facebookAccountId, userId },
      });

      if (!account) {
        throw new NotFoundError('Account not found');
      }

      try {
        const post = await ScheduledPost.create({
          userId,
          facebookAccountId,
          content,
          contentType,
          mediaUrls,
          hashtags,
          scheduledFor: scheduledDate,
        });

        res.status(201).json({
          success: true,
          data: post,
        });
      } catch (error: any) {
        handleSequelizeError(error);
      }
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create scheduled post',
        });
      }
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
        throw new NotFoundError('Post not found');
      }

      if (post.status !== 'pending') {
        throw new ValidationError('Cannot cancel post with current status');
      }

      post.status = 'cancelled';
      await post.save();

      res.json({
        success: true,
        data: post,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to cancel scheduled post',
        });
      }
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
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve optimal posting times',
        });
      }
    }
  }
}
