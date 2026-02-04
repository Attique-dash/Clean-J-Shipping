import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Package } from '../../models/Package';
import { User } from '../../models/User';
import { successResponse, errorResponse, generateTrackingNumber } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and JSON files are allowed'));
    }
  }
});

export const uploadFile = upload.single('file');

export const bulkUploadPackages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      errorResponse(res, 'No file uploaded', 400);
      return;
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    let packagesData: any[] = [];
    
    if (fileExtension === '.csv') {
      packagesData = await parseCSV(filePath);
    } else if (fileExtension === '.json') {
      packagesData = await parseJSON(filePath);
    }

    // Validate and process packages
    const results = {
      successful: [],
      failed: [],
      total: packagesData.length
    };

    for (let i = 0; i < packagesData.length; i++) {
      try {
        const packageData = packagesData[i];
        
        // Validate required fields
        if (!packageData.senderName || !packageData.recipientName || 
            !packageData.senderAddress || !packageData.recipientAddress ||
            !packageData.weight || !packageData.dimensions) {
          results.failed.push({
            row: i + 1,
            data: packageData,
            error: 'Missing required fields'
          });
          continue;
        }

        // Create package
        const newPackage = new Package({
          trackingNumber: generateTrackingNumber(),
          senderName: packageData.senderName,
          recipientName: packageData.recipientName,
          senderAddress: packageData.senderAddress,
          recipientAddress: packageData.recipientAddress,
          weight: parseFloat(packageData.weight),
          dimensions: packageData.dimensions,
          description: packageData.description || '',
          value: packageData.value ? parseFloat(packageData.value) : undefined,
          currency: packageData.currency || 'USD',
          insurance: packageData.insurance === 'true' || packageData.insurance === true,
          signatureRequired: packageData.signatureRequired === 'true' || packageData.signatureRequired === true,
          estimatedDelivery: packageData.estimatedDelivery ? new Date(packageData.estimatedDelivery) : undefined,
          shippingMethod: packageData.shippingMethod || 'standard',
          priority: packageData.priority || 'standard',
          fragile: packageData.fragile === 'true' || packageData.fragile === true,
          hazardous: packageData.hazardous === 'true' || packageData.hazardous === true,
          specialInstructions: packageData.specialInstructions || '',
          notes: packageData.notes || '',
          createdBy: req.user._id
        });

        await newPackage.save();
        results.successful.push({
          row: i + 1,
          trackingNumber: newPackage.trackingNumber,
          data: packageData
        });

      } catch (error) {
        results.failed.push({
          row: i + 1,
          data: packagesData[i],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn('Failed to delete uploaded file:', error);
    }

    logger.info(`Bulk upload completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    
    successResponse(res, results, `Bulk upload completed: ${results.successful.length}/${results.total} packages processed`);

  } catch (error) {
    logger.error('Error during bulk upload:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.warn('Failed to delete uploaded file:', cleanupError);
      }
    }
    
    errorResponse(res, 'Failed to process bulk upload');
  }
};

async function parseCSV(filePath: string): Promise<any[]> {
  const csv = require('csv-parser');
  const results: any[] = [];
  
  return new Promise((resolve, reject) => {
    require('fs').createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: any) => {
        // Parse nested objects from CSV
        if (data.senderAddress) {
          try {
            data.senderAddress = JSON.parse(data.senderAddress);
          } catch {
            // If not JSON, try to parse from individual fields
            data.senderAddress = {
              street: data.senderStreet || '',
              city: data.senderCity || '',
              state: data.senderState || '',
              zipCode: data.senderZipCode || '',
              country: data.senderCountry || 'USA'
            };
          }
        }
        
        if (data.recipientAddress) {
          try {
            data.recipientAddress = JSON.parse(data.recipientAddress);
          } catch {
            data.recipientAddress = {
              street: data.recipientStreet || '',
              city: data.recipientCity || '',
              state: data.recipientState || '',
              zipCode: data.recipientZipCode || '',
              country: data.recipientCountry || 'USA'
            };
          }
        }
        
        if (data.dimensions) {
          try {
            data.dimensions = JSON.parse(data.dimensions);
          } catch {
            data.dimensions = {
              length: parseFloat(data.length) || 0,
              width: parseFloat(data.width) || 0,
              height: parseFloat(data.height) || 0,
              unit: data.dimensionUnit || 'cm'
            };
          }
        }
        
        results.push(data);
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function parseJSON(filePath: string): Promise<any[]> {
  const data = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(data);
  
  // Handle both single object and array
  return Array.isArray(parsed) ? parsed : [parsed];
}

export const getBulkUploadTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const template = {
      format: 'CSV',
      headers: [
        'senderName',
        'recipientName', 
        'senderStreet',
        'senderCity',
        'senderState',
        'senderZipCode',
        'senderCountry',
        'recipientStreet',
        'recipientCity',
        'recipientState',
        'recipientZipCode',
        'recipientCountry',
        'weight',
        'length',
        'width',
        'height',
        'dimensionUnit',
        'description',
        'value',
        'currency',
        'insurance',
        'signatureRequired',
        'shippingMethod',
        'priority',
        'fragile',
        'hazardous',
        'specialInstructions',
        'notes'
      ],
      sampleData: [
        {
          senderName: 'John Doe',
          recipientName: 'Jane Smith',
          senderStreet: '123 Main St',
          senderCity: 'New York',
          senderState: 'NY',
          senderZipCode: '10001',
          senderCountry: 'USA',
          recipientStreet: '456 Oak Ave',
          recipientCity: 'Los Angeles',
          recipientState: 'CA',
          recipientZipCode: '90001',
          recipientCountry: 'USA',
          weight: '5.5',
          length: '10',
          width: '8',
          height: '5',
          dimensionUnit: 'cm',
          description: 'Electronics package',
          value: '299.99',
          currency: 'USD',
          insurance: 'true',
          signatureRequired: 'true',
          shippingMethod: 'express',
          priority: 'standard',
          fragile: 'false',
          hazardous: 'false',
          specialInstructions: 'Handle with care',
          notes: 'Customer priority package'
        }
      ]
    };

    successResponse(res, template, 'Bulk upload template retrieved successfully');
  } catch (error) {
    logger.error('Error getting bulk upload template:', error);
    errorResponse(res, 'Failed to get bulk upload template');
  }
};

export const getBulkUploadHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would typically query a bulk upload history collection
    // For now, return a placeholder response
    const history = {
      uploads: [],
      message: 'Bulk upload history feature coming soon'
    };

    successResponse(res, history);
  } catch (error) {
    logger.error('Error getting bulk upload history:', error);
    errorResponse(res, 'Failed to get bulk upload history');
  }
};
