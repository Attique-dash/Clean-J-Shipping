import { Router } from 'express';
import { login, register } from '../controllers/authController';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with the provided details. The user will be registered with 'pending' status and will need email verification.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Register'
 *           example:
 *             firstName: "John"
 *             lastName: "Doe"
 *             email: "john.doe@example.com"
 *             password: "SecurePassword123!"
 *             phone: "+1234567890"
 *             role: "customer"
 *             branch: "Down Town"
 *             address:
 *               street: "123 Main St"
 *               city: "New York"
 *               state: "NY"
 *               zipCode: "10001"
 *               country: "USA"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "User registered successfully. Please check your email for verification."
 *               data:
 *                 userCode: "CS-001"
 *                 email: "john.doe@example.com"
 *                 accountStatus: "pending"
 *                 role:
 *                   type: string
 *                   enum: [customer, warehouse]
 *                   example: customer
 *       400:
 *         description: Bad request - Invalid input data
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Email already exists"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Password must be at least 8 characters long"
 */
// Register User
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user (all roles)
 *     description: Authenticates all user types (admin, warehouse staff, customers) and returns a JWT token for accessing protected endpoints.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Login'
 *           example:
 *             email: "user@example.com"
 *             password: "Password123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "Login successful"
 *               data:
 *                 token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   id: "64a1b2c3d4e5f6789012345"
 *                   email: "user@example.com"
 *                   role: "customer"
 *                   userCode: "CLEAN-0001"
 *                   accountStatus: "active"
 *                 expiresIn: "24h"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Invalid email or password"
 *       403:
 *         description: Account not active
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Account is not active. Please contact administrator."
 */
// Universal Login - Handles all user roles
router.post('/login', login);


export default router;
