import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { PreAlert } from "@/models/PreAlert";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const payload = await getAuthFromRequest(req);
    if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const preAlert = await PreAlert.findById(params.id);
    if (!preAlert) {
      return NextResponse.json({ error: "Pre-alert not found" }, { status: 404 });
    }

    // Check if user owns this pre-alert (for customers)
    if (payload.role === "customer") {
      const userCode = payload.userCode as string | undefined;
      if (!userCode || preAlert.userCode !== userCode) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Update status
    preAlert.status = status;
    preAlert.decidedAt = new Date();
    await preAlert.save();

    return NextResponse.json({
      success: true,
      pre_alert: {
        _id: preAlert._id,
        status: preAlert.status,
        decidedAt: preAlert.decidedAt,
      },
    });
  } catch (error) {
    console.error("Pre-alert PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update pre-alert" },
      { status: 500 }
    );
  }
}

