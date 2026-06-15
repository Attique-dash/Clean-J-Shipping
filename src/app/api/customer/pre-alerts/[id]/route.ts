import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { PreAlert } from "@/models/PreAlert";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    const payload = await getAuthFromRequest(req);
    if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preAlert = await PreAlert.findById(id);
    if (!preAlert) {
      return NextResponse.json({ error: "Pre-alert not found" }, { status: 404 });
    }

    // Check if user owns this pre-alert
    if (payload.role === "customer" && preAlert.userCode !== payload.userCode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      pre_alert: {
        _id: preAlert._id,
        trackingNumber: preAlert.trackingNumber,
        carrier: preAlert.carrier,
        origin: preAlert.origin,
        expectedDate: preAlert.expectedDate,
        notes: preAlert.notes,
        status: preAlert.status,
        description: preAlert.description,
        pricePaid: preAlert.pricePaid,
        overseasCourier: preAlert.overseasCourier,
        merchant: preAlert.merchant,
        attachmentFile: preAlert.attachmentFile,
        createdAt: preAlert.createdAt,
        updatedAt: preAlert.updatedAt,
      },
    });
  } catch (error) {
    console.error("Pre-alert GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch pre-alert" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    const payload = await getAuthFromRequest(req);
    if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let formData: FormData | null = null;
    let body: any = {};

    // Handle both JSON and FormData
    if (contentType.includes("multipart/form-data")) {
      formData = await req.formData();
      body = {};
      formData.forEach((value, key) => {
        if (value instanceof File) {
          body[key] = value;
        } else {
          body[key] = value;
        }
      });
    } else {
      body = await req.json();
    }

    const preAlert = await PreAlert.findById(id);
    if (!preAlert) {
      return NextResponse.json({ error: "Pre-alert not found" }, { status: 404 });
    }

    // Check if user owns this pre-alert
    if (payload.role === "customer" && preAlert.userCode !== payload.userCode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin can update status, customer can update other fields
    if (payload.role === "admin" && body.status) {
      if (!["approved", "rejected"].includes(body.status)) {
        return NextResponse.json(
          { error: "Status must be 'approved' or 'rejected'" },
          { status: 400 }
        );
      }
      preAlert.status = body.status;
      preAlert.decidedBy = payload._id;
      preAlert.decidedAt = new Date();
    }

    // Customer can update these fields
    if (body.carrier !== undefined) preAlert.carrier = body.carrier;
    if (body.origin !== undefined) preAlert.origin = body.origin;
    if (body.expected_date !== undefined || body.expectedDate !== undefined) {
      const expectedDate = body.expected_date || body.expectedDate;
      preAlert.expectedDate = new Date(expectedDate);
    }
    if (body.notes !== undefined) preAlert.notes = body.notes;
    if (body.description !== undefined) preAlert.description = body.description;
    if (body.pricePaid !== undefined) preAlert.pricePaid = parseFloat(body.pricePaid);
    if (body.overseas_courier !== undefined || body.overseasCourier !== undefined) {
      preAlert.overseasCourier = body.overseas_courier || body.overseasCourier;
    }
    if (body.merchant !== undefined) preAlert.merchant = body.merchant;

    // Handle file upload
    if (body.file && body.file instanceof File) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "prealerts");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // Delete old file if exists
      if (preAlert.attachmentFile && preAlert.attachmentFile.path) {
        const oldPath = path.join(process.cwd(), "public", preAlert.attachmentFile.path);
        if (existsSync(oldPath)) {
          try {
            await unlink(oldPath);
          } catch (err) {
            console.error("Error deleting old file:", err);
          }
        }
      }

      const filename = `${Date.now()}-${body.file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filepath = path.join(uploadDir, filename);
      const bytes = await body.file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      await writeFile(filepath, buffer);

      preAlert.attachmentFile = {
        filename,
        originalName: body.file.name,
        mimetype: body.file.type,
        size: body.file.size,
        path: `/uploads/prealerts/${filename}`,
        url: `/uploads/prealerts/${filename}`,
      };
    }

    await preAlert.save();

    return NextResponse.json({
      success: true,
      pre_alert: {
        _id: preAlert._id,
        trackingNumber: preAlert.trackingNumber,
        carrier: preAlert.carrier,
        origin: preAlert.origin,
        expectedDate: preAlert.expectedDate,
        notes: preAlert.notes,
        status: preAlert.status,
        description: preAlert.description,
        pricePaid: preAlert.pricePaid,
        overseasCourier: preAlert.overseasCourier,
        merchant: preAlert.merchant,
        attachmentFile: preAlert.attachmentFile,
        decidedAt: preAlert.decidedAt,
        decidedBy: preAlert.decidedBy,
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    const payload = await getAuthFromRequest(req);
    if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preAlert = await PreAlert.findById(id);
    if (!preAlert) {
      return NextResponse.json({ error: "Pre-alert not found" }, { status: 404 });
    }

    // Check if user owns this pre-alert
    if (payload.role === "customer" && preAlert.userCode !== payload.userCode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete file if exists
    if (preAlert.attachmentFile && preAlert.attachmentFile.path) {
      const filePath = path.join(process.cwd(), "public", preAlert.attachmentFile.path);
      if (existsSync(filePath)) {
        try {
          await unlink(filePath);
        } catch (err) {
          console.error("Error deleting file:", err);
        }
      }
    }

    await PreAlert.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pre-alert DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete pre-alert" },
      { status: 500 }
    );
  }
}

