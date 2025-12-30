import { User } from '@/models/User';

interface WelcomeEmailData {
  fullName: string;
  email: string;
  mailboxNumber: string;
  airFreightAddress: any;
  oceanFreightAddress: any;
}

export function generateWelcomeEmailContent(data: WelcomeEmailData) {
  const { fullName, email, mailboxNumber, airFreightAddress, oceanFreightAddress } = data;

  const emailSubject = `Welcome to Clean J Shipping - Your Account is Ready!`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Clean J Shipping</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #E67919;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #1A366D;
          margin-bottom: 5px;
        }
        .tagline {
          color: #666;
          font-size: 14px;
        }
        .welcome {
          font-size: 28px;
          color: #1A366D;
          text-align: center;
          margin-bottom: 20px;
        }
        .mailbox-number {
          background: linear-gradient(135deg, #E67919, #FF8C00);
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          margin: 20px 0;
        }
        .address-section {
          margin: 30px 0;
          padding: 20px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          background-color: #f8f9fa;
        }
        .address-title {
          font-size: 18px;
          font-weight: bold;
          color: #1A366D;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .address-icon {
          width: 24px;
          height: 24px;
          background: #E67919;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
        }
        .address-content {
          background: white;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #E67919;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.8;
        }
        .instructions {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #1A366D, #2B508C);
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
          color: #666;
          font-size: 12px;
        }
        .highlight {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          padding: 10px;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">✈️ Clean J Shipping</div>
          <div class="tagline">Logistics & Delivery Excellence</div>
        </div>

        <h1 class="welcome">Welcome, ${fullName}! 🎉</h1>
        
        <p>Thank you for choosing Clean J Shipping for your logistics needs. Your account has been successfully created and you're ready to start shipping!</p>

        <div class="mailbox-number">
          📦 Your Mailbox Number: ${mailboxNumber}
        </div>

        <div class="highlight">
          <strong>Important:</strong> Please save your mailbox number (${mailboxNumber}) as you'll need it for all shipping transactions.
        </div>

        <div class="address-section">
          <div class="address-title">
            <div class="address-icon">✈️</div>
            AIR FREIGHT ADDRESS (Fast Delivery)
          </div>
          <div class="address-content">
            ${airFreightAddress.fullName} - MB: ${airFreightAddress.mailboxNumber}<br>
            ${airFreightAddress.company}<br>
            ${airFreightAddress.street}<br>
            ${airFreightAddress.city}, ${airFreightAddress.state} ${airFreightAddress.zipCode}<br>
            ${airFreightAddress.country}
          </div>
          <p style="margin-top: 10px; font-size: 14px; color: #666;">
            <strong>Delivery Time:</strong> 3-7 business days<br>
            <strong>Best for:</strong> Urgent documents, small packages, time-sensitive items
          </p>
        </div>

        <div class="address-section">
          <div class="address-title">
            <div class="address-icon">🚢</div>
            OCEAN FREIGHT ADDRESS (Economical)
          </div>
          <div class="address-content">
            ${oceanFreightAddress.fullName} - MB: ${oceanFreightAddress.mailboxNumber}<br>
            ${oceanFreightAddress.company}<br>
            ${oceanFreightAddress.street}<br>
            ${oceanFreightAddress.city}, ${oceanFreightAddress.state} ${oceanFreightAddress.zipCode}<br>
            ${oceanFreightAddress.country}
          </div>
          <p style="margin-top: 10px; font-size: 14px; color: #666;">
            <strong>Delivery Time:</strong> 2-4 weeks<br>
            <strong>Best for:</strong> Large items, bulk shipments, cost-effective shipping
          </p>
        </div>

        <div class="instructions">
          <h3 style="margin-top: 0; color: #1A366D;">📋 How to Use Your Addresses:</h3>
          <ol style="margin: 10px 0; padding-left: 20px;">
            <li>When shopping online, use either address as your shipping destination</li>
            <li>Include your full name and mailbox number (${mailboxNumber}) in the address field</li>
            <li>Choose Air Freight for fast delivery (higher cost)</li>
            <li>Choose Ocean Freight for economical shipping (lower cost)</li>
            <li>Track your packages through our customer dashboard</li>
          </ol>
        </div>

        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" class="cta-button">
            🚀 Login to Your Dashboard
          </a>
        </div>

        <div class="instructions">
          <h3 style="margin-top: 0; color: #1A366D;">🔐 Your Login Credentials:</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> [The password you created during registration]</p>
          <p style="margin-top: 10px;"><em>For security reasons, never share your password with anyone.</em></p>
        </div>

        <div class="footer">
          <p><strong>Clean J Shipping</strong></p>
          <p>📞 1-876-XXX-XXXX | 📧 support@cleanjshipping.com</p>
          <p>🌐 www.cleanjshipping.com</p>
          <p style="margin-top: 15px;">
            This email was sent to ${email} because you created an account with Clean J Shipping.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    subject: emailSubject,
    html: emailHtml,
    text: `
Welcome to Clean J Shipping, ${fullName}!

Thank you for creating an account with us. Your account is now ready to use.

Your Mailbox Number: ${mailboxNumber}

AIR FREIGHT ADDRESS (Fast Delivery):
${airFreightAddress.fullName} - MB: ${airFreightAddress.mailboxNumber}
${airFreightAddress.company}
${airFreightAddress.street}
${airFreightAddress.city}, ${airFreightAddress.state} ${airFreightAddress.zipCode}
${airFreightAddress.country}

OCEAN FREIGHT ADDRESS (Economical):
${oceanFreightAddress.fullName} - MB: ${oceanFreightAddress.mailboxNumber}
${oceanFreightAddress.company}
${oceanFreightAddress.street}
${oceanFreightAddress.city}, ${oceanFreightAddress.state} ${oceanFreightAddress.zipCode}
${oceanFreightAddress.country}

Login to your dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/login

Thank you for choosing Clean J Shipping!
    `
  };
}

export async function sendWelcomeEmail(userData: WelcomeEmailData) {
  try {
    const { subject, html, text } = generateWelcomeEmailContent(userData);
    
    // This would integrate with your email service (SendGrid, Nodemailer, etc.)
    // For now, we'll log the email content
    console.log('=== WELCOME EMAIL ===');
    console.log('To:', userData.email);
    console.log('Subject:', subject);
    console.log('Mailbox Number:', userData.mailboxNumber);
    console.log('===================');
    
    // TODO: Implement actual email sending
    // Example with nodemailer:
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: userData.email,
      subject,
      html,
      text
    });
    */
    
    return { success: true, message: 'Welcome email sent successfully' };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: 'Failed to send welcome email' };
  }
}
