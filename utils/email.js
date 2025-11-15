import nodemailer from 'nodemailer';

// Create transporter with Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // cleanjshipping@gmail.com
      pass: process.env.EMAIL_PASS  // App password
    }
  });
};

// Generic email sender
async function sendEmail({ to, subject, html, attachments = [] }) {
  try {
    const transporter = createTransporter();
    
    const info = await transporter.sendMail({
      from: `"Clean J Shipping" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(to) ? to : [to],
      subject: subject || 'Notification from Clean J Shipping',
      html: html || '',
      attachments
    });
    
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}

// Shipment Created Email
async function sendShipmentCreatedEmail(shipment) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .tracking-box { 
          background: white; 
          border: 2px solid #007bff; 
          padding: 15px; 
          margin: 20px 0; 
          text-align: center; 
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .tracking-number { 
          font-size: 24px; 
          font-weight: bold; 
          color: #007bff; 
          letter-spacing: 1px;
          margin: 10px 0;
        }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #007bff; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 10px 0; 
          font-weight: bold;
          transition: background-color 0.3s;
        }
        .button:hover {
          background: #0056b3;
        }
        .footer { 
          text-align: center; 
          padding: 20px; 
          font-size: 12px; 
          color: #666; 
          border-top: 1px solid #eee;
          margin-top: 20px;
        }
        ul {
          padding-left: 20px;
        }
        li {
          margin-bottom: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">🚚 Shipment Created Successfully!</h1>
        </div>
        <div class="content">
          <p>Dear ${shipment.receiver?.name || 'Valued Customer'},</p>
          <p>Your shipment has been created and will be processed shortly.</p>
          
          <div class="tracking-box">
            <p style="margin: 0 0 10px 0; font-size: 16px;">Your Tracking Number:</p>
            <div class="tracking-number">${shipment.trackingNumber}</div>
            <p style="margin: 10px 0 0 0; color: #666;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/track/${shipment.trackingNumber}" style="color: #007bff; text-decoration: none;">
                Track Your Shipment Online
              </a>
            </p>
          </div>
          
          <p><strong>Shipment Details:</strong></p>
          <ul>
            <li><strong>From:</strong> ${shipment.sender?.name || 'N/A'}, ${shipment.sender?.address || 'N/A'}</li>
            <li><strong>To:</strong> ${shipment.receiver?.name || 'N/A'}, ${shipment.receiver?.address || 'N/A'}</li>
            <li><strong>Weight:</strong> ${shipment.weight || 0}kg</li>
            <li><strong>Estimated Delivery:</strong> ${shipment.estimatedDeliveryDate ? new Date(shipment.estimatedDeliveryDate).toLocaleDateString() : 'N/A'}</li>
          </ul>
          
          <p style="text-align: center; margin-top: 25px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/track/${shipment.trackingNumber}" class="button">
              Track Your Shipment
            </a>
          </p>
          
          <p>You'll receive updates as your shipment progresses. If you have any questions, please contact our support team.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Clean J Shipping | Kingston, Jamaica</p>
          <p>Questions? Email us at <a href="mailto:info@cleanjshipping.com" style="color: #007bff; text-decoration: none;">info@cleanjshipping.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: shipment.receiver?.email || shipment.sender?.email,
    subject: `Shipment Created - ${shipment.trackingNumber}`,
    html
  });
}

// Status Update Email
async function sendStatusUpdateEmail(shipment) {
  const statusMessages = {
    pending: 'Your shipment has been created and is awaiting processing',
    picked_up: 'Your package has been picked up by our courier',
    at_warehouse: 'Your package has arrived at our sorting facility',
    in_transit: 'Your package is on its way to the destination',
    out_for_delivery: 'Your package is out for delivery today!',
    delivered: 'Your package has been successfully delivered!',
    failed_delivery: 'Delivery attempt was unsuccessful',
    returned: 'Your package is being returned to the sender',
    cancelled: 'Your shipment has been cancelled'
  };
  
  const statusIcons = {
    pending: '⏳',
    picked_up: '📦',
    at_warehouse: '🏭',
    in_transit: '✈️',
    out_for_delivery: '🚚',
    delivered: '✅',
    failed_delivery: '❌',
    returned: '↩️',
    cancelled: '❌'
  };
  
  const currentStatus = shipment.statusHistory[shipment.statusHistory.length - 1];
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .status-header { 
          background: #f8f9fa; 
          padding: 20px; 
          border-radius: 8px; 
          text-align: center;
          margin-bottom: 20px;
          border-left: 5px solid #007bff;
        }
        .status-icon { 
          font-size: 40px; 
          margin-bottom: 10px; 
        }
        .status-title { 
          font-size: 20px; 
          font-weight: bold; 
          margin: 10px 0; 
          color: #2c3e50;
        }
        .tracking-info { 
          background: #f8f9fa; 
          padding: 15px; 
          border-radius: 8px; 
          margin: 20px 0;
        }
        .tracking-number { 
          font-weight: bold; 
          color: #007bff; 
        }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #007bff; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 10px 0; 
          font-weight: bold;
        }
        .footer { 
          margin-top: 30px; 
          padding-top: 20px; 
          border-top: 1px solid #eee; 
          font-size: 12px; 
          color: #666; 
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="status-header">
        <div class="status-icon">${statusIcons[shipment.status] || 'ℹ️'}</div>
        <div class="status-title">Shipment Status Update</div>
        <div>${statusMessages[shipment.status] || 'Your shipment status has been updated'}</div>
      </div>
      
      <div class="tracking-info">
        <p><strong>Tracking Number:</strong> <span class="tracking-number">${shipment.trackingNumber}</span></p>
        <p><strong>Current Status:</strong> ${shipment.status.replace(/_/g, ' ').toUpperCase()}</p>
        ${currentStatus?.location?.address ? `<p><strong>Location:</strong> ${currentStatus.location.address}</p>` : ''}
        ${currentStatus?.timestamp ? `<p><strong>Last Updated:</strong> ${new Date(currentStatus.timestamp).toLocaleString()}</p>` : ''}
      </div>
      
      ${currentStatus?.notes ? `<div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p><strong>Note:</strong> ${currentStatus.notes}</p>
      </div>` : ''}
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/track/${shipment.trackingNumber}" class="button">
          View Full Tracking Details
        </a>
      </div>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} Clean J Shipping | Kingston, Jamaica</p>
        <p>Need help? Contact us at <a href="mailto:support@cleanjshipping.com" style="color: #007bff; text-decoration: none;">support@cleanjshipping.com</a></p>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: shipment.receiver?.email || shipment.sender?.email,
    subject: `Shipment Update: ${shipment.status.replace(/_/g, ' ').toUpperCase()} - ${shipment.trackingNumber}`,
    html
  });
}

// Delivery Confirmation Email
async function sendDeliveryConfirmationEmail(shipment) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          text-align: center; 
          padding: 20px 0;
        }
        .checkmark {
          color: #28a745;
          font-size: 50px;
          margin-bottom: 15px;
        }
        .delivery-details {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        .detail-label {
          font-weight: bold;
          width: 150px;
          color: #555;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #28a745;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 15px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="checkmark">✓</div>
        <h1 style="color: #28a745; margin: 0 0 10px 0;">Package Delivered Successfully!</h1>
        <p style="color: #666; margin: 0;">Your shipment has reached its destination</p>
      </div>
      
      <div class="delivery-details">
        <div class="detail-row">
          <div class="detail-label">Tracking Number:</div>
          <div><strong>${shipment.trackingNumber}</strong></div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Delivered On:</div>
          <div>${new Date(shipment.actualDeliveryDate).toLocaleString()}</div>
        </div>
        ${shipment.deliveryProof?.recipientName ? `
        <div class="detail-row">
          <div class="detail-label">Received By:</div>
          <div>${shipment.deliveryProof.recipientName}</div>
        </div>` : ''}
        ${shipment.deliveryProof?.signature ? `
        <div class="detail-row">
          <div class="detail-label">Signature:</div>
          <div><img src="${shipment.deliveryProof.signature}" alt="Delivery Signature" style="max-width: 200px; max-height: 80px; border: 1px solid #ddd; padding: 5px; background: white;" /></div>
        </div>` : ''}
      </div>
      
      <div style="text-align: center; margin: 25px 0;">
        <p>Thank you for choosing Clean J Shipping for your delivery needs!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/track/${shipment.trackingNumber}" class="button">
          View Delivery Details
        </a>
      </div>
      
      <div style="background: #e9f7ef; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #28a745;">How was your experience?</h3>
        <p>We'd love to hear your feedback to help us improve our services.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/feedback?tracking=${shipment.trackingNumber}" style="color: #28a745; font-weight: bold; text-decoration: none;">
          Share Your Feedback →
        </a>
      </div>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} Clean J Shipping | Kingston, Jamaica</p>
        <p>Questions about your delivery? Contact us at <a href="mailto:support@cleanjshipping.com" style="color: #28a745; text-decoration: none;">support@cleanjshipping.com</a></p>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: shipment.receiver?.email || shipment.sender?.email,
    subject: `✅ Package Delivered - ${shipment.trackingNumber}`,
    html
  });
}

export { 
  sendEmail, 
  sendShipmentCreatedEmail, 
  sendStatusUpdateEmail, 
  sendDeliveryConfirmationEmail 
};
