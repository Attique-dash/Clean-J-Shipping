import request from 'supertest';
import { app } from '../../src/app';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';
import { User } from '../../src/models/User';
import { Package } from '../../src/models/Package';

describe('Customer API Integration Tests', () => {
  let authToken: string;
  let testCustomer: any;
  let testPackage: any;

  beforeAll(async () => {
    await connectDatabase();
    
    // Create test customer
    testCustomer = await User.create({
      name: 'Test Customer',
      email: 'customer@test.com',
      password: 'password123',
      role: 'customer'
    });

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'customer@test.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;

    // Create test package for customer
    testPackage = await Package.create({
      trackingNumber: 'TEST123456',
      senderId: testCustomer._id,
      recipientId: testCustomer._id,
      senderName: 'Test Customer',
      recipientName: 'Test Customer',
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
      weight: 2.5,
      dimensions: {
        length: 8,
        width: 6,
        height: 4,
        unit: 'cm'
      },
      createdBy: testCustomer._id
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Package.deleteMany({});
    await disconnectDatabase();
  });

  describe('Package Tracking', () => {
    test('GET /api/customer/packages - Get customer packages', async () => {
      const response = await request(app)
        .get('/api/customer/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.packages).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });

    test('GET /api/customer/packages/:id - Get package by ID', async () => {
      const response = await request(app)
        .get(`/api/customer/packages/${testPackage._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testPackage._id);
    });

    test('GET /api/customer/packages/tracking/:trackingNumber - Track package', async () => {
      const response = await request(app)
        .get(`/api/customer/packages/tracking/${testPackage.trackingNumber}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trackingNumber).toBe(testPackage.trackingNumber);
    });

    test('POST /api/customer/packages/:id/report-issue - Report issue', async () => {
      const response = await request(app)
        .post(`/api/customer/packages/${testPackage._id}/report-issue`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          issue: 'Damaged package',
          description: 'Package arrived with visible damage'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /api/customer/packages/:id/history - Get package history', async () => {
      const response = await request(app)
        .get(`/api/customer/packages/${testPackage._id}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trackingHistory).toBeDefined();
    });
  });

  describe('Profile Management', () => {
    test('GET /api/customer/profile - Get profile', async () => {
      const response = await request(app)
        .get('/api/customer/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testCustomer.email);
    });

    test('PUT /api/customer/profile - Update profile', async () => {
      const updateData = {
        name: 'Updated Customer Name',
        phone: '+1987654321'
      };

      const response = await request(app)
        .put('/api/customer/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.phone).toBe(updateData.phone);
    });

    test('PUT /api/customer/password - Update password', async () => {
      const response = await request(app)
        .put('/api/customer/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Shipping Addresses', () => {
    test('POST /api/customer/shipping/addresses - Create shipping address', async () => {
      const addressData = {
        street: '789 Pine St',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA',
        isDefault: true
      };

      const response = await request(app)
        .post('/api/customer/shipping/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(addressData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.street).toBe(addressData.street);
      expect(response.body.data.isDefault).toBe(true);
    });

    test('GET /api/customer/shipping/addresses - Get shipping addresses', async () => {
      const response = await request(app)
        .get('/api/customer/shipping/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.addresses).toBeInstanceOf(Array);
    });

    test('PATCH /api/customer/shipping/addresses/:id/default - Set default address', async () => {
      // First get the created address
      const getResponse = await request(app)
        .get('/api/customer/shipping/addresses')
        .set('Authorization', `Bearer ${authToken}`);

      const addressId = getResponse.body.data.addresses[0]._id;

      const response = await request(app)
        .patch(`/api/customer/shipping/addresses/${addressId}/default`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isDefault).toBe(true);
    });
  });

  describe('Authentication', () => {
    test('GET /api/customer/packages - Should fail without auth', async () => {
      await request(app)
        .get('/api/customer/packages')
        .expect(401);
    });

    test('GET /api/customer/packages - Should fail with invalid token', async () => {
      await request(app)
        .get('/api/customer/packages')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
