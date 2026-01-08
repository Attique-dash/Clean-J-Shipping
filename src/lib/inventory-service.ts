import { dbConnect } from '@/lib/db';
import { Inventory } from '@/models/Inventory';
import { InventoryTransaction } from '@/models/InventoryTransaction';

interface PackageMaterials {
  boxes?: number;
  tape?: number; // in meters
  bubbleWrap?: number; // in meters
  labels?: number;
  fillerPaper?: number; // in kg
}

interface ExtendedPackageData {
  weight?: number;
  dimensions?: { length?: number; width?: number; height?: number };
  trackingNumber?: string;
  warehouseLocation?: string;
  fragile?: boolean;
}

interface InventoryUpdateResult {
  success: boolean;
  message: string;
  transactions?: { _id: string; type: string; inventoryId: string; quantity: number; previousStock: number; newStock: number; reason: string; location?: string; createdAt: Date }[];
  lowStockItems?: { _id: string; name: string; category: string; currentStock: number; minStock: number; location?: string; supplier?: string; notes?: string; }[];
}

export class InventoryService {
  /**
   * Automatically deduct materials when processing a package
   */
  static async deductPackageMaterials(
    packageData: ExtendedPackageData,
    packageId: string,
    userId?: string
  ): Promise<InventoryUpdateResult> {
    try {
      await dbConnect();
      
      // Calculate materials needed based on package characteristics
      const materials = this.calculateMaterialsNeeded(packageData);
      const transactions = [];
      const lowStockItems = [];

      // Process each material type
      for (const [materialType, quantity] of Object.entries(materials)) {
        if (quantity <= 0) continue;

        // Find inventory item for this material
        const inventoryItem = await Inventory.findOne({
          category: materialType,
          location: packageData.warehouseLocation || 'Main Warehouse'
        });

        if (!inventoryItem) {
          console.warn(`Inventory item not found for ${materialType}. Skipping deduction.`);
          continue;
        }

        const previousStock = inventoryItem.currentStock;
        const newStock = Math.max(0, previousStock - quantity);

        // Check if we have enough stock
        if (newStock < 0) {
          console.warn(`Insufficient ${materialType}. Required: ${quantity}, Available: ${previousStock}`);
          continue; // Skip this item but don't fail the whole process
        }

        // Update inventory
        inventoryItem.currentStock = newStock;
        await inventoryItem.save();

        // Create transaction record
        const transaction = await InventoryTransaction.create({
          inventoryId: inventoryItem._id,
          transactionType: 'consumption',
          quantity: -quantity, // Negative for consumption
          referenceType: 'package',
          referenceId: packageId,
          reason: `Used for package ${packageData.trackingNumber}`,
          location: packageData.warehouseLocation || 'Main Warehouse',
          userId: userId,
          previousStock,
          newStock
        });

        transactions.push(transaction);

        // Check for low stock
        if (newStock <= inventoryItem.minStock) {
          lowStockItems.push({
            _id: inventoryItem._id,
            name: inventoryItem.name,
            category: inventoryItem.category,
            currentStock: newStock,
            minStock: inventoryItem.minStock,
            location: inventoryItem.location,
            supplier: inventoryItem.supplier,
            notes: inventoryItem.notes
          });
        }
      }

      return {
        success: true,
        message: 'Materials deducted successfully',
        transactions,
        lowStockItems
      };

    } catch (error) {
      console.error('Error deducting package materials:', error);
      return {
        success: false,
        message: 'Failed to deduct materials',
        transactions: [],
        lowStockItems: []
      };
    }
  }

  /**
   * Calculate materials needed for a package based on its characteristics
   */
  private static calculateMaterialsNeeded(packageData: ExtendedPackageData): PackageMaterials {
    const weight = packageData.weight || 0;
    const dimensions = packageData.dimensions || {};
    const length = dimensions.length || 0;
    const width = dimensions.width || 0;
    const height = dimensions.height || 0;
    
    // Calculate package volume in cubic cm
    const volume = length * width * height;
    
    // Calculate package surface area for wrapping materials
    const surfaceArea = 2 * (length * width + length * height + width * height);
    
    const materials: PackageMaterials = {};

    // Box calculation (1 box per package)
    materials.boxes = 1;

    // Tape calculation (based on surface area, assuming tape goes around edges)
    // Approximate tape needed: perimeter of box + extra for sealing
    const perimeter = 2 * (length + width);
    materials.tape = Math.ceil((perimeter * 2) / 100); // Convert to meters, add extra

    // Bubble wrap calculation (for fragile items or based on volume)
    if (packageData.fragile || volume > 10000) { // > 10,000 cm³
      materials.bubbleWrap = Math.ceil(surfaceArea / 10000); // Convert to meters
    }

    // Labels (always 1 per package)
    materials.labels = 1;

    // Filler paper (for larger packages)
    if (volume > 15000) { // > 15,000 cm³
      materials.fillerPaper = Math.ceil(volume / 50000); // Estimate in kg
    }

    return materials;
  }

  /**
   * Restock inventory items
   */
  static async restockItems(
    items: Array<{ inventoryId: string; quantity: number; reason?: string }>,
    userId?: string
  ): Promise<InventoryUpdateResult> {
    try {
      await dbConnect();
      
      const transactions = [];
      const lowStockItems = [];

      for (const item of items) {
        const inventoryItem = await Inventory.findById(item.inventoryId);
        if (!inventoryItem) {
          continue;
        }

        const previousStock = inventoryItem.currentStock;
        const newStock = previousStock + item.quantity;

        // Update inventory
        inventoryItem.currentStock = newStock;
        inventoryItem.lastRestocked = new Date();
        await inventoryItem.save();

        // Create transaction
        const transaction = await InventoryTransaction.create({
          inventoryId: inventoryItem._id,
          transactionType: 'restock',
          quantity: item.quantity,
          referenceType: 'manual',
          reason: item.reason || 'Manual restock',
          userId: userId,
          previousStock,
          newStock
        });

        transactions.push(transaction);
      }

      return {
        success: true,
        message: 'Items restocked successfully',
        transactions
      };

    } catch (error) {
      console.error('Error restocking items:', error);
      return {
        success: false,
        message: 'Failed to restock items'
      };
    }
  }

  /**
   * Get inventory status with alerts
   */
  static async getInventoryStatus(location?: string) {
    try {
      await dbConnect();
      
      const query: Record<string, string> = {};
      if (location) {
        query.location = location;
      }

      const items = await Inventory.find(query).sort({ category: 1, name: 1 });
      
      const status = {
        totalItems: items.length,
        lowStockItems: items.filter(item => item.currentStock <= item.minStock),
        outOfStockItems: items.filter(item => item.currentStock === 0),
        categories: {} as Record<string, { 
          name: string; 
          currentStock: number; 
          minStock: number; 
          location?: string; 
          supplier?: string; 
          notes?: string; 
          totalValue: number;
          total: number;
          lowStock: number;
          outOfStock: number;
          items: any[];
        }>
      };

      // Group by category
      items.forEach(item => {
        if (!status.categories[item.category]) {
          status.categories[item.category] = {
            name: item.category,
            currentStock: 0,
            minStock: 0,
            totalValue: 0,
            total: 0,
            lowStock: 0,
            outOfStock: 0,
            items: []
          };
        }
        
        status.categories[item.category].total++;
        status.categories[item.category].items.push(item);
        
        if (item.currentStock <= item.minStock) {
          status.categories[item.category].lowStock++;
        }
        
        if (item.currentStock === 0) {
          status.categories[item.category].outOfStock++;
        }
      });

      return status;

    } catch (error) {
      console.error('Error getting inventory status:', error);
      throw error;
    }
  }
}
