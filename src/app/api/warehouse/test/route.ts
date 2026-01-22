import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { ApiKey } from "@/models/ApiKey";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("id") || "";

  try {
    await dbConnect();

    // Special handling for test key
    let keyRecord;
    if (token === "wh_test_abc123") {
      // Look up the test key by its prefix
      keyRecord = await ApiKey.findOne({
        keyPrefix: "wh_test_abc123",
        active: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      }).select("keyPrefix permissions name createdAt");
    } else if (token.startsWith("wh_live_") || token.startsWith("wh_test_")) {
      // For other keys, you would need the full key to hash and verify
      return NextResponse.json({ error: "Use wh_test_abc123 for testing" }, { status: 401 });
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!keyRecord) {
      return NextResponse.json({ error: "API key not found or inactive" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: "API key is valid",
      keyInfo: {
        keyPrefix: keyRecord.keyPrefix,
        name: keyRecord.name,
        permissions: keyRecord.permissions,
        createdAt: keyRecord.createdAt,
      },
      testEndpoints: [
        "GET /api/warehouse/test?id=wh_test_abc123 (this endpoint)",
        "GET /api/warehouse/pullcustomer/subdir?id=wh_test_abc123",
        "GET /api/warehouse/packages?id=wh_test_abc123",
        "GET /api/warehouse/inventory?id=wh_test_abc123",
      ]
    });

  } catch (error) {
    console.error("Test endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
