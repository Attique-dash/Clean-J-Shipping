import { NextResponse } from "next/server";
import { emailService } from "@/lib/email-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, message } = body;

    if (!to || !subject || !message) {
      return NextResponse.json({ 
        error: "Missing required fields: to, subject, message" 
      }, { status: 400 });
    }

    console.log('🧪 Testing email service...');
    console.log('Environment check:', {
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? "***SET***" : "NOT SET",
      EMAIL_FROM: process.env.EMAIL_FROM
    });

    const result = await emailService.sendEmail({
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>📧 Email Test</h2>
          <p>This is a test email from Clean J Shipping.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
            <strong>Message:</strong> ${message}
          </div>
          <p>Test sent at: ${new Date().toLocaleString()}</p>
        </div>
      `,
      text: `Email Test\n\n${message}\n\nSent at: ${new Date().toLocaleString()}`
    });

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: "Test email sent successfully" 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: "Failed to send test email" 
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('❌ Email test error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
