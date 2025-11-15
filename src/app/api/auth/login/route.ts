import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { IUser } from "@/models/User";
import { comparePassword, signToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { Schema, model, models } from "mongoose";

// Define the User model if it doesn't exist
const User = models.User || model<IUser>('User', new Schema({
  userCode: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "customer", "warehouse"], required: true },
  emailVerified: { type: Boolean, default: false },
  // Add other fields as needed
}));

interface LoginResponse {
  message: string;
  user?: {
    id: string;
    email: string;
    role: string;
    userCode: string;
    firstName?: string;
    lastName?: string;
  };
  error?: {
    message: string;
    details?: Record<string, unknown>;
  };
}

// Type for the request headers
interface RequestHeaders extends Headers {
  get(name: string): string | null;
}

export async function POST(req: NextRequest) {
  try {
    // Parse body and validate first
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { message: "Invalid request body. Please provide valid JSON data." } }, 
        { status: 400 }
      );
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { 
          error: { 
            message: "Validation failed",
            details: parsed.error.flatten()
          } 
        }, 
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = parsed.data;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30d or 7d

    // Determine if connection is secure, but never mark cookie secure on localhost
    const url = new URL(req.url);
    const headers = req.headers as RequestHeaders;
    const forwardedProto = headers.get("x-forwarded-proto") || null;
    const proto = (forwardedProto ? String(forwardedProto) : url.protocol.replace(":", "")).toLowerCase();
    const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const isSecure = !isLocalhost && proto === "https";

    try {
      await dbConnect();
    } catch (error) {
      console.error("Login error:", error);
      return NextResponse.json(
        { 
          error: { 
            message: "An unexpected error occurred during login",
            details: process.env.NODE_ENV === 'development' ? error : undefined
          } 
        },
        { status: 500 }
      );
    }

    // Fast path: allow env-based admin login
    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      const token = signToken({ 
        role: "admin", 
        userCode: "ADMIN",
        email: adminEmail,
        id: "admin"
      });
      
      const response: LoginResponse = {
        message: "Logged in as admin",
        user: { 
          id: "admin", 
          email: adminEmail, 
          role: "admin", 
          userCode: "ADMIN" 
        }
      };

      const res = NextResponse.json(response);
      
      res.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge,
      });

      return res;
    }

    // Otherwise, connect to DB for customer/warehouse users
    try {
      // Find user with password hash
      const user = await User.findOne({ email }).select('+passwordHash');

      if (!user) {
        return NextResponse.json(
          { 
            error: { 
              message: "Invalid email or password",
              details: { email: "No account found with this email" }
            } 
          },
          { status: 401 }
        );
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json(
          { 
            error: { 
              message: "Invalid email or password",
              details: { password: "Incorrect password" }
            } 
          },
          { status: 401 }
        );
      }

      // Prepare user data for token
      const userData = {
        id: user._id?.toString() || '',
        email: user.email,
        role: user.role,
        userCode: user.userCode,
        emailVerified: user.emailVerified || false
      };

      // Generate JWT token
      const token = signToken(userData);

      // Prepare response data
      const response: LoginResponse = {
        message: user.emailVerified 
          ? "Logged in successfully" 
          : "Please verify your email address",
        user: {
          id: userData.id,
          email: user.email,
          role: user.role,
          userCode: user.userCode,
          firstName: user.firstName,
          lastName: user.lastName
        }
      };

      // Create response with cookie
      // Update last login timestamp in the background
      user.lastLogin = new Date();
      user.save().catch(e => console.warn("[login] Failed to update lastLogin", e));
      
      // Create response with cookie
      const responseObj = NextResponse.json(response);
      
      // Set auth cookie
      responseObj.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge,
      });

      return responseObj;
    } catch (error) {
      console.error("Login error:", error);
      return NextResponse.json(
        { 
          error: { 
            message: "An error occurred during login",
            details: process.env.NODE_ENV === 'development' ? error : undefined
          } 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in login route:", error);
    return NextResponse.json(
      { 
        error: { 
          message: "An unexpected error occurred",
          details: process.env.NODE_ENV === 'development' ? error : undefined
        } 
      },
      { status: 500 }
    );
  }
}

