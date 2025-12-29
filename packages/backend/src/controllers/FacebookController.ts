import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { FacebookService } from '../services/FacebookService';
import { FacebookAccount } from '../models';

export class FacebookController {
  static async connectAccount(req: AuthRequest, res: Response) {
    try {
      const { code, redirectUri } = req.body;
      const userId = req.user!.id;

      const tokenData = await FacebookService.exchangeCodeForToken(code, redirectUri);
      const profile = await FacebookService.getUserProfile(tokenData.access_token);

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
      res.status(400).json({
        success: false,
        error: error.message,
      });
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
      res.status(400).json({
        success: false,
        error: error.message,
      });
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
        return res.status(404).json({
          success: false,
          error: 'Account not found',
        });
      }

      const result = await FacebookService.syncAccountData(accountId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
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
        return res.status(404).json({
          success: false,
          error: 'Account not found or not configured',
        });
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
      res.status(400).json({
        success: false,
        error: error.message,
      });
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
        return res.status(404).json({
          success: false,
          error: 'Account not found',
        });
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
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
