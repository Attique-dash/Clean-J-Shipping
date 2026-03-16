import { Router } from 'express';
import { EmailService } from '../../services/emailService';
import { successResponse, errorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';

const router = Router();

// Test email connection
router.post('/test-connection', async (req, res) => {
  try {
    const isConnected = await EmailService.verifyConnection();
    
    if (isConnected) {
      successResponse(res, { connected: true }, 'Email service connection successful');
    } else {
      errorResponse(res, 'Email service connection failed', 500);
    }
  } catch (error) {
    logger.error('Email connection test failed:', error);
    errorResponse(res, 'Email connection test failed', 500);
  }
});

// Test package pre-alert email
router.post('/test-prealert', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      errorResponse(res, 'Email address is required', 400);
      return;
    }

    const testPackageData = {
      trackingNumber: 'TEST' + Date.now(),
      shipper: 'Amazon',
      weight: 2.5,
      airwayBill: 'PAU' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      mailboxNumber: 'P4U669820',
      customerName: 'Test Customer',
      receivedDate: new Date()
    };

    const emailSent = await EmailService.sendPackagePreAlert(email, testPackageData);
    
    if (emailSent) {
      successResponse(res, { 
        emailSent: true, 
        testPackageData,
        message: 'Test pre-alert email sent successfully' 
      });
    } else {
      errorResponse(res, 'Failed to send test pre-alert email', 500);
    }
  } catch (error) {
    logger.error('Test pre-alert email failed:', error);
    errorResponse(res, 'Test pre-alert email failed', 500);
  }
});

// Test package update email
router.post('/test-update', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      errorResponse(res, 'Email address is required', 400);
      return;
    }

    const trackingNumber = 'TEST' + Date.now();
    const emailSent = await EmailService.sendPackageUpdateEmail(
      email, 
      trackingNumber, 
      'Package Received at Warehouse', 
      'Main Warehouse'
    );
    
    if (emailSent) {
      successResponse(res, { 
        emailSent: true, 
        trackingNumber,
        message: 'Test package update email sent successfully' 
      });
    } else {
      errorResponse(res, 'Failed to send test package update email', 500);
    }
  } catch (error) {
    logger.error('Test package update email failed:', error);
    errorResponse(res, 'Test package update email failed', 500);
  }
});

export default router;
