import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
  const EMAIL_USER = process.env.EMAIL_USER || process.env.SMTP_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
  const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);

  const results: any = {
    timestamp: new Date().toISOString(),
    config: {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      user: EMAIL_USER ? EMAIL_USER.substring(0, 5) + '***@' + EMAIL_USER.split('@')[1] : 'Not set',
      passSet: EMAIL_PASS ? '✓ Set (length: ' + EMAIL_PASS.length + ')' : '✗ Missing',
    },
    envCheck: {
      EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
      SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Not set',
      EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set',
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'Set' : 'Not set',
      SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Not set',
      SMTP_HOST: process.env.SMTP_HOST || 'Using default (smtp.gmail.com)',
      SMTP_PORT: process.env.SMTP_PORT || 'Using default (587)',
    },
    tests: {}
  };

  if (!EMAIL_USER || !EMAIL_PASS) {
    results.tests.config = 'FAILED - Missing email credentials';
    results.message = 'Please set SMTP_USER and SMTP_PASS in your .env.local file';
    return NextResponse.json(results, { status: 400 });
  }

  // Test transporter creation
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
    results.tests.transporter = 'OK - Created successfully';
  } catch (error: any) {
    results.tests.transporter = `FAILED - ${error.message}`;
    return NextResponse.json(results, { status: 500 });
  }

  // Test connection
  try {
    await transporter.verify();
    results.tests.connection = 'OK - SMTP connection verified';
  } catch (error: any) {
    results.tests.connection = `FAILED - ${error.message}`;
    results.help = {
      commonIssues: [
        'For Gmail: Use an "App Password" not your regular password',
        'Enable 2-Step Verification in Google Account first',
        'Generate App Password at: Google Account → Security → 2-Step Verification → App passwords',
        'The App Password is 16 characters with spaces (keep the spaces)'
      ]
    };
    return NextResponse.json(results, { status: 500 });
  }

  // Try to send a test email
  try {
    const info = await transporter.sendMail({
      from: EMAIL_USER,
      to: EMAIL_USER, // Send to self
      subject: '✅ Test Email from Clean J Shipping - ' + new Date().toLocaleTimeString(),
      text: 'This is a test email to verify the email configuration is working correctly.\n\nIf you received this, the email system is properly configured!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0f4d8a;">✅ Email Configuration Test</h2>
          <p>This is a test email from <strong>Clean J Shipping</strong>.</p>
          <p>If you received this email, your email configuration is working correctly!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            <strong>Test Time:</strong> ${new Date().toLocaleString()}<br>
            <strong>SMTP Host:</strong> ${SMTP_HOST}<br>
            <strong>SMTP Port:</strong> ${SMTP_PORT}
          </p>
        </div>
      `
    });

    results.tests.send = 'OK - Test email sent successfully';
    results.messageId = info.messageId;
    results.preview = 'Check your inbox (and spam folder) for the test email';
  } catch (error: any) {
    results.tests.send = `FAILED - ${error.message}`;
    results.error = error.message;
    return NextResponse.json(results, { status: 500 });
  }

  return NextResponse.json(results);
}
