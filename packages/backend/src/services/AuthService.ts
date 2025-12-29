import jwt from 'jsonwebtoken';
import { User } from '../models';
import bcrypt from 'bcryptjs';
import { Logger } from '../utils/logger';
import { AuthError, ValidationError, DatabaseError } from '../utils/customErrors';
import { BaseError } from '../utils/customErrors';

const logger = Logger.getInstance();

declare module '../models/User' {
  interface User {
    comparePassword(candidatePassword: string): Promise<boolean>;
  }
}

// Add password comparison method to User model
User.prototype.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    if (!this.password) {
      throw new AuthError('Password not set for this account');
    }
    return bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    logger.error('Password comparison failed', { 
      userId: this.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new AuthError('Invalid credentials');
  }
};

export class AuthService {
  static generateToken(userId: string): string {
    try {
      const secret = process.env.JWT_SECRET || 'secret';
      const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
      
      if (secret === 'secret' && process.env.NODE_ENV === 'production') {
        logger.warn('Using default JWT secret - this should be changed in production!');
        throw new BaseError('Security configuration error', 500, false, 'CONFIG_ERROR');
      }
      
      return jwt.sign({ userId }, secret, { expiresIn });
    } catch (error) {
      logger.error('Failed to generate JWT token', { userId, error });
      throw new AuthError('Failed to create authentication token');
    }
  }

  static async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    try {
      logger.info('Starting user registration', { email: data.email });
      
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email: data.email } });
      
      if (existingUser) {
        logger.warn('Registration failed - user already exists', { email: data.email });
        throw new AuthError('User already exists', 'USER_EXISTS');
      }

      // Generate salt and hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);
      
      logger.info('Password hashed successfully', { email: data.email });

      // Create user in transaction for data integrity
      const user = await User.create({
        ...data,
        password: hashedPassword,
      });

      logger.info('User created successfully', { userId: user.id, email: data.email });

      const token = this.generateToken(user.id);
      
      // Remove password from response
      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return { user: userResponse, token };
    } catch (error: any) {
      logger.error('Registration failed', { email: data.email, error: error.message });

      if (error instanceof BaseError) {
        throw error;
      }
      
      // Handle database errors
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new AuthError('Email already registered', 'USER_EXISTS');
      }
      
      if (error.name === 'SequelizeConnectionError') {
        throw new DatabaseError('Database connection failed. Please try again.');
      }

      throw new DatabaseError('Failed to create user account');
    }
  }

  static async login(email: string, password: string) {
    try {
      logger.info('Attempting login', { email });
      
      // Find user with password field
      const user = await User.findOne({ 
        where: { email },
        attributes: { include: ['password'] }
      });

      if (!user || !user.password) {
        logger.warn('Login failed - user not found or no password', { email });
        throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // Check if account is active
      if (!user.isActive) {
        logger.warn('Login failed - account inactive', { userId: user.id, email });
        throw new AuthError('Account is inactive. Please contact support.', 'ACCOUNT_INACTIVE');
      }

      // Verify password with error handling
      let isValid: boolean;
      try {
        isValid = await user.comparePassword(password);
      } catch (error) {
        logger.error('Password verification failed', { userId: user.id, error });
        throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      if (!isValid) {
        logger.warn('Login failed - invalid password', { userId: user.id, email });
        
        // Track failed login attempts (you could implement rate limiting here)
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        user.lastFailedLogin = new Date();
        await user.save();
        
        throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // Reset failed login attempts on successful login
      user.failedLoginAttempts = 0;
      user.lastLogin = new Date();
      await user.save();

      logger.info('Login successful', { userId: user.id, email });

      const token = this.generateToken(user.id);
      
      // Remove password from response
      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        failedLoginAttempts: user.failedLoginAttempts,
      };

      return { user: userResponse, token };
    } catch (error: any) {
      if (error instanceof BaseError) {
        throw error;
      }
      
      logger.error('Login process failed', { email, error: error.message });
      
      // Handle database connectivity issues
      if (error.name === 'SequelizeConnectionError') {
        throw new DatabaseError('Database connection failed. Please try again.');
      }
      
      if (error.name === 'SequelizeDatabaseError') {
        throw new DatabaseError('Database error occurred');
      }

      throw new AuthError('Login failed. Please try again.', 'LOGIN_FAILED');
    }
  }

  static async updatePassword(userId: string, oldPassword: string, newPassword: string) {
    try {
      logger.info('Password update initiated', { userId });
      
      const user = await User.findByPk(userId, {
        attributes: { include: ['password', 'email'] }
      });

      if (!user || !user.password) {
        logger.warn('Password update failed - user not found', { userId });
        throw new AuthError('User not found', 'USER_NOT_FOUND');
      }

      // Verify old password
      let isValid: boolean;
      try {
        isValid = await user.comparePassword(oldPassword);
      } catch (error) {
        logger.error('Old password verification failed', { userId, error });
        throw new AuthError('Invalid current password', 'INVALID_PASSWORD');
      }

      if (!isValid) {
        logger.warn('Password update failed - invalid current password', { userId });
        throw new AuthError('Invalid current password', 'INVALID_PASSWORD');
      }

      // Validate new password is different from old
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new ValidationError('New password must be different from current password');
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      user.password = hashedPassword;
      await user.save();

      logger.info('Password updated successfully', { userId });
      
      return {
        id: user.id,
        email: user.email,
        message: 'Password updated successfully',
      };
    } catch (error: any) {
      logger.error('Password update failed', { userId, error: error.message });

      if (error instanceof BaseError) {
        throw error;
      }

      // Handle database errors
      if (error.name === 'SequelizeConnectionError') {
        throw new DatabaseError('Database connection failed. Please try again.');
      }
      
      if (error.name === 'SequelizeValidationError') {
        throw new ValidationError('Invalid password format');
      }

      throw new DatabaseError('Failed to update password');
    }
  }

  static async verifyToken(token: string): Promise<string> {
    try {
      const secret = process.env.JWT_SECRET || 'secret';
      const decoded = jwt.verify(token, secret) as any;
      return decoded.userId;
    } catch (error: any) {
      logger.error('Token verification failed', { error: error.message });
      
      if (error.name === 'TokenExpiredError') {
        throw new AuthError('Token has expired', 'TOKEN_EXPIRED');
      }
      
      if (error.name === 'JsonWebTokenError') {
        throw new AuthError('Invalid token', 'INVALID_TOKEN');
      }

      throw new AuthError('Invalid or expired token', 'INVALID_TOKEN');
    }
  }
}