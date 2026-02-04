import request from 'supertest';
import { app } from '../../src/app';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';
import { User } from '../../src/models/User';
import { Package } from '../../src/models/Package';

describe('Controllers Unit Tests', () => {
  let authToken: string;
  let testUser: any;
  let testPackage: any;

  beforeAll(async () => {
    await connectDatabase();
    
    // Create test user
    testUser = await User.create({
      name: 'Test Controller User',
      email: 'controller@test.com',
      password: 'password123',
      role: 'warehouse_staff'
    });

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'controller@test.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Package.deleteMany({});
    await disconnectDatabase();
  });

  describe('Package Controller', () => {
    beforeEach(async () => {
      // Create a test package for each test
      testPackage = await Package.create({
        trackingNumber: 'CTRL123456',
        senderId: testUser._id,
        recipientId: testUser._id,
        senderName: 'Test Sender',
        recipientName: 'Test Recipient',
        senderAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'USA'
        },
        recipientAddress: {
          street: '456 Test Ave',
          city: 'Test Town',
          state: 'TT',
          zipCode: '67890',
          country: 'USA'
        },
        weight: 1.5,
        dimensions: {
          length: 5,
          width: 4,
          height: 3,
          unit: 'cm'
        },
        createdBy: testUser._id
      });
    });

    afterEach(async () => {
      await Package.deleteMany({});
    });

    test('GET /api/warehouse/packages - should return paginated packages', async () => {
      const response = await request(app)
        .get('/api/warehouse/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.packages).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalItems).toBeGreaterThanOrEqual(1);
    });

    test('GET /api/warehouse/packages?page=2&limit=5 - should respect pagination parameters', async () => {
      // Create additional packages for pagination testing
      for (let i = 0; i < 10; i++) {
        await Package.create({
          trackingNumber: `PAGETEST${i}`,
          senderId: testUser._id,
          recipientId: testUser._id,
          senderName: `Sender ${i}`,
          recipientName: `Recipient ${i}`,
          senderAddress: {
            street: `${i} Test St`,
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'USA'
          },
          recipientAddress: {
            street: `${i} Test Ave`,
            city: 'Test Town',
            state: 'TT',
            zipCode: '67890',
            country: 'USA'
          },
          weight: 1.0,
          dimensions: {
            length: 4,
            width: 3,
            height: 2,
            unit: 'cm'
          },
          createdBy: testUser._id
        });
      }

      const response = await request(app)
        .get('/api/warehouse/packages?page=2&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.packages).toHaveLength(5);
      expect(response.body.data.pagination.currentPage).toBe(2);
      expect(response.body.data.pagination.itemsPerPage).toBe(5);
    });

    test('GET /api/warehouse/packages?status=pending - should filter by status', async () => {
      const response = await request(app)
        .get('/api/warehouse/packages?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.packages).toBeInstanceOf(Array);
      response.body.data.packages.forEach((pkg: any) => {
        expect(pkg.status).toBe('pending');
      });
    });

    test('GET /api/warehouse/packages/:id - should return single package', async () => {
      const response = await request(app)
        .get(`/api/warehouse/packages/${testPackage._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testPackage._id.toString());
      expect(response.body.data.trackingNumber).toBe(testPackage.trackingNumber);
    });

    test('GET /api/warehouse/packages/:id - should return 404 for non-existent package', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/warehouse/packages/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('POST /api/warehouse/packages - should create new package', async () => {
      const packageData = {
        senderName: 'New Sender',
        recipientName: 'New Recipient',
        senderAddress: {
          street: '789 New St',
          city: 'New City',
          state: 'NC',
          zipCode: '11111',
          country: 'USA'
        },
        recipientAddress: {
          street: '321 New Ave',
          city: 'New Town',
          state: 'NT',
          zipCode: '22222',
          country: 'USA'
        },
        weight: 2.5,
        dimensions: {
          length: 8,
          width: 6,
          height: 4,
          unit: 'cm'
        },
        description: 'New test package'
      };

      const response = await request(app)
        .post('/api/warehouse/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(packageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trackingNumber).toBeDefined();
      expect(response.body.data.senderName).toBe(packageData.senderName);
      expect(response.body.data.recipientName).toBe(packageData.recipientName);
    });

    test('POST /api/warehouse/packages - should validate required fields', async () => {
      const invalidData = {
        senderName: 'Test Sender'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/warehouse/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    test('PATCH /api/warehouse/packages/:id/status - should update package status', async () => {
      const statusUpdate = {
        status: 'in-transit',
        location: 'Test Location',
        description: 'Test status update'
      };

      const response = await request(app)
        .patch(`/api/warehouse/packages/${testPackage._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(statusUpdate.status);
      expect(response.body.data.trackingHistory).toHaveLength(1);
      expect(response.body.data.trackingHistory[0].location).toBe(statusUpdate.location);
    });

    test('GET /api/warehouse/packages/tracking/:trackingNumber - should find by tracking number', async () => {
      const response = await request(app)
        .get(`/api/warehouse/packages/tracking/${testPackage.trackingNumber}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trackingNumber).toBe(testPackage.trackingNumber);
    });

    test('GET /api/warehouse/packages/tracking/:trackingNumber - should be case insensitive', async () => {
      const response = await request(app)
        .get(`/api/warehouse/packages/tracking/${testPackage.trackingNumber.toLowerCase()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trackingNumber).toBe(testPackage.trackingNumber);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid ObjectId format', async () => {
      const invalidId = 'invalid-object-id';
      
      const response = await request(app)
        .get(`/api/warehouse/packages/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid ID format');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/warehouse/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/warehouse/packages')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unauthorized');
    });

    test('should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/warehouse/packages')
        .set('Authorization', 'InvalidFormat token123')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
