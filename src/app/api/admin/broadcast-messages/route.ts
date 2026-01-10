import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { adminBroadcastCreateSchema } from "@/lib/validators";
import { Broadcast } from "@/models/Broadcast";
import { User } from "@/models/User";
import { Message } from "@/models/Message";
import { Types } from "mongoose";
import { EmailService } from "@/lib/email-service";

export async function GET(req: Request) {
  const payload = await  getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  const list = await Broadcast.find({}).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({
    broadcasts: list.map((b) => ({
      id: String(b._id),
      title: b.title,
      body: b.body,
      channels: b.channels,
      scheduled_at: b.scheduledAt ? new Date(b.scheduledAt).toISOString() : null,
      sent_at: b.sentAt ? new Date(b.sentAt).toISOString() : null,
      total_recipients: b.totalRecipients || 0,
      portal_delivered: b.portalDelivered || 0,
      email_delivered: b.emailDelivered || 0,
      email_failed: b.emailFailed || 0,
      created_at: b.createdAt ? new Date(b.createdAt).toISOString() : null,
    })),
  });
}

export async function POST(req: Request) {
  const payload = await  getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminBroadcastCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, body, channels = ["portal"], scheduled_at, audience = "all", priority = "normal" } = parsed.data as {
    title: string;
    body: string;
    channels?: ("email" | "portal")[];
    scheduled_at?: string;
    audience?: "all" | "active" | "inactive" | "staff";
    priority?: "low" | "normal" | "high";
  };

  // Determine recipients based on audience
  let recipients: Array<{ _id: Types.ObjectId; email?: string; userCode?: string; role: string }> = [];
  
  if (audience === "staff") {
    // Get all staff (admin and warehouse roles)
    const staffUsers = await User.find({ role: { $in: ["admin", "warehouse"] } })
      .select("_id email userCode role")
      .lean();
    recipients = staffUsers.map((u: any) => ({
      _id: u._id as Types.ObjectId,
      email: u.email as string | undefined,
      userCode: u.userCode as string | undefined,
      role: (u.role || 'admin') as string
    }));
  } else {
    // Get customers based on audience filter
    let customerQuery: any = { role: "customer" };
    if (audience === "active") {
      customerQuery.accountStatus = "active";
    } else if (audience === "inactive") {
      customerQuery.accountStatus = { $ne: "active" };
    }
    
    const customerUsers = await User.find(customerQuery)
      .select("_id email userCode role")
      .lean();
    recipients = customerUsers.map((u: any) => ({
      _id: u._id as Types.ObjectId,
      email: u.email as string | undefined,
      userCode: u.userCode as string | undefined,
      role: (u.role || 'customer') as string
    }));
  }
  
  const withUserCode = recipients.filter((u) => typeof u.userCode === "string" && u.userCode.trim().length > 0) as Array<{
    _id: Types.ObjectId;
    email?: string;
    userCode: string;
    role: string;
  }>;
  const totalRecipients = withUserCode.length;

  const created = await Broadcast.create({
    title,
    body,
    channels,
    scheduledAt: scheduled_at ? new Date(scheduled_at) : undefined,
    createdBy: payload._id || null,
    totalRecipients,
  });

  // Deliver via portal by creating messages for each recipient
  let portalDelivered = 0;
  if (channels.includes("portal") && totalRecipients > 0) {
    try {
      const now = new Date();
      const docs: Array<{
        userCode: string;
        customer: Types.ObjectId;
        subject: string;
        body: string;
        sender: "support";
        broadcastId: Types.ObjectId;
        createdAt: Date;
        updatedAt: Date;
      }> = withUserCode.map((u) => ({
        userCode: u.userCode,
        customer: u._id,
        subject: title,
        body,
        sender: "support",
        broadcastId: created._id,
        createdAt: now,
        updatedAt: now,
      }));
      const res = await Message.insertMany(docs, { ordered: false });
      portalDelivered = res.length;
    } catch (err) {
      console.error("Error delivering portal messages:", err);
      // ignore per-user failures; continue
    }
  }

  // Email delivery integration
  let emailDelivered = 0;
  let emailFailed = 0;
  if (channels.includes("email") && totalRecipients > 0) {
    const emailService = new EmailService();
    const emailPromises = withUserCode.map(async (u) => {
      if (!u.email) {
        return { success: false, reason: "No email address" };
      }
      
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${title}</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(to right, #0f4d8a, #E67919); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">${title}</h1>
              </div>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
                <div style="white-space: pre-wrap; font-size: 16px;">${body.replace(/\n/g, '<br>')}</div>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                <p style="color: #666; font-size: 12px; margin: 0;">
                  This is an automated message from Clean J Shipping. Please do not reply to this email.
                </p>
              </div>
            </body>
          </html>
        `;
        
        const success = await emailService.sendEmail({
          to: u.email,
          subject: title,
          html: emailHtml,
        });
        
        return { success, email: u.email };
      } catch (err) {
        console.error(`Error sending email to ${u.email}:`, err);
        return { success: false, email: u.email, reason: err instanceof Error ? err.message : "Unknown error" };
      }
    });
    
    const emailResults = await Promise.allSettled(emailPromises);
    emailResults.forEach((result) => {
      if (result.status === "fulfilled") {
        if (result.value.success) {
          emailDelivered++;
        } else {
          emailFailed++;
        }
      } else {
        emailFailed++;
      }
    });
  }

  const sentAt = new Date();
  await Broadcast.findByIdAndUpdate(created._id, {
    $set: { portalDelivered, emailDelivered, emailFailed, sentAt },
  });

  return NextResponse.json({
    id: String(created._id),
    title,
    body,
    channels,
    total_recipients: totalRecipients,
    portal_delivered: portalDelivered,
    email_delivered: emailDelivered,
    email_failed: emailFailed,
    sent_at: sentAt.toISOString(),
  });
}
