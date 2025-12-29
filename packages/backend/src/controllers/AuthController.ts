import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { AuthRequest } from '../middleware/auth';
import { ValidationError, AuthError } from '../utils/customErrors';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

export class AuthController {
  static async register(req: Request, res: Response) {
    logger.info('Registration attempt', { email: req.body.email });
    
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        throw new ValidationError('All fields are required', {
          missingFields: ['email', 'password', 'firstName', 'lastName'].filter(field => !req.body[field])
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format');
      }

      // Validate password strength
      if (password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters long');
      }

      const result = await AuthService.register({
        email,
        password,
        firstName,
        lastName,
      });

      logger.info('User registered successfully', { userId: result.user.id, email });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            isActive: result.user.isActive,
            createdAt: result.user.createdAt,
          },
          token: result.token,
        },
      });
    } catch (error: any) {
      logger.error('Registration failed', { 
        email: req.body.email, 
        error: error.message 
      });

      // Handle specific error types
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          details: (error as any).details,
        });
      } else if (error instanceof AuthError) {
        res.status(409).json({
          success: false,
          error: error.message,
          code: error.errorCode,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Registration failed. Please try again.',
        });
      }
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      logger.info('Login attempt', { email });

      const result = await AuthService.login(email, password);

      logger.info('Login successful', { 
        userId: result.user.id, 
        email,
        ip: req.ip 
      });

      res.json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            isActive: result.user.isActive,
            lastLogin: result.user.lastLogin,
          },
          token: result.token,
        },
      });
    } catch (error: any) {
      // Log authentication failures for security monitoring
      logger.warn('Authentication failed', { 
        email: req.body.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: error.message 
      });

      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      } else if (error instanceof AuthError) {
        res.status(401).json({
          success: false,
          error: error.message,
          code: error.errorCode,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Login failed. Please try again.',
        });
      }
    }
  }

  static async getProfile(req: AuthRequest, res: Response) {
    try {
      logger.info('Profile fetch requested', { userId: req.user?.id });

      if (!req.user) {
        throw new AuthError('User not authenticated', 'NOT_AUTHENTICATED');
      }

      res.json({
        success: true,
        data: {
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          isActive: req.user.isActive,
          lastLogin: req.user.lastLogin,
          createdAt: req.user.createdAt,
          updatedAt: req.user.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error('Failed to fetch profile', { 
        userId: req.user?.id,
        error: error.message 
      });

      if (error instanceof AuthError) {
        res.status(401).json({
          success: false,
          error: error.message,
          code: error.errorCode,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch profile',
        });
      }
    }
  }

  static async updatePassword(req: AuthRequest, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user!.id;

      // Validate required fields
      if (!oldPassword || !newPassword) {
        throw new ValidationError('Both old and new passwords are required');
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        throw new ValidationError('New password must be at least 8 characters long');
      }

      logger.info('Password update requested', { userId });

      await AuthService.updatePassword(userId, oldPassword, newPassword);

      logger.info('Password updated successfully', { userId });

      res.json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error: any) {
      logger.error('Password update failed', { 
        userId: req.user?.id,
        error: error.message 
      });

      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      } else if (error instanceof AuthError) {
        res.status(401).json({
          success: false,
          error: error.message,
          code: error.errorCode,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Password update failed. Please try again.',
        });
      }
    }
  }
}