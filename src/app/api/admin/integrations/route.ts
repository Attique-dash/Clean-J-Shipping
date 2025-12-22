import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Integration } from "@/models/Integration";
import { getAuthFromRequest } from "@/lib/rbac";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const isActive = url.searchParams.get("isActive");

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (isActive !== null) filter.isActive = isActive === "true";

    const integrations = await Integration.find(filter)
      .sort({ type: 1, name: 1 })
      .lean();

    // Remove sensitive credentials from response
    const sanitized = integrations.map((integration) => ({
      ...integration,
      credentials: integration.credentials ? { masked: true } : undefined,
      webhookSecret: integration.webhookSecret ? "***" : undefined,
    }));

    return NextResponse.json({ integrations: sanitized });
  } catch (error) {
    console.error("Integrations GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { name, type, provider, config, credentials, webhookUrl, webhookSecret, testMode } = body;

    if (!name || !type || !provider) {
      return NextResponse.json(
        { error: "Name, type, and provider are required" },
        { status: 400 }
      );
    }

    const adminId = payload._id || payload.id || payload.uid;

    const integration = await Integration.create({
      name,
      type,
      provider,
      config: config || {},
      credentials: credentials || {},
      webhookUrl,
      webhookSecret,
      testMode: testMode || false,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    return NextResponse.json(
      {
        success: true,
        integration: {
          ...integration.toObject(),
          credentials: integration.credentials ? { masked: true } : undefined,
          webhookSecret: integration.webhookSecret ? "***" : undefined,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Integrations POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create integration" },
      { status: 500 }
    );
  }
}

