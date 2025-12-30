import { sendEmail } from './email';

interface PasswordResetEmailData {
  email: string;
  fullName: string;
  resetToken: string;
}

export async function sendPasswordResetEmail({ email, fullName, resetToken }: PasswordResetEmailData) {
  try {
    const resetUrl = `${process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'}/forgot-password?token=${resetToken}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Clean J Shipping</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #E67919;
          }
          .logo {
            color: #0E7893;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .title {
            color: #333;
            font-size: 28px;
            font-weight: bold;
            margin: 20px 0;
          }
          .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #E67919, #f58a2e);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
            transition: transform 0.2s;
          }
          .reset-button:hover {
            transform: translateY(-2px);
          }
          .security-info {
            background: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #0E7893;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Clean J Shipping</div>
            <h1>Password Reset Request</h1>
          </div>
          
          <p>Hi ${fullName},</p>
          
          <p>We received a request to reset your password for your Clean J Shipping account. Click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="reset-button">Reset My Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #0E7893;">${resetUrl}</p>
          
          <div class="security-info">
            <strong>Security Notice:</strong>
            <ul>
              <li>This link will expire in 1 hour for security reasons</li>
              <li>If you didn't request this password reset, please ignore this email</li>
              <li>Your password will remain unchanged if you don't click the link</li>
            </ul>
          </div>
          
          <p>If you have any questions or concerns, please contact our support team.</p>
          
          <div class="footer">
            <p>Clean J Shipping - Logistics & Delivery Solutions</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: email,
      subject: 'Reset Your Password - Clean J Shipping',
      html: htmlContent,
      from: process.env.FROM_EMAIL || 'noreply@cleanjshipping.com'
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send password reset email' 
    };
  }
}
