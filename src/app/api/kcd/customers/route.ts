// src/app/api/kcd/customers/route.ts
// KCD Logistics endpoint — returns PascalCase customer array (KCD/Tasoko format)

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { validateKcdRequest, kcdUnauthorizedResponse } from "@/lib/kcd-auth";
import { toKcdCustomerArray } from "@/lib/kcd-customer-format";
import { kcdErrorResponse } from "@/lib/kcd-api-response";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

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
      .select(
        "firstName lastName email userCode phone address branch createdAt"
      )
      .lean();

    const customers = toKcdCustomerArray(
      users as Parameters<typeof toKcdCustomerArray>[0]
    );

    return NextResponse.json(customers, { status: 200 });
  } catch (error) {
    console.error(`[KCD Customers ${requestId}] Error:`, error);
    return kcdErrorResponse("Internal server error", 500, { requestId });
  }
}

/** Tasoko/Askenish proxy may POST to the same URL as GET customers. */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    let parsedBody: unknown;
    try {
      const text = await req.text();
      parsedBody = text ? JSON.parse(text) : undefined;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Bad Request',
          error: 'Request body must be valid JSON when using POST',
          errorCode: 'KCD_INVALID_JSON',
        },
        { status: 400 }
      );
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
      .select(
        "firstName lastName email userCode phone address branch createdAt"
      )
      .lean();

    const customers = toKcdCustomerArray(
      users as Parameters<typeof toKcdCustomerArray>[0]
    );

    return NextResponse.json(customers, { status: 200 });
  } catch (error) {
    console.error(`[KCD Customers POST ${requestId}] Error:`, error);
    return kcdErrorResponse("Internal server error", 500, { requestId });
  }
}
