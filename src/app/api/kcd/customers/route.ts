// src/app/api/kcd/customers/route.ts
// KCD Logistics endpoint — returns PascalCase customer array (KCD/Tasoko format)

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { validateApiKey } from "@/lib/api-key-validation";
import { toKcdCustomerArray } from "@/lib/kcd-customer-format";
import { kcdErrorResponse } from "@/lib/kcd-api-response";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const apiKey =
      req.headers.get("x-api-key") || req.nextUrl.searchParams.get("apiKey");

    const validation = await validateApiKey(apiKey, null);
    if (!validation.valid) {
      return kcdErrorResponse(
        `Unauthorized - ${validation.error}`,
        401,
        { error: validation.error }
      );
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
