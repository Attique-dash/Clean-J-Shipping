// src/app/api/tasoko/customers/route.ts
// Tasoko Packing API — Get Customer Endpoint (REQUIRED)
// URL: https://cleanjshipping.com/api/tasoko/customers?id=APITOKEN
// Method: GET
// Response: [{UserCode, FirstName, LastName, Branch, CustomerServiceTypeID, CustomerLevelInstructions, CourierServiceTypeID, CourierLevelInstructions}]

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { validateKcdRequest, kcdUnauthorizedResponse } from "@/lib/kcd-auth";
import { kcdErrorResponse } from "@/lib/kcd-api-response";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

// Service Type IDs from Tasoko API doc
const SERVICE_TYPE_IDS: Record<string, string> = {
  '59cadcd4-7508-450b-85aa-9ec908d168fe': 'AIR STANDARD',
  '25a1d8e5-a478-4cc3-b1fd-a37d0d787302': 'AIR EXPRESS',
  '8df142ca-0573-4ce9-b11d-7a3e5f8ba196': 'AIR PREMIUM',
  '7c9638e8-4bb3-499e-8af9-d09f757a099e': 'SEA STANDARD',
};

/**
 * GET /api/tasoko/customers?id=APITOKEN
 * Returns customer list in exact Tasoko Packing API format
 */
export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const validation = await validateKcdRequest(req);
    if (!validation.valid) {
      return NextResponse.json(kcdUnauthorizedResponse(validation), {
        status: 401,
      });
    }

    await dbConnect();

    const users = await User.find({
      role: { $in: ["customer", "user"] },
    })
      .select("firstName lastName email userCode phone address branch serviceTypeIDs createdAt")
      .lean();

    // Map to exact Tasoko API response format
    const customers = users.map((user: any) => {
      const rawCode = (user.userCode || '').trim().toUpperCase();
      const cleanCode = rawCode.replace(/[^A-Z0-9]/g, '');
      const userCode = cleanCode.startsWith('CLEAN')
        ? cleanCode
        : cleanCode
          ? `CLEAN${cleanCode.replace(/^CLEAN/i, '')}`
          : '';

      return {
        UserCode: cleanCode || userCode || rawCode,
        FirstName: user.firstName || '',
        LastName: user.lastName || '',
        Branch: user.branch || 'Kingston',
        CustomerServiceTypeID: user.serviceTypeIDs?.customer || '',
        CustomerLevelInstructions: '',
        CourierServiceTypeID: user.serviceTypeIDs?.courier || '',
        CourierLevelInstructions: '',
      };
    });

    console.log(`[Tasoko Customers ${requestId}] Returned ${customers.length} customers`);
    return NextResponse.json(customers, { status: 200 });
  } catch (error) {
    console.error(`[Tasoko Customers ${requestId}] Error:`, error);
    return kcdErrorResponse("Internal server error", 500, { requestId });
  }
}

/**
 * POST /api/tasoko/customers
 * Some Tasoko proxies POST instead of GET — returns same customer list
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    let parsedBody: unknown;
    try {
      const text = await req.text();
      parsedBody = text ? JSON.parse(text) : undefined;
    } catch {
      // Ignore bad JSON — still try to return customers
    }

    const validation = await validateKcdRequest(req, parsedBody);
    if (!validation.valid) {
      return NextResponse.json(kcdUnauthorizedResponse(validation), {
        status: 401,
      });
    }

    await dbConnect();

    const users = await User.find({
      role: { $in: ["customer", "user"] },
    })
      .select("firstName lastName email userCode phone address branch serviceTypeIDs createdAt")
      .lean();

    const customers = users.map((user: any) => {
      const rawCode = (user.userCode || '').trim().toUpperCase();
      const cleanCode = rawCode.replace(/[^A-Z0-9]/g, '');
      const userCode = cleanCode.startsWith('CLEAN')
        ? cleanCode
        : cleanCode
          ? `CLEAN${cleanCode.replace(/^CLEAN/i, '')}`
          : '';

      return {
        UserCode: cleanCode || userCode || rawCode,
        FirstName: user.firstName || '',
        LastName: user.lastName || '',
        Branch: user.branch || 'Kingston',
        CustomerServiceTypeID: user.serviceTypeIDs?.customer || '',
        CustomerLevelInstructions: '',
        CourierServiceTypeID: user.serviceTypeIDs?.courier || '',
        CourierLevelInstructions: '',
      };
    });

    console.log(`[Tasoko Customers POST ${requestId}] Returned ${customers.length} customers`);
    return NextResponse.json(customers, { status: 200 });
  } catch (error) {
    console.error(`[Tasoko Customers POST ${requestId}] Error:`, error);
    return kcdErrorResponse("Internal server error", 500, { requestId });
  }
}
