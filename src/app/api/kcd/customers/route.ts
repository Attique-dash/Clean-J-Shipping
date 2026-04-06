// src/app/api/kcd/customers/route.ts
// KCD Logistics endpoint to fetch customer list

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { validateApiKey } from "@/lib/api-key-validation";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();

  console.log(`[KCD Customers ${requestId}] Received GET request at ${timestamp}`);

  try {
    const apiKey = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("apiKey");
    
    // Validate API key using new validation function
    const validation = await validateApiKey(apiKey);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Unauthorized - ${validation.error}` },
        { status: 401 }
      );
    }

    await dbConnect();

    const users = await User.find({
      role: { $in: ["customer", "user"] }
    }).select("firstName lastName email userCode phone address").lean();

    const customers = users.map((user) => ({
      id: user._id?.toString(),
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Customer",
      email: user.email,
      phone: user.phone || null,
      mailboxCode: user.userCode?.startsWith("CLEAN-") 
        ? user.userCode 
        : `CLEAN-${user.userCode}`,
      rawUserCode: user.userCode,
      address: user.address || null,
      createdAt: user.createdAt,
    }));

    return NextResponse.json({
      success: true,
      count: customers.length,
      customers,
      timestamp,
    }, { status: 200 });

  } catch (error) {
    console.error(`[KCD Customers ${requestId}] Error:`, error);
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500 }
    );
  }
}
