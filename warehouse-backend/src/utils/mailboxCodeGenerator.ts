import { User } from '../models/User';
import { Warehouse } from '../models/Warehouse';
import { logger } from './logger';

/**
 * Generate unique mailbox code for Clean J Shipping customers
 * Format: CJS-0001, CJS-0002, etc.
 * 
 * @param warehouseId - Optional warehouse ID to get company abbreviation
 * @returns Promise<string> - Unique mailbox code
 */
export const generateMailboxCode = async (warehouseId?: string): Promise<string> => {
  try {
    // Get company abbreviation from warehouse or use default
    let abbreviation = 'CJS'; // Default for Clean J Shipping
    
    if (warehouseId) {
      const warehouse = await Warehouse.findById(warehouseId);
      if (warehouse && warehouse.companyAbbreviation) {
        abbreviation = warehouse.companyAbbreviation;
      }
    } else {
      // Get default warehouse
      const defaultWarehouse = await Warehouse.findOne({ isDefault: true });
      if (defaultWarehouse && defaultWarehouse.companyAbbreviation) {
        abbreviation = defaultWarehouse.companyAbbreviation;
      }
    }

    // Find the last mailbox code with this abbreviation
    const lastUser = await User.findOne({
      mailboxNumber: new RegExp(`^${abbreviation}-`, 'i')
    }).sort({ mailboxNumber: -1 });

    let nextNumber = 1;
    
    if (lastUser && lastUser.mailboxNumber) {
      // Extract number from format like "CJS-0001"
      const match = lastUser.mailboxNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format with leading zeros (4 digits)
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    const mailboxCode = `${abbreviation}-${formattedNumber}`;

    // Verify uniqueness
    const existingUser = await User.findOne({ mailboxNumber: mailboxCode });
    if (existingUser) {
      // If collision (unlikely), try next number
      return generateMailboxCode(warehouseId);
    }

    logger.info(`Generated mailbox code: ${mailboxCode}`);
    return mailboxCode;

  } catch (error) {
    logger.error('Error generating mailbox code:', error);
    // Fallback to random code
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `CJS-${random}`;
  }
};

/**
 * Validate mailbox code format
 * Format: 2-5 letters, hyphen, 4 digits
 * 
 * @param code - Mailbox code to validate
 * @returns boolean
 */
export const isValidMailboxCode = (code: string): boolean => {
  const pattern = /^[A-Z]{2,5}-\d{4}$/;
  return pattern.test(code);
};

/**
 * Get next available mailbox code
 * Used for bulk customer creation
 * 
 * @param count - Number of codes needed
 * @param warehouseId - Optional warehouse ID
 * @returns Promise<string[]>
 */
export const generateBulkMailboxCodes = async (
  count: number, 
  warehouseId?: string
): Promise<string[]> => {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = await generateMailboxCode(warehouseId);
    codes.push(code);
  }
  
  return codes;
};

/**
 * Get mailbox code statistics
 * Useful for admin dashboard
 * 
 * @returns Promise<object>
 */
export const getMailboxCodeStats = async (): Promise<{
  total: number;
  byPrefix: { prefix: string; count: number }[];
  lastGenerated: string | null;
}> => {
  try {
    const users = await User.find({ 
      mailboxNumber: { $exists: true, $ne: null } 
    }).select('mailboxNumber');

    const total = users.length;
    const prefixMap = new Map<string, number>();

    users.forEach(user => {
      if (user.mailboxNumber) {
        const prefix = user.mailboxNumber.split('-')[0];
        prefixMap.set(prefix, (prefixMap.get(prefix) || 0) + 1);
      }
    });

    const byPrefix = Array.from(prefixMap.entries()).map(([prefix, count]) => ({
      prefix,
      count
    }));

    const lastUser = await User.findOne({ 
      mailboxNumber: { $exists: true } 
    }).sort({ createdAt: -1 });

    return {
      total,
      byPrefix,
      lastGenerated: lastUser?.mailboxNumber || null
    };

  } catch (error) {
    logger.error('Error getting mailbox code stats:', error);
    return {
      total: 0,
      byPrefix: [],
      lastGenerated: null
    };
  }
};