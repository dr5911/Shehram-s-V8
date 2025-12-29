import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Earning, FacebookAccount, Content } from '../models';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { AppError, NotFoundError, ValidationError } from '../errors';
import { handleSequelizeError } from '../utils/errorHelpers';

export class EarningsController {
  static async getEarnings(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { accountId, startDate, endDate, type } = req.query;

      const where: any = {};
      
      if (accountId) {
        where.facebookAccountId = accountId;
      }

      if (startDate || endDate) {
        where.earningDate = {};
        if (startDate) {
          const start = new Date(startDate as string);
          if (isNaN(start.getTime())) {
            throw new ValidationError('Invalid startDate format');
          }
          where.earningDate[Op.gte] = start;
        }
        if (endDate) {
          const end = new Date(endDate as string);
          if (isNaN(end.getTime())) {
            throw new ValidationError('Invalid endDate format');
          }
          where.earningDate[Op.lte] = end;
        }
      }

      if (type) {
        const validTypes = ['ad_revenue', 'subscription', 'stars', 'other'];
        if (!validTypes.includes(type as string)) {
          throw new ValidationError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }
        where.earningType = type;
      }

      const earnings = await Earning.findAll({
        where,
        include: [
          {
            model: FacebookAccount,
            where: { userId },
            attributes: ['id', 'name', 'pageName'],
          },
          {
            model: Content,
            attributes: ['id', 'contentType', 'title'],
          },
        ],
        order: [['earningDate', 'DESC']],
      });

      res.json({
        success: true,
        data: earnings,
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
          error: 'Failed to retrieve earnings',
        });
      }
    }
  }

  static async getEarningsSummary(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { accountId, period = 'month' } = req.query;

      const validPeriods = ['day', 'week', 'month', 'year'];
      if (!validPeriods.includes(period as string)) {
        throw new ValidationError(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
      }

      let startDate = new Date();
      if (period === 'day') {
        startDate.setDate(startDate.getDate() - 1);
      } else if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const where: any = {
        earningDate: { [Op.gte]: startDate },
      };

      if (accountId) {
        where.facebookAccountId = accountId;
      }

      const summary = await Earning.findAll({
        where,
        include: [
          {
            model: FacebookAccount,
            where: { userId },
            attributes: [],
          },
        ],
        attributes: [
          'earningType',
          'currency',
          [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
          [sequelize.fn('COUNT', sequelize.col('Earning.id')), 'count'],
        ],
        group: ['earningType', 'currency'],
        raw: true,
      });

      const totalEarnings = await Earning.sum('amount', {
        where,
        include: [
          {
            model: FacebookAccount,
            where: { userId },
            attributes: [],
          },
        ],
      });

      res.json({
        success: true,
        data: {
          summary,
          total: totalEarnings || 0,
          period,
        },
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
          error: 'Failed to retrieve earnings summary',
        });
      }
    }
  }

  static async getEarningsByContent(req: AuthRequest, res: Response) {
    try {
      const { contentId } = req.params;
      const userId = req.user!.id;

      const earnings = await Earning.findAll({
        where: { contentId },
        include: [
          {
            model: FacebookAccount,
            where: { userId },
          },
          {
            model: Content,
          },
        ],
        order: [['earningDate', 'DESC']],
      });

      res.json({
        success: true,
        data: earnings,
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
          error: 'Failed to retrieve earnings by content',
        });
      }
    }
  }

  static async createEarning(req: AuthRequest, res: Response) {
    try {
      const {
        facebookAccountId,
        contentId,
        amount,
        currency,
        earningType,
        earningDate,
        transactionId,
      } = req.body;
      const userId = req.user!.id;

      if (!facebookAccountId || !amount || !earningType) {
        throw new ValidationError('Missing required fields: facebookAccountId, amount, earningType');
      }

      if (typeof amount !== 'number' || amount < 0) {
        throw new ValidationError('Amount must be a positive number');
      }

      const account = await FacebookAccount.findOne({
        where: { id: facebookAccountId, userId },
      });

      if (!account) {
        throw new NotFoundError('Account not found');
      }

      try {
        const earning = await Earning.create({
          facebookAccountId,
          contentId,
          amount,
          currency: currency || 'USD',
          earningType,
          earningDate: earningDate || new Date(),
          transactionId,
          status: 'completed',
        });

        res.status(201).json({
          success: true,
          data: earning,
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
          error: 'Failed to create earning',
        });
      }
    }
  }
}
