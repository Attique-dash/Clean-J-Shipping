import { NextResponse } from "next/server";

const API_DOCS = {
  health: {
    GET: {
      description: "Health check endpoint",
      url: "/api/health",
      method: "GET",
      response: {
        ok: true,
        time: "2023-10-10T15:36:39.000Z"
      }
    }
  },
  auth: {
    login: {
      POST: {
        description: "User login",
        url: "/api/auth/login",
        method: "POST",
        request: {
          email: "user@example.com",
          password: "yourpassword"
        },
        response: {
          token: "jwt.token.here",
          user: {
            id: "user_123",
            email: "user@example.com",
            role: "customer"
          }
        }
      }
    },
    register: {
      POST: {
        description: "Register new user",
        url: "/api/auth/register",
        method: "POST",
        request: {
          name: "John Doe",
          email: "newuser@example.com",
          password: "securepassword123",
          phone: "+1234567890"
        },
        response: {
          id: "user_123",
          email: "newuser@example.com",
          name: "John Doe"
        }
      }
    }
  },
  customer: {
    packages: {
      GET: {
        description: "Get customer's packages",
        url: "/api/customer/packages",
        method: "GET",
        headers: {
          "Authorization": "Bearer your.jwt.token.here"
        },
        response: [
          {
            id: "pkg_123",
            trackingNumber: "T123456789",
            status: "in_transit",
            estimatedDelivery: "2023-10-15"
          }
        ]
      }
    }
  },
  admin: {
    customers: {
      GET: {
        description: "List all customers (Admin only)",
        url: "/api/admin/customers",
        method: "GET",
        headers: {
          "Authorization": "Bearer admin.jwt.token.here"
        },
        queryParams: {
          page: 1,
          limit: 10,
          search: "john"
        },
        response: {
          data: [
            {
              id: "user_123",
              name: "John Doe",
              email: "john@example.com",
              status: "active"
            }
          ],
          total: 1,
          page: 1,
          pages: 1
        }
      }
    }
  },
  warehouse: {
    packages: {
      POST: {
        description: "Add/update package (Warehouse API)",
        url: "/api/warehouse/packages/add",
        method: "POST",
        headers: {
          "x-warehouse-key": "your_warehouse_api_key"
        },
        request: {
          trackingNumber: "T123456789",
          status: "in_transit",
          customerId: "user_123"
        },
        response: {
          success: true,
          message: "Package updated successfully",
          packageId: "pkg_123"
        }
      }
    }
  }
};

export async function GET() {
  return NextResponse.json(API_DOCS);
}
