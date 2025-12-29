import jwt from 'jsonwebtoken';
import { User } from '../models';

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
    const existingUser = await User.findOne({ where: { email: data.email } });
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    const user = await User.create(data);
    const token = this.generateToken(user.id);

    return { user, token };
  }

  static async login(email: string, password: string) {
    const user = await User.findOne({ where: { email } });

    if (!user || !user.password) {
      throw new Error('Invalid credentials');
    }

    const isValid = await user.comparePassword(password);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    user.lastLogin = new Date();
    await user.save();

    const token = this.generateToken(user.id);

    return { user, token };
  }

  static async updatePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await User.findByPk(userId);

    if (!user || !user.password) {
      throw new Error('User not found');
    }

    const isValid = await user.comparePassword(oldPassword);

    if (!isValid) {
      throw new Error('Invalid current password');
    }

    user.password = newPassword;
    await user.save();

    return user;
  }
}
