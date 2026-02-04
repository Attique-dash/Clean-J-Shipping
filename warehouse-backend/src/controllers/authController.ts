import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { successResponse, errorResponse } from '../utils/helpers';
import { config } from '../config/env';
import { logger } from '../utils/logger';

interface AuthRequest {
  body: {
    email: string;
    password: string;
  };
}

// Warehouse Staff Login
export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      role: { $in: ['admin', 'warehouse'] },
      accountStatus: 'active'
    }).select('+passwordHash');

    if (!user) {
      errorResponse(res, 'Invalid credentials', 401);
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      errorResponse(res, 'Invalid credentials', 401);
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        userCode: user.userCode
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info(`Warehouse staff login: ${user.email} (${user.role})`);

    successResponse(res, {
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        userCode: user.userCode,
        firstName: user.firstName,
        lastName: user.lastName
      }
    }, 'Login successful');

  } catch (error) {
    logger.error('Login error:', error);
    errorResponse(res, 'Login failed');
  }
};

// Customer Login
export const customerLogin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find customer and include password
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      role: 'customer',
      accountStatus: 'active'
    }).select('+passwordHash');

    if (!user) {
      errorResponse(res, 'Invalid credentials', 401);
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      errorResponse(res, 'Invalid credentials', 401);
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        userCode: user.userCode
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info(`Customer login: ${user.email} (${user.userCode})`);

    successResponse(res, {
      token,
      user: {
        id: user._id,
        email: user.email,
        userCode: user.userCode,
        firstName: user.firstName,
        lastName: user.lastName
      }
    }, 'Login successful');

  } catch (error) {
    logger.error('Customer login error:', error);
    errorResponse(res, 'Login failed');
  }
};
