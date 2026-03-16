const swaggerJsdoc = require('swagger-jsdoc');

const getServers = () => {
  const servers = [];
  
  if (process.env.NODE_ENV === 'production') {
    servers.push({
      url: process.env.BASE_URL || 'https://cleanjshipping.vercel.app',
      description: 'Production server'
    });
  } else {
    servers.push({
      url: `http://localhost:${process.env.PORT || 5000}`,
      description: 'Development server'
    });
  }
  
  return servers;
};

// Helper to get base URL for endpoint examples in docs
const getBaseUrl = () => {
  return process.env.NODE_ENV === 'production'
    ? (process.env.BASE_URL || 'https://cleanjshipping.vercel.app')
    : `http://localhost:${process.env.PORT || 5000}`;
};

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Warehouse Management API',
      version: '1.0.0',
      description: 'Clean J Shipping Warehouse Management System API',
      contact: {
        name: 'API Support',
        email: 'support@cleanjshipping.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: getServers(),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token from login endpoint (for Customer, Warehouse, Admin roles)'
        },
        // FIX: Removed misleading kcdBearerAuth scheme. KCD uses X-KCD-API-Key header only.
        kcdApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-KCD-API-Key',
          description: 'KCD API Key for courier integration. Enter the plain API key (48-char alphanumeric, no prefix). Example: a1b2c3d4e5f6... — generated via POST /api/admin/api-keys/kcd'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for warehouse integration'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password'],
          properties: {
            userCode: { type: 'string', example: 'CLEAN-0001' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
            password: { type: 'string', minLength: 8, example: 'password123' },
            phone: { type: 'string', example: '+1234567890' },
            role: { type: 'string', enum: ['admin', 'customer', 'warehouse'], example: 'customer' },
            branch: { type: 'string', example: 'Down Town' },
            mailboxNumber: { type: 'string', example: 'CLEAN-0001' },
            accountStatus: { type: 'string', enum: ['pending', 'active', 'inactive'], example: 'active' },
            emailVerified: { type: 'boolean', example: true },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string', example: '123 Main St' },
                city: { type: 'string', example: 'New York' },
                state: { type: 'string', example: 'NY' },
                zipCode: { type: 'string', example: '10001' },
                country: { type: 'string', example: 'USA' }
              }
            }
          }
        },
        Login: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'alice@customer.com' },
            password: { type: 'string', example: 'customer123' }
          }
        },
        Register: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password'],
          properties: {
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', minLength: 8, example: 'Password123!' },
            phone: { type: 'string', example: '+1234567890' },
            role: { type: 'string', enum: ['customer', 'warehouse'], example: 'customer' },
            branch: { type: 'string', example: 'Down Town' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string', example: '123 Main St' },
                city: { type: 'string', example: 'New York' },
                state: { type: 'string', example: 'NY' },
                zipCode: { type: 'string', example: '10001' },
                country: { type: 'string', example: 'USA' }
              }
            }
          }
        },
        Package: {
          type: 'object',
          required: ['UserCode', 'Weight'],
          properties: {
            // Legacy fields
            trackingNumber: { type: 'string', example: 'TRK123456789' },
            userCode: { type: 'string', example: 'CLEAN-0001' },
            weight: { type: 'number', example: 5.5 },
            dimensions: {
              type: 'object',
              properties: {
                length: { type: 'number', example: 10 },
                width: { type: 'number', example: 5 },
                height: { type: 'number', example: 3 },
                unit: { type: 'string', enum: ['cm', 'in'], example: 'cm' }
              }
            },
            serviceMode: { type: 'string', enum: ['air', 'ocean', 'local'], example: 'air' },
            status: { type: 'string', enum: ['received', 'in_transit', 'out_for_delivery', 'delivered', 'pending', 'customs', 'returned', 'at_warehouse', 'processing', 'ready_for_pickup'], example: 'received' },
            shipper: { type: 'string', example: 'DHL' },
            description: { type: 'string', example: 'Electronics package' },
            itemDescription: { type: 'string', example: 'Laptop computer' },
            
            // Sender information
            senderName: { type: 'string', example: 'John Smith' },
            senderEmail: { type: 'string', example: 'sender@example.com' },
            senderPhone: { type: 'string', example: '+1234567890' },
            senderAddress: { type: 'string', example: '123 Sender St, Sender City' },
            senderCountry: { type: 'string', example: 'USA' },
            
            // Recipient information
            recipient: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Jane Doe' },
                email: { type: 'string', example: 'jane@example.com' },
                shippingId: { type: 'string', example: 'SHIP001' },
                phone: { type: 'string', example: '+0987654321' },
                address: { type: 'string', example: '456 Recipient Ave, Recipient City' }
              }
            },
            
            // Warehouse and logistics
            warehouseLocation: { type: 'string', example: 'New York Warehouse' },
            warehouseAddress: { type: 'string', example: '789 Warehouse Blvd, NY' },
            location: { type: 'string', example: 'In transit - New York' },
            estimatedDelivery: { type: 'string', format: 'date-time', example: '2024-02-15T10:00:00Z' },
            
            // Customs
            customsRequired: { type: 'boolean', example: false },
            customsStatus: { type: 'string', enum: ['not_required', 'pending', 'cleared'], example: 'not_required' },
            
            // Payment
            shippingCost: { type: 'number', example: 25.50 },
            totalAmount: { type: 'number', example: 125.50 },
            paymentStatus: { type: 'string', enum: ['pending', 'paid', 'partially_paid'], example: 'pending' },
            
            // Package flags
            isFragile: { type: 'boolean', example: false },
            isHazardous: { type: 'boolean', example: false },
            requiresSignature: { type: 'boolean', example: true },
            
            // Additional information
            specialInstructions: { type: 'string', example: 'Handle with care' },
            notes: { type: 'string', example: 'Customer requested expedited shipping' },
            
            // KCD Integration fields
            courierCode: { type: 'string', example: 'CLEAN' },
            customerCode: { type: 'string', example: 'CLEAN-0001' },
            source: { type: 'string', enum: ['web', 'kcd-packing-system', 'api'], example: 'web' },
            
            // Tasoko API fields (REQUIRED for KCD integration)
            PackageID: { type: 'string', description: 'UUID from Tasoko system', example: '83383d43-a368-4fc1-a216-9e54e8ae7227' },
            CourierID: { type: 'string', description: 'UUID from Tasoko system', example: '15fff123-f237-4571-b92a-ae69427d7a56' },
            TrackingNumber: { type: 'string', description: 'Alternative tracking number field', example: 'DROPOFF-20240902-225642-547' },
            ControlNumber: { type: 'string', description: 'EP0096513 format control number', example: 'EP0096513' },
            FirstName: { type: 'string', description: 'First name from Tasoko', example: 'Courtney' },
            LastName: { type: 'string', description: 'Last name from Tasoko', example: 'Patterson' },
            UserCode: { type: 'string', description: 'User code from Tasoko (REQUIRED)', example: 'EPXUUYE' },
            Weight: { type: 'number', description: 'Weight from Tasoko (REQUIRED)', example: 1 },
            Shipper: { type: 'string', description: 'Shipper from Tasoko', example: 'Amazon' },
            EntryStaff: { type: 'string', description: 'Staff who entered package', example: 'warehouse_staff_01' },
            EntryDate: { type: 'string', format: 'date', description: 'Entry date (date only)', example: '2024-09-02' },
            EntryDateTime: { type: 'string', format: 'date-time', description: 'Full timestamp', example: '2024-09-02T21:55:51.1806146-05:00' },
            Branch: { type: 'string', description: 'Branch name', example: 'Down Town' },
            Claimed: { type: 'boolean', description: 'Package claimed status', example: false },
            APIToken: { type: 'string', description: 'API token reference', example: '<API-TOKEN>' },
            ShowControls: { type: 'boolean', description: 'UI control flag', example: false },
            ManifestCode: { type: 'string', description: 'Manifest code from Tasoko', example: '' },
            CollectionCode: { type: 'string', description: 'Collection code from Tasoko', example: '' },
            Description: { type: 'string', description: 'Description from Tasoko', example: 'Merchandise from Amazon' },
            HSCode: { type: 'string', description: 'HS tariff code', example: '' },
            Unknown: { type: 'boolean', description: 'Unknown package flag', example: false },
            AIProcessed: { type: 'boolean', description: 'AI processing status', example: false },
            OriginalHouseNumber: { type: 'string', description: 'Original tracking', example: '' },
            Cubes: { type: 'number', description: 'Volume in cubic units', example: 0 },
            Length: { type: 'number', description: 'Length from Tasoko', example: 0 },
            Width: { type: 'number', description: 'Width from Tasoko', example: 0 },
            Height: { type: 'number', description: 'Height from Tasoko', example: 0 },
            Pieces: { type: 'number', description: 'Number of pieces', example: 1 },
            Discrepancy: { type: 'boolean', description: 'Discrepancy flag', example: false },
            DiscrepancyDescription: { type: 'string', description: 'Discrepancy description', example: '' },
            ServiceTypeID: { type: 'string', description: 'Service type ID from Tasoko spec', example: '' },
            HazmatCodeID: { type: 'string', description: 'Hazmat code ID from Tasoko spec', example: '' },
            Coloaded: { type: 'boolean', description: 'Co-loading flag', example: false },
            ColoadIndicator: { type: 'string', description: 'Co-load indicator', example: '' },
            controlNumber: { type: 'string', example: 'EP0096513' },
            entryStaff: { type: 'string', example: 'warehouse_staff_01' },
            branch: { type: 'string', example: 'Down Town' },
            pieces: { type: 'number', example: 1 },
            cubes: { type: 'number', example: 0.15 }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'An error occurred' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        Manifest: {
          type: 'object',
          required: ['manifestNumber', 'warehouseId'],
          properties: {
            manifestNumber: { type: 'string', example: 'MAN-2024-001' },
            warehouseId: { type: 'string', example: '64a1b2c3d4e5f6789012345' },
            driverId: { type: 'string', example: '64a1b2c3d4e5f6789012346' },
            vehicleInfo: {
              type: 'object',
              properties: {
                make: { type: 'string', example: 'Ford' },
                model: { type: 'string', example: 'Transit' },
                licensePlate: { type: 'string', example: 'ABC-1234' },
                color: { type: 'string', example: 'White' }
              }
            },
            route: {
              type: 'object',
              properties: {
                startLocation: { type: 'string', example: 'Warehouse - New York' },
                endLocation: { type: 'string', example: 'Distribution Center - Boston' },
                stops: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      address: { type: 'string', example: '123 Main St, New York, NY' },
                      coordinates: {
                        type: 'object',
                        properties: {
                          lat: { type: 'number', example: 40.7128 },
                          lng: { type: 'number', example: -74.0060 }
                        }
                      },
                      estimatedTime: { type: 'string', format: 'date-time', example: '2024-02-15T10:00:00Z' },
                      actualTime: { type: 'string', format: 'date-time', example: '2024-02-15T10:15:00Z' },
                      packages: { type: 'array', items: { type: 'string' } }
                    }
                  }
                }
              }
            },
            packages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  packageId: { type: 'string', example: '64a1b2c3d4e5f6789012347' },
                  trackingNumber: { type: 'string', example: 'TRK123456789' },
                  status: { type: 'string', enum: ['pending', 'delivered', 'failed', 'returned'], example: 'pending' },
                  notes: { type: 'string', example: 'Customer not available' }
                }
              }
            },
            status: { type: 'string', enum: ['draft', 'in-progress', 'completed', 'cancelled'], example: 'draft' },
            scheduledDate: { type: 'string', format: 'date-time', example: '2024-02-15T09:00:00Z' },
            startedAt: { type: 'string', format: 'date-time', example: '2024-02-15T09:30:00Z' },
            completedAt: { type: 'string', format: 'date-time', example: '2024-02-15T17:00:00Z' },
            totalPackages: { type: 'number', example: 15 },
            deliveredPackages: { type: 'number', example: 12 },
            notes: { type: 'string', example: 'Route completed with 3 failed deliveries' },
            createdBy: { type: 'string', example: '64a1b2c3d4e5f6789012348' }
          }
        },
        Warehouse: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'NYC' },
            name: { type: 'string', example: 'New York Distribution Center' },
            address: { type: 'string', example: '123 Warehouse Blvd' },
            city: { type: 'string', example: 'New York' },
            state: { type: 'string', example: 'NY' },
            zipCode: { type: 'string', example: '10001' },
            country: { type: 'string', example: 'USA' },
            isActive: { type: 'boolean', example: true },
            isDefault: { type: 'boolean', example: true },
            airAddress: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Clean J Shipping - Air Freight' },
                street: { type: 'string', example: '456 Air Cargo Rd' },
                city: { type: 'string', example: 'New York' },
                state: { type: 'string', example: 'NY' },
                zipCode: { type: 'string', example: '10001' },
                country: { type: 'string', example: 'USA' },
                phone: { type: 'string', example: '+1-555-123-4567' },
                email: { type: 'string', example: 'air@cleanjshipping.com' },
                instructions: { type: 'string', example: 'Please arrive 30 minutes before flight departure' }
              }
            },
            seaAddress: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Clean J Shipping - Sea Freight' },
                street: { type: 'string', example: '789 Port Authority Blvd' },
                city: { type: 'string', example: 'New York' },
                state: { type: 'string', example: 'NY' },
                zipCode: { type: 'string', example: '10001' },
                country: { type: 'string', example: 'USA' },
                phone: { type: 'string', example: '+1-555-987-6543' },
                email: { type: 'string', example: 'sea@cleanjshipping.com' },
                instructions: { type: 'string', example: 'Bring bill of lading and identification' }
              }
            },
            chinaAddress: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Clean J Shipping - China Office' },
                street: { type: 'string', example: '123 Beijing Road' },
                city: { type: 'string', example: 'Shanghai' },
                state: { type: 'string', example: 'Shanghai' },
                zipCode: { type: 'string', example: '200000' },
                country: { type: 'string', example: 'China' },
                phone: { type: 'string', example: '+86-21-1234-5678' },
                email: { type: 'string', example: 'china@cleanjshipping.com' },
                instructions: { type: 'string', example: 'Please call ahead for appointment' }
              }
            }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Admin', description: 'Admin-only management endpoints' },
      { name: 'Admin API Keys', description: 'API key management for KCD integration' },
      { name: 'Warehouse', description: 'Warehouse management endpoints' },
      { name: 'Customer', description: 'Customer-facing endpoints' },
      { name: 'KCD API', description: 'KCD Logistics integration endpoints — authenticated via X-KCD-API-Key header' },
      { name: 'Health', description: 'API health check' }
    ],
    paths: {
      // ─── HEALTH ───────────────────────────────────────────────────────────
      '/health': {
        get: {
          summary: 'Server health check',
          tags: ['Health'],
          security: [],
          responses: {
            200: {
              description: 'Server is running',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
            }
          }
        }
      },

      // ─── AUTHENTICATION ───────────────────────────────────────────────────
      '/api/auth/register': {
        post: {
          summary: 'Register a new user',
          tags: ['Authentication'],
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Register' },
                example: {
                  firstName: 'John', lastName: 'Doe',
                  email: 'john@example.com', password: 'Password123!',
                  phone: '+1234567890', role: 'customer',
                  branch: 'Down Town',
                  address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'USA'
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'User registered successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            400: { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/auth/login': {
        post: {
          summary: 'Login (all roles)',
          tags: ['Authentication'],
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Login' },
                example: { email: 'user@example.com', password: 'Password123!' }
              }
            }
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  example: {
                    success: true, message: 'Login successful',
                    data: { token: 'eyJhbGci...', user: { id: '...', email: 'user@example.com', role: 'customer', userCode: 'CLEAN-0001' } }
                  }
                }
              }
            },
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },

      // ─── ADMIN ────────────────────────────────────────────────────────────
      '/api/admin/customers': {
        get: {
          summary: 'Get all customers',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
            { in: 'query', name: 'q', schema: { type: 'string' }, description: 'Search by name, email or user code' }
          ],
          responses: {
            200: { description: 'Customers retrieved successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/admin/packages': {
        get: {
          summary: 'Get all packages',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['received', 'in_transit', 'delivered', 'pending', 'customs', 'returned'] } },
            { in: 'query', name: 'q', schema: { type: 'string' } }
          ],
          responses: {
            200: { description: 'Packages retrieved successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/admin/packages/{id}': {
        get: {
          summary: 'Get package by ID',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Package ID' }],
          responses: {
            200: { description: 'Package retrieved successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            404: { description: 'Package not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        },
        put: {
          summary: 'Update package',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Package ID' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Package' },
                description: 'All package fields can be updated. Only include fields you want to change.'
              }
            }
          },
          responses: {
            200: { description: 'Package updated successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            400: { description: 'Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Package not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        },
        delete: {
          summary: 'Delete package',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Package ID' }],
          responses: {
            200: { description: 'Package deleted successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            404: { description: 'Package not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/admin/customers/{id}': {
        get: {
          summary: 'Get customer by ID',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Customer ID' }],
          responses: {
            200: {
              description: 'Customer retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiResponse' },
                  example: {
                    success: true,
                    data: {
                      id: '699ccdef21cd479ae3fc882e',
                      userCode: 'CLEAN-0001',
                      firstName: 'John',
                      lastName: 'Doe',
                      email: 'john.doe@example.com',
                      phone: '+1234567890',
                      role: 'customer',
                      mailboxNumber: 'CLEAN-0001',
                      accountStatus: 'active',
                      emailVerified: true,
                      address: {
                        street: '123 Main St',
                        city: 'New York',
                        state: 'NY',
                        zipCode: '10001',
                        country: 'USA'
                      },
                      createdAt: '2024-01-15T10:30:00Z',
                      updatedAt: '2024-02-10T14:30:00Z'
                    }
                  }
                }
              }
            },
            404: { description: 'Customer not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        },
        put: {
          summary: 'Update customer',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Customer ID' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
                description: 'All customer fields can be updated. Only include fields you want to change.',
                example: {
                  firstName: 'John',
                  lastName: 'Smith',
                  phone: '+1234567890',
                  address: {
                    street: '456 Updated St',
                    city: 'Boston',
                    state: 'MA',
                    zipCode: '02101',
                    country: 'USA'
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Customer updated successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiResponse' },
                  example: {
                    success: true,
                    message: 'Customer updated successfully',
                    data: {
                      id: '699ccdef21cd479ae3fc882e',
                      userCode: 'CLEAN-0001',
                      firstName: 'John',
                      lastName: 'Smith',
                      email: 'john.doe@example.com',
                      phone: '+1234567890',
                      address: {
                        street: '456 Updated St',
                        city: 'Boston',
                        state: 'MA',
                        zipCode: '02101',
                        country: 'USA'
                      },
                      updatedAt: '2024-02-14T16:45:00Z'
                    }
                  }
                }
              }
            },
            400: { description: 'Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Customer not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        },
        delete: {
          summary: 'Delete customer',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Customer ID' }],
          responses: {
            200: {
              description: 'Customer deleted successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiResponse' },
                  example: {
                    success: true,
                    message: 'Customer deleted successfully',
                    data: {
                      id: '699ccdef21cd479ae3fc882e',
                      deleted: true
                    }
                  }
                }
              }
            },
            404: { description: 'Customer not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/admin/stats': {
        get: {
          summary: 'Get system statistics',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Statistics retrieved successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: {
                      users: { total: 150, customers: 130, staff: 20 },
                      packages: { total: 500, pending: 45, delivered: 400 },
                      inventory: { total: 300, lowStock: 12 }
                    }
                  }
                }
              }
            },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },

      // ─── WAREHOUSE PACKAGES ───────────────────────────────────────────────
      '/api/warehouse/packages': {
        get: {
          summary: 'Get all packages',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['received', 'in_transit', 'delivered', 'pending'] } },
            { in: 'query', name: 'userCode', schema: { type: 'string' } }
          ],
          responses: {
            200: { description: 'Packages retrieved successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        },
        post: {
          summary: 'Add new package',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Package' },
                example: {
                  trackingNumber: 'TRK123456789',
                  userCode: 'CLEAN-0001',
                  weight: 5.5,
                  dimensions: { length: 10, width: 5, height: 3, unit: 'cm' },
                  serviceMode: 'air',
                  status: 'received',
                  shipper: 'DHL',
                  description: 'Electronics package',
                  itemDescription: 'Laptop computer',
                  senderName: 'John Smith',
                  senderEmail: 'sender@example.com',
                  senderPhone: '+1234567890',
                  senderAddress: '123 Sender St, Sender City',
                  senderCountry: 'USA',
                  recipient: {
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    shippingId: 'SHIP001',
                    phone: '+0987654321',
                    address: '456 Recipient Ave, Recipient City'
                  },
                  warehouseLocation: 'New York Warehouse',
                  warehouseAddress: '789 Warehouse Blvd, NY',
                  location: 'In transit - New York',
                  estimatedDelivery: '2024-02-15T10:00:00Z',
                  customsRequired: false,
                  customsStatus: 'not_required',
                  shippingCost: 25.50,
                  totalAmount: 125.50,
                  paymentStatus: 'pending',
                  isFragile: false,
                  isHazardous: false,
                  requiresSignature: true,
                  specialInstructions: 'Handle with care',
                  notes: 'Customer requested expedited shipping',
                  courierCode: 'CLEAN',
                  customerCode: 'CLEAN-0001',
                  source: 'web',
                  controlNumber: 'EP0096513',
                  entryStaff: 'warehouse_staff_01',
                  branch: 'Down Town',
                  pieces: 1,
                  cubes: 0.15
                }
              }
            }
          },
          responses: {
            201: { description: 'Package created successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            400: { description: 'Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            409: { description: 'Tracking number already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/warehouse/packages/{id}': {
        get: {
          summary: 'Get package by ID',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Package details', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            404: { description: 'Package not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        },
        put: {
          summary: 'Update package',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Package' },
                example: {
                  // === REQUIRED FIELDS ===
                  "UserCode": "CLEAN-0007",
                  "Weight": 2.5,
                  
                  // === TASOKO API FIELDS (Primary) ===
                  "PackageID": "83383d43-a368-4fc1-a216-9e54e8ae7227",
                  "CourierID": "15fff123-f237-4571-b92a-ae69427d7a56",
                  "TrackingNumber": "DROPOFF-20240902-225642-547",
                  "ControlNumber": "EP0096513",
                  "FirstName": "Courtney",
                  "LastName": "Patterson",
                  "Shipper": "Amazon",
                  "EntryDate": "2024-09-02",
                  "EntryDateTime": "2024-09-02T21:55:51.1806146-05:00",
                  "Branch": "Down Town",
                  
                  // === OPTIONAL TASOKO FIELDS ===
                  "Description": "Merchandise from Amazon",
                  "ManifestCode": "",
                  "CollectionCode": "",
                  "HSCode": "",
                  "Unknown": false,
                  "AIProcessed": false,
                  "OriginalHouseNumber": "",
                  "Cubes": 0,
                  "Length": 25,
                  "Width": 18,
                  "Height": 12,
                  "Pieces": 2,
                  "Discrepancy": false,
                  "DiscrepancyDescription": "",
                  "ServiceTypeID": "",
                  "HazmatCodeID": "",
                  "Coloaded": false,
                  "ColoadIndicator": "",
                  
                  // === LEGACY FIELDS (Backward Compatible) ===
                  "trackingNumber": "TRK123456789012345",
                  "userCode": "CLEAN-0007",
                  "shipper": "Amazon",
                  "description": "Electronics package",
                  "itemDescription": "Laptop computer",
                  "serviceMode": "air",
                  "status": "received",
                  "dimensions": {
                    "length": 30,
                    "width": 20,
                    "height": 15,
                    "unit": "cm"
                  },
                  "senderName": "John Smith",
                  "senderEmail": "sender@example.com",
                  "senderPhone": "+1234567890",
                  "senderAddress": "123 Sender St, Sender City",
                  "senderCountry": "USA",
                  "recipient": {
                    "name": "Jane Doe",
                    "email": "jane@example.com",
                    "shippingId": "SHIP001",
                    "phone": "+0987654321",
                    "address": "456 Recipient Ave, Recipient City"
                  },
                  "isFragile": true,
                  "requiresSignature": true,
                  "customsRequired": false,
                  "customsStatus": "not_required",
                  "itemValue": 125.50,
                  "specialInstructions": "Handle with care",
                  "notes": "Customer requested expedited shipping"
                }
              }
            }
          },
          responses: {
            200: { description: 'Package updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            404: { description: 'Package not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        },
        delete: {
          summary: 'Delete package',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Package deleted successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            404: { description: 'Package not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/warehouse/customers': {
        get: {
          summary: 'Get all customers',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'q', schema: { type: 'string' } },
            { in: 'query', name: 'userCode', schema: { type: 'string' } }
          ],
          responses: {
            200: { description: 'Customers list', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } }
          }
        }
      },

      // ─── WAREHOUSE MANIFESTS ───────────────────────────────────────────────
      '/api/warehouse/manifests': {
        get: {
          summary: 'Get all manifests',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['draft', 'in-progress', 'completed', 'cancelled'] } },
            { in: 'query', name: 'warehouseId', schema: { type: 'string' } },
            { in: 'query', name: 'driverId', schema: { type: 'string' } }
          ],
          responses: {
            200: { description: 'Manifests retrieved successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        },
        post: {
          summary: 'Create new manifest',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Manifest' },
                example: {
                  manifestNumber: 'MAN-2024-001',
                  warehouseId: '64a1b2c3d4e5f6789012345',
                  driverId: '64a1b2c3d4e5f6789012346',
                  vehicleInfo: {
                    make: 'Ford',
                    model: 'Transit',
                    licensePlate: 'ABC-1234',
                    color: 'White'
                  },
                  route: {
                    startLocation: 'Warehouse - New York',
                    endLocation: 'Distribution Center - Boston',
                    stops: [
                      {
                        address: '123 Main St, New York, NY',
                        coordinates: { lat: 40.7128, lng: -74.0060 },
                        estimatedTime: '2024-02-15T10:00:00Z',
                        packages: ['64a1b2c3d4e5f6789012347', '64a1b2c3d4e5f6789012348']
                      },
                      {
                        address: '456 Oak Ave, Brooklyn, NY',
                        coordinates: { lat: 40.6782, lng: -73.9442 },
                        estimatedTime: '2024-02-15T11:30:00Z',
                        packages: ['64a1b2c3d4e5f6789012349']
                      }
                    ]
                  },
                  packages: [
                    { packageId: '64a1b2c3d4e5f6789012347', trackingNumber: 'TRK123456789', status: 'pending' },
                    { packageId: '64a1b2c3d4e5f6789012348', trackingNumber: 'TRK123456790', status: 'pending' },
                    { packageId: '64a1b2c3d4e5f6789012349', trackingNumber: 'TRK123456791', status: 'pending' }
                  ],
                  scheduledDate: '2024-02-15T09:00:00Z',
                  notes: 'Morning delivery route to Brooklyn and Manhattan'
                }
              }
            }
          },
          responses: {
            201: { description: 'Manifest created successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            400: { description: 'Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            409: { description: 'Manifest number already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/warehouse/manifests/{id}': {
        get: {
          summary: 'Get manifest by ID',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Manifest ID' }],
          responses: {
            200: { description: 'Manifest retrieved successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            404: { description: 'Manifest not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        },
        put: {
          summary: 'Update manifest',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Manifest ID' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Manifest' },
                description: 'All manifest fields can be updated. Only include fields you want to change.'
              }
            }
          },
          responses: {
            200: { description: 'Manifest updated successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            400: { description: 'Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Manifest not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        },
        delete: {
          summary: 'Delete manifest',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Manifest ID' }],
          responses: {
            200: { description: 'Manifest deleted successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            404: { description: 'Manifest not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/warehouse/manifests/{id}/start': {
        post: {
          summary: 'Start manifest delivery',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Manifest ID' }],
          responses: {
            200: { description: 'Manifest started successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            404: { description: 'Manifest not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            400: { description: 'Manifest cannot be started', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/warehouse/manifests/{id}/complete': {
        post: {
          summary: 'Complete manifest delivery',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Manifest ID' }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    notes: { type: 'string', example: 'Route completed successfully' },
                    deliveredPackages: { type: 'number', example: 12 }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Manifest completed successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            404: { description: 'Manifest not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            400: { description: 'Manifest cannot be completed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/warehouse/manifests/{id}/packages/{packageId}/deliver': {
        post: {
          summary: 'Mark package as delivered in manifest',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Manifest ID' },
            { in: 'path', name: 'packageId', required: true, schema: { type: 'string' }, description: 'Package ID' }
          ],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['delivered', 'failed', 'returned'], example: 'delivered' },
                    notes: { type: 'string', example: 'Customer received package' },
                    actualTime: { type: 'string', format: 'date-time', example: '2024-02-15T10:15:00Z' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Package delivery status updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            404: { description: 'Manifest or package not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            400: { description: 'Invalid status or action', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },

      // ─── WAREHOUSE MANAGEMENT ─────────────────────────────────────────────
      '/api/warehouse/addresses': {
        get: {
          summary: 'Get all warehouse addresses',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          description: 'Retrieve all warehouses with their complete address information including shipping method addresses',
          responses: {
            200: { 
              description: 'Warehouse addresses retrieved successfully', 
              content: { 
                'application/json': { 
                  schema: { $ref: '#/components/schemas/ApiResponse' },
                  example: {
                    success: true,
                    data: {
                      warehouses: [
                        {
                          id: '64a1b2c3d4e5f6789012345',
                          code: 'NYC',
                          name: 'New York Distribution Center',
                          isActive: true,
                          isDefault: true,
                          mainAddress: { street: '123 Warehouse Blvd', city: 'New York', state: 'NY', zipCode: '10001', country: 'USA' },
                          airAddress: { name: 'Clean J Shipping - Air Freight', street: '456 Air Cargo Rd', city: 'New York', state: 'NY', zipCode: '10001', country: 'USA', phone: '+1-555-123-4567', email: 'air@cleanjshipping.com', instructions: 'Please arrive 30 minutes before flight departure' },
                          seaAddress: { name: 'Clean J Shipping - Sea Freight', street: '789 Port Authority Blvd', city: 'New York', state: 'NY', zipCode: '10001', country: 'USA', phone: '+1-555-987-6543', email: 'sea@cleanjshipping.com', instructions: 'Bring bill of lading and identification' },
                          chinaAddress: { name: 'Clean J Shipping - China Office', street: '123 Beijing Road', city: 'Shanghai', state: 'Shanghai', zipCode: '200000', country: 'China', phone: '+86-21-1234-5678', email: 'china@cleanjshipping.com', instructions: 'Please call ahead for appointment' },
                          companyAbbreviation: 'CLEAN',
                          createdAt: '2024-01-01T00:00:00Z',
                          updatedAt: '2024-02-10T14:30:00Z'
                        }
                      ],
                      total: 1,
                      defaultWarehouse: 'NYC'
                    }
                  }
                } 
              } 
            },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/warehouse/addresses/{id}': {
        get: {
          summary: 'Get warehouse by ID',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Warehouse ID' }],
          responses: {
            200: { description: 'Warehouse retrieved successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            404: { description: 'Warehouse not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        },
        put: {
          summary: 'Update warehouse addresses',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Warehouse ID' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Warehouse' },
                description: 'Update warehouse information and shipping addresses. Only include fields you want to change.',
                example: {
                  name: 'New York Distribution Center',
                  mainAddress: { street: '123 Warehouse Blvd', city: 'New York', state: 'NY', zipCode: '10001', country: 'USA' },
                  airAddress: { name: 'Clean J Shipping - Air Freight', street: '456 Air Cargo Rd', city: 'New York', state: 'NY', zipCode: '10001', country: 'USA', phone: '+1-555-123-4567', email: 'air@cleanjshipping.com', instructions: 'Please arrive 30 minutes before flight departure' },
                  seaAddress: { name: 'Clean J Shipping - Sea Freight', street: '789 Port Authority Blvd', city: 'New York', state: 'NY', zipCode: '10001', country: 'USA', phone: '+1-555-987-6543', email: 'sea@cleanjshipping.com', instructions: 'Bring bill of lading and identification' },
                  chinaAddress: { name: 'Clean J Shipping - China Office', street: '123 Beijing Road', city: 'Shanghai', state: 'Shanghai', zipCode: '200000', country: 'China', phone: '+86-21-1234-5678', email: 'china@cleanjshipping.com', instructions: 'Please call ahead for appointment' },
                  isActive: true,
                  isDefault: true
                }
              }
            }
          },
          responses: {
            200: { description: 'Warehouse updated successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            400: { description: 'Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Warehouse not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/warehouse/addresses/{id}/air': {
        put: {
          summary: 'Update warehouse air address',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Warehouse ID' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'street', 'city', 'state', 'zipCode', 'country'],
                  properties: {
                    name: { type: 'string', example: 'Clean J Shipping - Air Freight' },
                    street: { type: 'string', example: '456 Air Cargo Rd' },
                    city: { type: 'string', example: 'New York' },
                    state: { type: 'string', example: 'NY' },
                    zipCode: { type: 'string', example: '10001' },
                    country: { type: 'string', example: 'USA' },
                    phone: { type: 'string', example: '+1-555-123-4567' },
                    email: { type: 'string', example: 'air@cleanjshipping.com' },
                    instructions: { type: 'string', example: 'Please arrive 30 minutes before flight departure' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Air address updated successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            400: { description: 'Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Warehouse not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/warehouse/addresses/{id}/sea': {
        put: {
          summary: 'Update warehouse sea address',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Warehouse ID' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'street', 'city', 'state', 'zipCode', 'country'],
                  properties: {
                    name: { type: 'string', example: 'Clean J Shipping - Sea Freight' },
                    street: { type: 'string', example: '789 Port Authority Blvd' },
                    city: { type: 'string', example: 'New York' },
                    state: { type: 'string', example: 'NY' },
                    zipCode: { type: 'string', example: '10001' },
                    country: { type: 'string', example: 'USA' },
                    phone: { type: 'string', example: '+1-555-987-6543' },
                    email: { type: 'string', example: 'sea@cleanjshipping.com' },
                    instructions: { type: 'string', example: 'Bring bill of lading and identification' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Sea address updated successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            400: { description: 'Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Warehouse not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/warehouse/addresses/{id}/china': {
        put: {
          summary: 'Update warehouse china address',
          tags: ['Warehouse'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Warehouse ID' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'street', 'city', 'state', 'zipCode', 'country'],
                  properties: {
                    name: { type: 'string', example: 'Clean J Shipping - China Office' },
                    street: { type: 'string', example: '123 Beijing Road' },
                    city: { type: 'string', example: 'Shanghai' },
                    state: { type: 'string', example: 'Shanghai' },
                    zipCode: { type: 'string', example: '200000' },
                    country: { type: 'string', example: 'China' },
                    phone: { type: 'string', example: '+86-21-1234-5678' },
                    email: { type: 'string', example: 'china@cleanjshipping.com' },
                    instructions: { type: 'string', example: 'Please call ahead for appointment' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'China address updated successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            400: { description: 'Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Warehouse not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },

      // ─── CUSTOMER ─────────────────────────────────────────────────────────
      '/api/customer/packages': {
        get: {
          summary: "Get customer's packages",
          tags: ['Customer'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['received', 'in_transit', 'delivered', 'pending', 'customs', 'returned', 'at_warehouse', 'processing', 'ready_for_pickup'] } }
          ],
          responses: {
            200: { description: 'Customer packages retrieved successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/customer/packages/{id}': {
        get: {
          summary: 'Get customer package by ID',
          tags: ['Customer'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Package ID' }],
          responses: {
            200: { description: 'Package retrieved successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            404: { description: 'Package not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/customer/packages/tracking/{trackingNumber}': {
        get: {
          summary: 'Track package by tracking number',
          tags: ['Customer'],
          security: [],
          parameters: [{ in: 'path', name: 'trackingNumber', required: true, schema: { type: 'string' }, example: 'TRK123456789' }],
          responses: {
            200: { description: 'Tracking information retrieved successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            404: { description: 'Package not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/customer/shipping-addresses': {
        get: {
          summary: 'Get warehouse shipping addresses',
          tags: ['Customer'],
          security: [],
          description: 'Retrieve all available warehouse shipping addresses for different shipping methods',
          responses: {
            200: { description: 'Shipping addresses retrieved successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } }
          }
        }
      },
      '/api/customer/profile': {
        get: {
          summary: 'Get customer profile',
          tags: ['Customer'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Profile data retrieved successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } }
          }
        },
        put: {
          summary: 'Update customer profile',
          tags: ['Customer'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
                description: 'All customer fields can be updated. Only include fields you want to change.',
                example: {
                  firstName: 'John',
                  lastName: 'Smith',
                  phone: '+1234567890',
                  address: { street: '456 Updated St', city: 'Boston', state: 'MA', zipCode: '02101', country: 'USA' }
                }
              }
            }
          },
          responses: {
            200: { description: 'Profile updated successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            400: { description: 'Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },

      // ─── ADMIN API KEYS ─────────────────────────────────────────────────
      '/api/admin/api-keys/kcd': {
        post: {
          summary: 'Create KCD API Key',
          // FIX: Updated description — generated key has NO prefix (plain 48-char alphanumeric)
          description: 'Generate a new plain API key (48-char alphanumeric, no prefix) for KCD Logistics integration. The key is shown ONCE — copy it immediately.',
          tags: ['Admin API Keys'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    courierCode: { type: 'string', default: 'CLEAN' },
                    expiresIn: { type: 'number', default: 365, description: 'Days until expiration' },
                    description: { type: 'string', default: 'KCD Logistics Integration API Key' }
                  }
                },
                example: {
                  courierCode: 'CLEAN',
                  expiresIn: 365,
                  description: 'KCD Logistics Integration API Key'
                }
              }
            }
          },
          responses: {
            201: { 
              description: 'API key created successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: '✅ KCD API key generated. Copy the key NOW — it will NOT be shown again.',
                    data: {
                      // FIX: Example token is plain 48-char alphanumeric — NO kcd_live_ prefix
                      apiKey: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4',
                      courierCode: 'CLEAN',
                      description: 'KCD Logistics Integration API Key',
                      expiresAt: '2025-01-15T10:30:00Z',
                      nextSteps: [
                        '1. Copy the apiKey value above (plain token, no prefix needed)',
                        '2. Go to https://pack.kcdlogistics.com',
                        '3. Admin → Couriers → CLEAN → Edit',
                        '4. Go to "Packing System API" tab',
                        '5. Paste the key into the "API Access Token" field as-is',
                        '6. Configure endpoints from GET /api/admin/api-keys/kcd-info'
                      ]
                    }
                  }
                }
              }
            },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/admin/api-keys/kcd-info': {
        get: {
          summary: 'Get KCD portal connection info',
          // FIX: Description updated — endpoints now use dynamic BASE_URL, not hardcoded localhost
          description: 'Returns all URLs and configuration steps to paste into KCD portal. Endpoint URLs reflect the current environment (production or development).',
          tags: ['Admin API Keys'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { 
              description: 'Connection info with all endpoint URLs',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: {
                      hasActiveKey: true,
                      activeKeyCount: 1,
                      kcdPortalConfiguration: {
                        portalUrl: 'https://pack.kcdlogistics.com/',
                        steps: [
                          'Login with: Username: CleanJShip, Password: CleanJ$h!p',
                          'Navigate to Admin → Couriers → CLEAN → Edit',
                          'Go to "Packing System API" tab',
                          'Paste API token (plain key, no prefix) into "API Access Token" field',
                          'Paste endpoint URLs below into the corresponding fields'
                        ],
                        // FIX: apiToken note clarified — plain token, no kcd_live_ prefix
                        apiToken: '✅ Use the plain key from POST /api/admin/api-keys/kcd (no prefix)',
                        // FIX: Endpoints use production BASE_URL, not hardcoded localhost
                        endpoints: {
                          getCustomers: `${getBaseUrl()}/api/kcd/customers`,
                          addPackage: `${getBaseUrl()}/api/kcd/packages/add`,
                          updatePackage: `${getBaseUrl()}/api/kcd/packages/{trackingNumber}`,
                          deletePackage: `${getBaseUrl()}/api/kcd/packages/{trackingNumber}/delete`,
                          updateManifest: `${getBaseUrl()}/api/kcd/packages/{trackingNumber}/manifest`,
                          packageDeletedWebhook: `${getBaseUrl()}/api/webhooks/kcd/package-deleted`,
                          manifestCreatedWebhook: `${getBaseUrl()}/api/webhooks/kcd/manifest-created`,
                          description: 'First 5 endpoints go in "Courier System API" tab. Last 2 go in "Packing System API" tab.'
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },

      // ─── KCD API ───────────────────────────────────────────────────────────
      '/api/kcd/customers': {
        get: {
          summary: 'Get Customers for KCD Courier',
          // FIX: Clarified auth — X-KCD-API-Key header with plain token (no Bearer prefix needed)
          description: 'Retrieve customers for authenticated courier. Authenticate using the X-KCD-API-Key header with your plain API key (generated via POST /api/admin/api-keys/kcd). Do NOT add a "Bearer" prefix.',
          tags: ['KCD API'],
          security: [{ kcdApiKeyAuth: [] }],
          parameters: [
            { in: 'query', name: 'courierCode', schema: { type: 'string' }, description: 'Filter by courier code (optional)' },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 }, description: 'Number of results to return' },
            { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 }, description: 'Number of results to skip' }
          ],
          responses: {
            200: {
              description: 'Customers retrieved successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: {
                      customers: [
                        {
                          userCode: 'CLEAN-0001',
                          firstName: 'John',
                          lastName: 'Doe',
                          email: 'john@example.com',
                          phone: '+1234567890',
                          address: '123 Main St',
                          mailboxNumber: 'CLEAN-0001'
                        }
                      ],
                      pagination: { total: 1, limit: 50, offset: 0, hasMore: false }
                    }
                  }
                }
              }
            },
            401: { description: 'Unauthorized - Invalid or missing X-KCD-API-Key header', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/kcd/packages': {
        get: {
          summary: 'Get All Packages for KCD Courier',
          description: 'Retrieve all packages for authenticated courier with filtering and pagination. Authenticate using X-KCD-API-Key header with your plain API key.',
          tags: ['KCD API'],
          security: [{ kcdApiKeyAuth: [] }],
          parameters: [
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 }, description: 'Number of packages to return' },
            { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 }, description: 'Number of packages to skip' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['received', 'in_transit', 'out_for_delivery', 'delivered', 'pending', 'customs', 'returned', 'at_warehouse', 'processing', 'ready_for_pickup'] }, description: 'Filter by package status' },
            { in: 'query', name: 'userCode', schema: { type: 'string' }, description: 'Filter by user code' },
            { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date' }, description: 'Filter by start date (YYYY-MM-DD)' },
            { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date' }, description: 'Filter by end date (YYYY-MM-DD)' }
          ],
          responses: {
            200: {
              description: 'Packages retrieved successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Packages retrieved successfully',
                    data: {
                      packages: [
                        {
                          PackageID: '69b1441f215c9cac726d7cb2',
                          CourierID: '69b1441f215c9cac726d7cb2',
                          TrackingNumber: 'TRK123456789012345',
                          ControlNumber: 'EP0096513',
                          UserCode: 'CLEAN-0007',
                          Weight: 2.5,
                          Shipper: 'Amazon',
                          EntryDate: '2024-03-11',
                          EntryDateTime: '2024-03-11T10:29:51.706Z',
                          Branch: 'Down Town',
                          Status: 'received',
                          Description: 'Electronics package',
                          Length: 30,
                          Width: 20,
                          Height: 15,
                          Pieces: 1,
                          Cubes: 0,
                          customer: {
                            id: '69a7644e2a309f17a7ff835d',
                            firstName: 'Veniece',
                            lastName: 'Davis',
                            email: 'veniecedavis18@gmail.com',
                            phone: '18764623318',
                            mailboxNumber: 'CLEAN-0007'
                          },
                          createdAt: '2024-03-11T10:29:51.722Z',
                          updatedAt: '2024-03-11T10:29:51.722Z'
                        }
                      ],
                      pagination: {
                        total: 1,
                        limit: 50,
                        offset: 0,
                        hasMore: false
                      }
                    }
                  }
                }
              }
            },
            401: { description: 'Unauthorized - Invalid API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/kcd/packages/add': {
        post: {
          summary: 'Add Package for KCD Courier',
          description: 'Add a new package to the warehouse system. Authenticate using the X-KCD-API-Key header with your plain API key. Only userCode is required — tracking number is auto-generated if omitted.',
          tags: ['KCD API'],
          security: [{ kcdApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Package' },
                example: {
                  trackingNumber: 'TRK123456789',
                  userCode: 'CLEAN-0001',
                  weight: 5.5,
                  dimensions: { length: 10, width: 5, height: 3, unit: 'cm' },
                  serviceMode: 'air',
                  status: 'received',
                  shipper: 'DHL',
                  description: 'Electronics package',
                  itemDescription: 'Laptop computer',
                  senderName: 'John Smith',
                  senderEmail: 'sender@example.com',
                  senderPhone: '+1234567890',
                  senderAddress: '123 Sender St, Sender City',
                  senderCountry: 'USA',
                  recipient: {
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    shippingId: 'SHIP001',
                    phone: '+0987654321',
                    address: '456 Recipient Ave, Recipient City'
                  },
                  warehouseLocation: 'New York Warehouse',
                  warehouseAddress: '789 Warehouse Blvd, NY',
                  location: 'In transit - New York',
                  estimatedDelivery: '2024-02-15T10:00:00Z',
                  customsRequired: false,
                  customsStatus: 'not_required',
                  shippingCost: 25.50,
                  totalAmount: 125.50,
                  paymentStatus: 'pending',
                  isFragile: false,
                  isHazardous: false,
                  requiresSignature: true,
                  specialInstructions: 'Handle with care',
                  notes: 'Customer requested expedited shipping',
                  entryDate: '2024-02-10T09:00:00Z',
                  itemValue: 125.50
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Package added successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Package added successfully',
                    data: {
                      trackingNumber: 'TRK123456789',
                      status: 'received',
                      customerCode: 'CLEAN-0001'
                    }
                  }
                }
              }
            },
            400: { description: 'Bad request - Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized - Invalid or missing X-KCD-API-Key header', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      // FIX: Changed path param from {id} (MongoDB ObjectId) to {trackingNumber}
      // This matches what KCD portal sends and what was discussed with the client
      '/api/kcd/packages/{trackingNumber}': {
        get: {
          summary: 'Get Package for KCD Courier',
          description: 'Retrieve a specific package by tracking number. Authenticate using X-KCD-API-Key header with your plain API key.',
          tags: ['KCD API'],
          security: [{ kcdApiKeyAuth: [] }],
          parameters: [
            { in: 'path', name: 'trackingNumber', required: true, schema: { type: 'string' }, description: 'Package tracking number (e.g. TRK123456789)', example: 'TRK123456789' }
          ],
          responses: {
            200: {
              description: 'Package retrieved successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Package retrieved successfully',
                    data: {
                      trackingNumber: 'TRK123456789012345',
                      userCode: 'CLEAN-0007',
                      customer: {
                        id: '69a7644e2a309f17a7ff835d',
                        firstName: 'Veniece',
                        lastName: 'Davis',
                        email: 'veniecedavis18@gmail.com',
                        phone: '18764623318',
                        mailboxNumber: 'CLEAN-0007'
                      },
                      status: 'received',
                      weight: 2.5,
                      dimensions: { length: 30, width: 20, height: 15, unit: 'cm' },
                      warehouseLocation: 'Main Warehouse',
                      dateReceived: '2024-03-11T10:29:51.706Z',
                      trackingHistory: [
                        {
                          timestamp: '2024-03-11T10:29:51.706Z',
                          status: 'received',
                          location: 'Warehouse',
                          description: 'Package received from CLEAN'
                        }
                      ],
                      createdAt: '2024-03-11T10:29:51.722Z',
                      updatedAt: '2024-03-11T10:29:51.722Z'
                    }
                  }
                }
              }
            },
            401: { description: 'Unauthorized - Invalid API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            403: { description: 'Forbidden - Package does not belong to this courier', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Package not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        },
        post: {
          summary: 'Update Package for KCD Courier',
          description: 'Update an existing package by tracking number. Authenticate using the X-KCD-API-Key header with your plain API key. All fields are optional — only include what you want to change.',
          tags: ['KCD API'],
          security: [{ kcdApiKeyAuth: [] }],
          parameters: [
            { in: 'path', name: 'trackingNumber', required: true, schema: { type: 'string' }, description: 'Package tracking number (e.g. TRK123456789)', example: 'TRK123456789' }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    weight: { type: 'number', example: 5.5 },
                    dimensions: {
                      type: 'object',
                      properties: {
                        length: { type: 'number', example: 10 },
                        width: { type: 'number', example: 5 },
                        height: { type: 'number', example: 3 },
                        unit: { type: 'string', enum: ['cm', 'in'], example: 'cm' }
                      }
                    },
                    serviceMode: { type: 'string', enum: ['air', 'ocean', 'local'], example: 'air' },
                    status: { type: 'string', enum: ['received', 'in_transit', 'out_for_delivery', 'delivered', 'pending', 'customs', 'returned', 'at_warehouse', 'processing', 'ready_for_pickup'], example: 'in_transit' },
                    shipper: { type: 'string', example: 'DHL' },
                    description: { type: 'string', example: 'Electronics package' },
                    itemDescription: { type: 'string', example: 'Laptop computer' },
                    senderName: { type: 'string', example: 'John Smith' },
                    senderEmail: { type: 'string', example: 'sender@example.com' },
                    senderPhone: { type: 'string', example: '+1234567890' },
                    senderAddress: { type: 'string', example: '123 Sender St, Sender City' },
                    senderCountry: { type: 'string', example: 'USA' },
                    recipient: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', example: 'Jane Doe' },
                        email: { type: 'string', example: 'jane@example.com' },
                        shippingId: { type: 'string', example: 'SHIP001' },
                        phone: { type: 'string', example: '+0987654321' },
                        address: { type: 'string', example: '456 Recipient Ave, Recipient City' }
                      }
                    },
                    warehouseLocation: { type: 'string', example: 'New York Warehouse' },
                    warehouseAddress: { type: 'string', example: '789 Warehouse Blvd, NY' },
                    location: { type: 'string', example: 'In transit - New York' },
                    estimatedDelivery: { type: 'string', format: 'date-time', example: '2024-02-15T10:00:00Z' },
                    customsRequired: { type: 'boolean', example: false },
                    customsStatus: { type: 'string', enum: ['not_required', 'pending', 'cleared'], example: 'not_required' },
                    shippingCost: { type: 'number', example: 25.50 },
                    totalAmount: { type: 'number', example: 125.50 },
                    paymentStatus: { type: 'string', enum: ['pending', 'paid', 'partially_paid'], example: 'pending' },
                    isFragile: { type: 'boolean', example: false },
                    isHazardous: { type: 'boolean', example: false },
                    requiresSignature: { type: 'boolean', example: true },
                    specialInstructions: { type: 'string', example: 'Handle with care' },
                    notes: { type: 'string', example: 'Customer requested expedited shipping' },
                    entryDate: { type: 'string', format: 'date-time', example: '2024-02-10T09:00:00Z' },
                    itemValue: { type: 'number', example: 125.50 }
                  }
                },
                example: {
                  status: 'in_transit',
                  location: 'In transit - New York',
                  weight: 5.5,
                  shipper: 'DHL'
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Package updated successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Package updated successfully',
                    data: {
                      trackingNumber: 'TRK123456789',
                      status: 'in_transit',
                      location: 'In transit - New York'
                    }
                  }
                }
              }
            },
            400: { description: 'Bad request - Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Package not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized - Invalid or missing X-KCD-API-Key header', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/kcd/packages/{trackingNumber}/delete': {
        post: {
          summary: 'Delete Package for KCD Courier',
          description: 'Delete a package from the warehouse system by tracking number. Authenticate using the X-KCD-API-Key header with your plain API key.',
          tags: ['KCD API'],
          security: [{ kcdApiKeyAuth: [] }],
          parameters: [
            { in: 'path', name: 'trackingNumber', required: true, schema: { type: 'string' }, description: 'Package tracking number to delete', example: 'TRK123456789' }
          ],
          responses: {
            200: {
              description: 'Package deleted successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Package deleted successfully',
                    data: { trackingNumber: 'TRK123456789', deleted: true }
                  }
                }
              }
            },
            404: { description: 'Package not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            400: { description: 'Bad request - Missing tracking number', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized - Invalid or missing X-KCD-API-Key header', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/kcd/packages/{trackingNumber}/manifest': {
        post: {
          summary: 'Update Manifest for KCD Courier',
          description: 'Update an existing manifest in the warehouse system. Authenticate using the X-KCD-API-Key header with your plain API key.',
          tags: ['KCD API'],
          security: [{ kcdApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Manifest' },
                description: 'All manifest fields can be updated. Only include fields you want to change.',
                example: {
                  manifestNumber: 'MAN-2024-001',
                  status: 'in-progress',
                  startedAt: '2024-02-15T09:30:00Z',
                  packages: [
                    { packageId: '64a1b2c3d4e5f6789012347', trackingNumber: 'TRK123456789', status: 'delivered', notes: 'Customer received package' },
                    { packageId: '64a1b2c3d4e5f6789012348', trackingNumber: 'TRK123456790', status: 'pending' }
                  ],
                  deliveredPackages: 1,
                  notes: 'First delivery completed, continuing route'
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Manifest updated successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Manifest updated successfully',
                    data: { manifestNumber: 'MAN-2024-001', status: 'in-progress', deliveredPackages: 1 }
                  }
                }
              }
            },
            400: { description: 'Bad request - Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Manifest not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            401: { description: 'Unauthorized - Invalid or missing X-KCD-API-Key header', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      }
    }
  },
  apis: []
};

const specs = swaggerJsdoc(options);

export { specs };