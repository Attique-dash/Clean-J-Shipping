import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { emailService } from "@/lib/email-service";

export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json();
    const { email, password, firstName, lastName } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ 
        error: "User already exists", 
        userCode: existing.userCode,
        role: existing.role 
      }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      userCode: `A${Date.now()}`,
      firstName: firstName || "Admin",
      lastName: lastName || "User",
      email: email.toLowerCase(),
      passwordHash,
      role: "admin",
      accountStatus: "active",
      emailVerified: true,
      registrationStep: 4,
    });

    // Send welcome email to new admin
    try {
      console.log('📧 Preparing to send admin welcome email...');
      const adminName = `${firstName} ${lastName}`.trim();
      console.log('👤 Admin details:', { adminName, email, userCode: user.userCode, hasPassword: !!password });
        
      const emailSent = await emailService.sendStaffWelcomeEmail({
        to: email,
        staffName: adminName,
        userCode: user.userCode,
        password,
        branch: 'System Administration',
        email: email,
      });
      
      console.log('📧 Email service result:', emailSent);
      
      if (!emailSent) {
        console.error("❌ Failed to send admin welcome email to:", email);
        // Continue with response even if email fails
      } else {
        console.log("✅ Admin welcome email sent successfully to:", email);
      }
    } catch (emailError: any) {
      console.error("❌ Error sending admin welcome email:", {
        message: emailError.message,
        stack: emailError.stack,
        code: emailError.code
      });
      // Continue with response even if email fails
    }

    return NextResponse.json({ 
      message: "Admin created successfully. Welcome email sent.", 
      email: user.email,
      userCode: user.userCode,
      role: user.role,
      instructions: {
        login: "/login",
        credentials: { email, password }
      }
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
  }
}
