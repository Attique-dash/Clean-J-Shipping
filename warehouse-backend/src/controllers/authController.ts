import { Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../models/User';
import { Warehouse } from '../models/Warehouse';
import { successResponse, errorResponse } from '../utils/helpers';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { generateMailboxCode } from '../utils/mailboxCodeGenerator';
import { EmailService } from '../services/emailService';
import { ShippingAddressService } from '../services/shippingAddressService';

interface AuthRequest {
  body: {
    email: string;
    password: string;
  };
}

interface RegisterRequest {
  body: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
    branch?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
}

// Universal Login - Handles all user roles (admin, warehouse, customer)
export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find any user with the email (all roles) and include password
    const user = await User.findOne({ 
      email: email.toLowerCase()
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
    const signOptions: SignOptions = { expiresIn: config.jwtExpiresIn as any };
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        userCode: user.userCode
      },
      config.jwtSecret,
      signOptions
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User login: ${user.email} (${user.role}) - ${user.userCode}`);

    successResponse(res, {
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        userCode: user.userCode,
        firstName: user.firstName,
        lastName: user.lastName,
        mailboxNumber: user.mailboxNumber
      }
    }, 'Login successful');

  } catch (error) {
    logger.error('Login error:', error);
    errorResponse(res, 'Login failed');
  }
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new customer
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: password123
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *               role:
 *                 type: string
 *                 enum: [admin, customer, warehouse]
 *                 example: customer
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: 123 Main St
 *                   city:
 *                     type: string
 *                     example: New York
 *                   state:
 *                     type: string
 *                     example: NY
 *                   zipCode:
 *                     type: string
 *                     example: 10001
 *                   country:
 *                     type: string
 *                     example: USA
 *     responses:
 *       201:
 *         description: Customer registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Registration successful. Please check your email for verification.
 *                 data:
 *                   type: object
 *                   properties:
 *                     customer:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         userCode:
 *                           type: string
 *                         address:
 *                           type: object
 *       400:
 *         description: Bad request
 *       409:
 *         description: Email already registered
 */
// Customer & Staff Registration (no admin registration)
export const register = async (req: RegisterRequest, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, password, phone, role, branch, address } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      errorResponse(res, 'First name, last name, email, and password are required', 400);
      return;
    }

    // Validate password length
    if (password.length < 8) {
      errorResponse(res, 'Password must be at least 8 characters long', 400);
      return;
    }

    // Restrict roles - no admin registration allowed
    const allowedRoles = ['customer', 'warehouse'];
    const userRole = role || 'customer';
    
    if (!allowedRoles.includes(userRole)) {
      errorResponse(res, 'Invalid role. Only customer and warehouse roles are allowed for registration', 400);
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      errorResponse(res, 'Email already registered', 409);
      return;
    }

    // Generate CLEAN-XXXX code for both userCode and mailboxNumber
    const cleanCode = await generateMailboxCode();

    // Create new user with same code for both userCode and mailboxNumber
    const newUser = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by pre-save hook
      phone,
      role: userRole,
      branch,
      address,
      userCode: cleanCode,
      mailboxNumber: cleanCode, // Same as userCode
      accountStatus: 'active', // Auto-activate users
      emailVerified: true
    });

    // Send welcome email with shipping information
    try {
      // Fetch warehouse addresses
      const warehouse = await Warehouse.findOne({ isActive: true, isDefault: true });
      
      if (warehouse) {
        await EmailService.sendWelcomeWithShippingInfo(
          newUser.email,
          newUser.firstName,
          newUser.lastName,
          newUser.userCode,
          newUser.phone,
          newUser.branch,
          newUser.address,
          cleanCode, // Using cleanCode as courier code for now
          warehouse.airAddress,  // pass warehouse air address
          warehouse.seaAddress,  // pass warehouse sea address
          warehouse.chinaAddress // pass warehouse china address
        );
        logger.info(`Welcome email sent to: ${newUser.email}`);
      } else {
        logger.warn('No default warehouse found, skipping welcome email');
      }
    } catch (emailError) {
      logger.error('Failed to send welcome email:', emailError);
      // Continue with registration even if email fails
    }

    // Create default shipping addresses for the new customer
    try {
      await ShippingAddressService.createDefaultShippingAddresses(newUser._id);
      logger.info(`Default shipping addresses created for: ${newUser.email}`);
    } catch (addressError) {
      logger.error('Failed to create default shipping addresses:', addressError);
      // Continue with registration even if address creation fails
    }

    // Remove password from response
    const userResponse = newUser.getPublicProfile();

    logger.info(`User registered: ${newUser.email} with code: ${cleanCode} (${userRole})`);

    successResponse(res, {
      user: {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        branch: newUser.branch,
        address: newUser.address,
        userCode: newUser.userCode,
        mailboxNumber: newUser.mailboxNumber,
        accountStatus: newUser.accountStatus,
        emailVerified: newUser.emailVerified,
        createdAt: newUser.createdAt
      }
    }, 'Registration successful. Please check your email for verification.', 201);

  } catch (error) {
    logger.error('Registration error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('E11000')) {
        errorResponse(res, 'Email already registered', 409);
        return;
      }
      
      if (error.message.includes('validation') || error.message.includes('Password must be at least')) {
        errorResponse(res, `Validation error: ${error.message}`, 400);
        return;
      }
      
      if (error.message.includes('database') || error.message.includes('connection')) {
        errorResponse(res, 'Database connection error. Please try again later', 503);
        return;
      }
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values((error as any).errors).map((err: any) => err.message).join(', ');
        errorResponse(res, `Validation error: ${validationErrors}`, 400);
        return;
      }
    }
    
    errorResponse(res, 'Registration failed. Please try again later', 500);
  }
};
