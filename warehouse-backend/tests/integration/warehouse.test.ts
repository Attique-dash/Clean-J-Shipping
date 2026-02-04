import request from 'supertest';
import { app } from '../../src/app';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';
import { User } from '../../src/models/User';
import { Package } from '../../src/models/Package';

describe('Warehouse API Integration Tests', () => {
  let authToken: string;
  let testUser: any;
  let testPackage: any;

  beforeAll(async () => {
    await connectDatabase();
    
    // Create test user
    testUser = await User.create({
      name: 'Test Warehouse User',
      email: 'warehouse@test.com',
      password: 'password123',
      role: 'warehouse_staff'
    });

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'warehouse@test.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Package.deleteMany({});
    await disconnectDatabase();
  });

  describe('Package Management', () => {
    test('POST /api/warehouse/packages - Create package', async () => {
      const packageData = {
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
        },
        description: 'Test package'
      };

      const response = await request(app)
        .post('/api/warehouse/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(packageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trackingNumber).toBeDefined();
      testPackage = response.body.data;
    });

    test('GET /api/warehouse/packages - Get packages', async () => {
      const response = await request(app)
        .get('/api/warehouse/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.packages).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });

    test('GET /api/warehouse/packages/:id - Get package by ID', async () => {
      const response = await request(app)
        .get(`/api/warehouse/packages/${testPackage._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testPackage._id);
    });

    test('PATCH /api/warehouse/packages/:id/status - Update package status', async () => {
      const response = await request(app)
        .patch(`/api/warehouse/packages/${testPackage._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'in-transit',
          location: 'Distribution Center',
          description: 'Package in transit'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in-transit');
    });
  });

  describe('Customer Management', () => {
    test('POST /api/warehouse/customers - Create customer', async () => {
      const customerData = {
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/warehouse/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(customerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(customerData.email);
    });

    test('GET /api/warehouse/customers - Get customers', async () => {
      const response = await request(app)
        .get('/api/warehouse/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.customers).toBeInstanceOf(Array);
    });
  });

  describe('Analytics', () => {
    test('GET /api/warehouse/analytics/dashboard - Get dashboard stats', async () => {
      const response = await request(app)
        .get('/api/warehouse/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.packages).toBeDefined();
      expect(response.body.data.customers).toBeDefined();
      expect(response.body.data.inventory).toBeDefined();
    });
  });

  describe('Authentication', () => {
    test('GET /api/warehouse/packages - Should fail without auth', async () => {
      await request(app)
        .get('/api/warehouse/packages')
        .expect(401);
    });

    test('GET /api/warehouse/packages - Should fail with invalid token', async () => {
      await request(app)
        .get('/api/warehouse/packages')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
