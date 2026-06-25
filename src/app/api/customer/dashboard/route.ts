// src/app/api/customer/dashboard/route.ts
// Aggregated dashboard stats - fetches all data in parallel server-side
// This replaces 7 sequential client-side API calls with 1 efficient endpoint

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { Package } from "@/models/Package";
import { Bill } from "@/models/Bill";
import { Message } from "@/models/Message";
import { PreAlert } from "@/models/PreAlert";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const p = payload as { id?: string; _id?: string; uid?: string; userCode?: string };
    const userId = p.id || p._id || p.uid;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const userObjectId = new Types.ObjectId(userId);

    // Get user info (for userCode and shipping addresses)
    const userDoc = await User.findById(userId)
      .select("userCode firstName lastName email phone shippingAddresses")
      .lean() as any;

    const userCode = userDoc?.userCode || p.userCode || "";

    // Build package query
    const packageQuery: any = {
      $or: [{ userId: userObjectId }, { userId: userId }],
    };
    if (userCode) {
      packageQuery.$or.push(
        { UserCode: userCode },
        { userCode: userCode },
        { customerCode: userCode }
      );
    }

    // Run ALL queries in PARALLEL - this is the key performance optimization
    const [packages, bills, messages, preAlerts, payments, invoicePackages] =
      await Promise.all([
        // 1. Packages count
        Package.countDocuments(packageQuery),

        // 2. Bills
        Bill.find({
          $or: [
            { userId: userObjectId },
            { userId: userId },
            ...(userCode ? [{ userCode }] : []),
          ],
        })
          .select("payment_status amount_due invoice_number tracking_number")
          .lean(),

        // 3. Messages (unread count)
        userCode
          ? Message.countDocuments({
              userCode,
              $or: [{ read: false }, { read: { $exists: false } }],
            })
          : Promise.resolve(0),

        // 4. Pre-alerts count
        userCode
          ? PreAlert.countDocuments({ userCode })
          : Promise.resolve(0),

        // 5. Payments count
        Payment.countDocuments({
          $or: [{ userId: userId }, { customer: userId }],
        }),

        // 6. Invoice upload - packages needing invoice
        Package.countDocuments({
          ...packageQuery,
          invoiceStatus: {
            $nin: ["submitted", "billed", "approved"],
          },
        }),
      ]);

    // Calculate wallet balance from unpaid bills
    const walletBalance = bills
      .filter(
        (b: any) =>
          b.payment_status === "submitted" ||
          b.payment_status === "none" ||
          !b.payment_status
      )
      .reduce((sum: number, b: any) => sum + (b.amount_due || 0), 0);

    // Pending bills count
    const pendingBills = bills.filter(
      (b: any) =>
        b.payment_status === "submitted" ||
        b.payment_status === "none" ||
        !b.payment_status
    ).length;

    // Always use correct KCD Logistics warehouse addresses with user's mailbox code
    const airMailbox = userCode ? `AIR-${userCode}` : "";
    const seaMailbox = userCode ? `SEA-${userCode}` : "";
    const shippingAddresses = [
      {
        type: "air",
        street: "700 NW 57 Place",
        city: "Ft. Lauderdale",
        state: "Florida",
        zipCode: "33309",
        country: "USA",
        addressLine2: airMailbox,
      },
      {
        type: "sea",
        street: "700 NW 57 Place",
        city: "Ft. Lauderdale",
        state: "Florida",
        zipCode: "33309",
        country: "USA",
        addressLine2: seaMailbox,
      },
      {
        type: "china",
        street: "Baoshan No.2 Industrial Zone",
        city: "Shenzhen",
        state: "Guangdong Province",
        zipCode: "518000",
        country: "China",
        addressLine2: userCode || "",
      },
    ];

    return NextResponse.json({
      stats: {
        totalPackages: packages,
        pendingBills,
        unreadMessages: messages,
        walletBalance,
        preAlerts: preAlerts,
        payments,
        invoices: invoicePackages,
      },
      shippingAddresses,
    });
  } catch (error: unknown) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      {
        error: "Failed to load dashboard",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
