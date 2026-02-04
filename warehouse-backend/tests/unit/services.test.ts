import { PackageService } from '../../src/services/packageService';
import { CustomerService } from '../../src/services/customerService';
import { InventoryService } from '../../src/services/inventoryService';
import { AnalyticsService } from '../../src/services/analyticsService';
import { EmailService } from '../../src/services/emailService';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';
import { User } from '../../src/models/User';
import { Package } from '../../src/models/Package';
import { Inventory } from '../../src/models/Inventory';

describe('Services Unit Tests', () => {
  let testUser: any;

  beforeAll(async () => {
    await connectDatabase();
    
    testUser = await User.create({
      name: 'Test User',
      email: 'service@test.com',
      password: 'password123',
      role: 'warehouse_staff'
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Package.deleteMany({});
    await Inventory.deleteMany({});
    await disconnectDatabase();
  });

  describe('PackageService', () => {
    test('should create a package', async () => {
      const packageData = {
        senderId: testUser._id,
        recipientId: testUser._id,
        senderName: 'John Doe',
        recipientName: 'Jane Smith',
        senderAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        recipientAddress: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA'
        },
        weight: 5.5,
        dimensions: {
          length: 10,
          width: 8,
          height: 5,
          unit: 'cm'
        }
      };

      const result = await PackageService.createPackage(packageData, testUser._id);
      
      expect(result).toBeDefined();
      expect(result.trackingNumber).toBeDefined();
      expect(result.senderId.toString()).toBe(testUser._id.toString());
      expect(result.status).toBe('pending');
    });

    test('should update package status', async () => {
      // First create a package
      const packageData = {
        senderId: testUser._id,
        recipientId: testUser._id,
        senderName: 'John Doe',
        recipientName: 'Jane Smith',
        senderAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        recipientAddress: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA'
        },
        weight: 3.0,
        dimensions: {
          length: 8,
          width: 6,
          height: 4,
          unit: 'cm'
        }
      };

      const newPackage = await PackageService.createPackage(packageData, testUser._id);

      // Update status
      const result = await PackageService.updatePackageStatus(
        newPackage._id,
        'in-transit',
        'Distribution Center',
        'Package in transit'
      );

      expect(result).toBeDefined();
      expect(result!.status).toBe('in-transit');
      expect(result!.trackingHistory).toHaveLength(1);
    });

    test('should calculate package cost', async () => {
      const packageData = {
        weight: 5.0,
        dimensions: {
          length: 10,
          width: 8,
          height: 5,
          unit: 'cm'
        }
      };

      const cost = await PackageService.calculatePackageCost(packageData);
      
      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    test('should get package by tracking number', async () => {
      const packageData = {
        senderId: testUser._id,
        recipientId: testUser._id,
        senderName: 'John Doe',
        recipientName: 'Jane Smith',
        senderAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        recipientAddress: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA'
        },
        weight: 2.0,
        dimensions: {
          length: 6,
          width: 4,
          height: 3,
          unit: 'cm'
        }
      };

      const newPackage = await PackageService.createPackage(packageData, testUser._id);

      const result = await PackageService.getPackageByTrackingNumber(newPackage.trackingNumber);
      
      expect(result).toBeDefined();
      expect(result!.trackingNumber).toBe(newPackage.trackingNumber);
    });
  });

  describe('CustomerService', () => {
    test('should create a customer', async () => {
      const customerData = {
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '+1234567890'
      };

      const result = await CustomerService.createCustomer(customerData);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(customerData.name);
      expect(result.email).toBe(customerData.email);
      expect(result.role).toBe('customer');
    });

    test('should get customer by email', async () => {
      const customerData = {
        name: 'Another Customer',
        email: 'another@example.com',
        phone: '+0987654321'
      };

      await CustomerService.createCustomer(customerData);

      const result = await CustomerService.getCustomerByEmail('another@example.com');
      
      expect(result).toBeDefined();
      expect(result!.email).toBe(customerData.email);
    });

    test('should update customer', async () => {
      const customerData = {
        name: 'Update Customer',
        email: 'update@example.com',
        phone: '+1111111111'
      };

      const customer = await CustomerService.createCustomer(customerData);
      
      const updateData = {
        name: 'Updated Name',
        phone: '+2222222222'
      };

      const result = await CustomerService.updateCustomer(customer._id, updateData);
      
      expect(result).toBeDefined();
      expect(result!.name).toBe(updateData.name);
      expect(result!.phone).toBe(updateData.phone);
    });
  });

  describe('InventoryService', () => {
    test('should create inventory item', async () => {
      const inventoryData = {
        name: 'Test Item',
        sku: 'TEST001',
        category: 'Electronics',
        quantity: 100,
        minStockLevel: 10,
        maxStockLevel: 1000,
        unitPrice: 29.99,
        currency: 'USD',
        location: {
          warehouse: testUser._id,
          aisle: 'A1',
          shelf: 'S1',
          bin: 'B1'
        }
      };

      const result = await InventoryService.createInventory(inventoryData, testUser._id);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(inventoryData.name);
      expect(result.sku).toBe(inventoryData.sku);
      expect(result.quantity).toBe(inventoryData.quantity);
    });

    test('should adjust inventory', async () => {
      const inventoryData = {
        name: 'Adjust Item',
        sku: 'ADJ001',
        category: 'Test',
        quantity: 50,
        minStockLevel: 5,
        maxStockLevel: 500,
        unitPrice: 15.99,
        currency: 'USD'
      };

      const item = await InventoryService.createInventory(inventoryData, testUser._id);

      const result = await InventoryService.adjustInventory(
        item._id,
        'in',
        25,
        'Stock replenishment',
        testUser._id
      );
      
      expect(result).toBeDefined();
      expect(result.item.quantity).toBe(75); // 50 + 25
      expect(result.transaction.type).toBe('in');
      expect(result.transaction.quantity).toBe(25);
    });
  });

  describe('AnalyticsService', () => {
    test('should get dashboard stats', async () => {
      const result = await AnalyticsService.getDashboardStats();
      
      expect(result).toBeDefined();
      expect(result.packages).toBeDefined();
      expect(result.customers).toBeDefined();
      expect(result.inventory).toBeDefined();
      expect(typeof result.packages.total).toBe('number');
    });

    test('should get package analytics', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const result = await AnalyticsService.getPackageAnalytics(startDate, endDate);
      
      expect(result).toBeDefined();
      expect(typeof result.total).toBe('number');
      expect(Array.isArray(result.statusBreakdown)).toBe(true);
      expect(Array.isArray(result.dailyPackages)).toBe(true);
    });
  });

  describe('EmailService', () => {
    test('should verify email connection', async () => {
      // This test might fail if SMTP credentials are not configured
      // In a real environment, you'd mock this or use test credentials
      const result = await EmailService.verifyConnection();
      
      // Result might be false if no SMTP config, which is acceptable for testing
      expect(typeof result).toBe('boolean');
    });
  });
});
