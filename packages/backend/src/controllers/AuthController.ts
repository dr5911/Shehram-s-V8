import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../errors';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName } = req.body;

      const result = await AuthService.register({
        email,
        password,
        firstName,
        lastName,
      });

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          token: result.token,
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
          error: 'An unexpected error occurred during registration',
        });
      }
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const result = await AuthService.login(email, password);

      res.json({
        success: true,
        data: {
          user: result.user,
          token: result.token,
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
          error: 'An unexpected error occurred during login',
        });
      }
    }
  }

  static async getProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      res.json({
        success: true,
        data: req.user,
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
          error: 'An unexpected error occurred while fetching profile',
        });
      }
    }
  }

  static async updatePassword(req: AuthRequest, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user!.id;

      await AuthService.updatePassword(userId, oldPassword, newPassword);

      res.json({
        success: true,
        message: 'Password updated successfully',
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
          error: 'An unexpected error occurred while updating password',
        });
      }
    }
  }
}
