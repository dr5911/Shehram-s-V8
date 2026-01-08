import jwt from 'jsonwebtoken';
import { User } from '../models';
import { ValidationError, AuthenticationError, NotFoundError, ConflictError } from '../errors';
import { handleSequelizeError } from '../utils/errorHelpers';

export class AuthService {
  static generateToken(userId: string): string {
    const secret = process.env.JWT_SECRET || 'secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    
    return jwt.sign({ userId }, secret, { expiresIn });
  }

  static async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    if (!data.email || !data.password || !data.firstName || !data.lastName) {
      throw new ValidationError('All fields are required');
    }

    if (!this.isValidEmail(data.email)) {
      throw new ValidationError('Invalid email format');
    }

    if (data.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    try {
      const existingUser = await User.findOne({ where: { email: data.email } });
      
      if (existingUser) {
        throw new ConflictError('User with this email already exists', { field: 'email' });
      }

      const user = await User.create(data);
      const token = this.generateToken(user.id);

      return { user, token };
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }
      handleSequelizeError(error);
    }
  }

  static async login(email: string, password: string) {
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    if (!this.isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      if (!user.password) {
        throw new AuthenticationError('Account uses OAuth. Please login with Facebook.');
      }

      const isValid = await user.comparePassword(password);

      if (!isValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      if (!user.isActive) {
        throw new AuthenticationError('Account is inactive. Please contact support.');
      }

      try {
        user.lastLogin = new Date();
        await user.save();
      } catch (error: any) {
        console.error(`Failed to update user last login: ${user.id}`, error.message);
      }

      console.log(`User login successful: ${user.id} (${user.email})`);

      const token = this.generateToken(user.id);

      return { user, token };
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        console.log(`Failed login attempt for email: ${email}`, {
          reason: error.message,
        });
        throw error;
      }
      handleSequelizeError(error);
    }
  }

  static async updatePassword(userId: string, oldPassword: string, newPassword: string) {
    if (!oldPassword || !newPassword) {
      throw new ValidationError('Current password and new password are required');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long');
    }

    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!user.password) {
        throw new ValidationError('Account uses OAuth. Cannot update password.');
      }

      const isValid = await user.comparePassword(oldPassword);

      if (!isValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      user.password = newPassword;
      await user.save();

      console.log(`Password updated for user: ${userId}`);

      return user;
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof AuthenticationError || error instanceof NotFoundError) {
        throw error;
      }
      handleSequelizeError(error);
    }
  }

  static verifyToken(token: string): { userId: string } {
    const secret = process.env.JWT_SECRET || 'secret';
    
    try {
      const decoded = jwt.verify(token, secret) as { userId: string };
      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid token');
      }
      throw new AuthenticationError('Authentication failed');
    }
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
