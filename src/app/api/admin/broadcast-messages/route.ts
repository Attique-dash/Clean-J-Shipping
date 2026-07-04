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
    // Convert Zod error into a readable string so the frontend can show it directly
    const messages = parsed.error.errors.map((e) => e.message).filter(Boolean);
    const errMsg = messages.length > 0 ? messages.join('; ') : JSON.stringify(parsed.error.flatten());
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }

  const { title, body, channels = ["portal"], scheduled_at, audience = "customer", priority: _priority = "normal" } = parsed.data as {
    title: string;
    body: string;
    channels?: ("email" | "portal")[];
    scheduled_at?: string;
    audience?: "all" | "active" | "inactive" | "staff" | "customer" | "both";
    priority?: "low" | "normal" | "high";
  };

  // Determine recipients based on audience and account status
  const userFilter: Record<string, unknown> = {};

  if (audience === "staff") {
    userFilter.role = { $in: ["admin", "warehouse"] };
  } else if (audience === "customer") {
    userFilter.role = "customer";
  } else if (audience === "both" || audience === "all") {
    userFilter.role = { $in: ["admin", "warehouse", "customer"] };
  }

  if (audience === "active") {
    userFilter.accountStatus = "active";
  } else if (audience === "inactive") {
    userFilter.accountStatus = "inactive";
  }

  const users = await User.find(userFilter)
    .select("_id email userCode role accountStatus")
    .lean();

  const recipients = await Promise.all(
    users.map(async (u: any) => {
      let userCode = typeof u.userCode === 'string' ? u.userCode.trim() : '';
      if (!userCode) {
        userCode = u.email
          ? `${u.email.split('@')[0].toUpperCase()}-${String(u._id).slice(-4)}`
          : `USER-${String(u._id).slice(-6)}`;
        try {
          await User.findByIdAndUpdate(u._id, { $set: { userCode } }, { new: false });
        } catch (err) {
          console.error(`Failed to update userCode for user ${u._id}:`, err);
        }
      }

      return {
        _id: u._id as Types.ObjectId,
        email: u.email as string | undefined,
        userCode,
        role: (u.role || 'customer') as string,
        accountStatus: u.accountStatus as string | undefined,
      };
    })
  );

  const totalRecipients = recipients.length;

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
    }> = recipients.map((u) => ({
      userCode: u.userCode,
      customer: u._id,
      subject: title,
      body,
      sender: "support",
      broadcastId: created._id,
      createdAt: now,
      updatedAt: now,
    }));
    
    try {
      const res = await Message.insertMany(docs, { ordered: false });
      portalDelivered = res.length;
      console.log(`[Broadcast] Created ${portalDelivered} portal messages for ${totalRecipients} recipients`);
    } catch (err) {
      console.error("Error delivering portal messages:", err);
      // Try to insert messages one by one to see which ones fail
      if (err && typeof err === 'object' && 'writeErrors' in err) {
        const writeErrors = (err as any).writeErrors || [];
        const inserted = (err as any).insertedCount || 0;
        portalDelivered = inserted;
        console.error(`[Broadcast] Failed to create ${writeErrors.length} messages. Successfully created: ${inserted} out of ${totalRecipients}`);
        // Log specific errors
        writeErrors.forEach((error: any) => {
          console.error(`[Broadcast] Failed to create message for userCode: ${error.op?.userCode}, error: ${error.errmsg || error.err}`);
        });
      } else {
        // If it's a different error, try inserting one by one
        console.log(`[Broadcast] Attempting individual message creation...`);
        for (const doc of docs) {
          try {
            await Message.create(doc);
            portalDelivered++;
          } catch (individualErr) {
            console.error(`[Broadcast] Failed to create message for userCode ${doc.userCode}:`, individualErr);
          }
        }
      }
    }
  }

  // Email delivery integration
  let emailDelivered = 0;
  let emailFailed = 0;
  if (channels.includes("email") && totalRecipients > 0) {
    const emailService = new EmailService();
    const emailPromises = recipients.map(async (u) => {
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

export async function DELETE(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "Broadcast ID is required" }, { status: 400 });
  }

  try {
    const deleted = await Broadcast.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
    }
    
    // Also delete associated messages
    await Message.deleteMany({ broadcastId: id });
    
    return NextResponse.json({ success: true, message: "Broadcast deleted successfully" });
  } catch (error) {
    console.error("Error deleting broadcast:", error);
    return NextResponse.json({ error: "Failed to delete broadcast" }, { status: 500 });
  }
}
