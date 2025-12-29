import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { FacebookService } from '../services/FacebookService';
import { FacebookAccount } from '../models';
import { AppError, NotFoundError } from '../errors';
import { handleSequelizeError } from '../utils/errorHelpers';

export class FacebookController {
  static async connectAccount(req: AuthRequest, res: Response) {
    try {
      const { code, redirectUri } = req.body;
      const userId = req.user!.id;

      const tokenData = await FacebookService.exchangeCodeForToken(code, redirectUri);
      const profile = await FacebookService.getUserProfile(tokenData.access_token);

      try {
        const [account] = await FacebookAccount.findOrCreate({
          where: {
            userId,
            facebookId: profile.id,
          },
          defaults: {
            name: profile.name,
            accessToken: tokenData.access_token,
            tokenExpiry: new Date(Date.now() + tokenData.expires_in * 1000),
          },
        });

        res.json({
          success: true,
          data: account,
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
          error: 'Failed to connect Facebook account',
        });
      }
    }
  }

  static async getAccounts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const accounts = await FacebookAccount.findAll({
        where: { userId },
      });

      res.json({
        success: true,
        data: accounts,
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
          error: 'Failed to retrieve Facebook accounts',
        });
      }
    }
  }

  static async syncAccount(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;
      const userId = req.user!.id;

      const account = await FacebookAccount.findOne({
        where: { id: accountId, userId },
      });

      if (!account) {
        throw new NotFoundError('Account not found');
      }

      const result = await FacebookService.syncAccountData(accountId);

      res.json({
        success: true,
        data: result,
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
          error: 'Failed to sync account data',
        });
      }
    }
  }

  static async getMonetizationStatus(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;
      const userId = req.user!.id;

      const account = await FacebookAccount.findOne({
        where: { id: accountId, userId },
      });

      if (!account || !account.pageId || !account.pageAccessToken) {
        throw new NotFoundError('Account not found or not configured');
      }

      const status = await FacebookService.getMonetizationStatus(
        account.pageId,
        account.pageAccessToken
      );

      res.json({
        success: true,
        data: status,
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
          error: 'Failed to retrieve monetization status',
        });
      }
    }
  }

  static async updatePageInfo(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;
      const { pageId, pageName } = req.body;
      const userId = req.user!.id;

      const account = await FacebookAccount.findOne({
        where: { id: accountId, userId },
      });

      if (!account) {
        throw new NotFoundError('Account not found');
      }

      const pageAccessToken = await FacebookService.getPageAccessToken(
        account.facebookId,
        account.accessToken,
        pageId
      );

      account.pageId = pageId;
      account.pageName = pageName;
      account.pageAccessToken = pageAccessToken;
      await account.save();

      res.json({
        success: true,
        data: account,
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
          error: 'Failed to update page information',
        });
      }
    }
  }
}
