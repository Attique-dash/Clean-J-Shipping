import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const messages = await prisma.message.findMany({
      where: { userId: payload.id },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { subject, message } = raw as { subject: string; message: string };

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" }, 
        { status: 400 }
      );
    }

    const created = await prisma.message.create({
      data: {
        userId: payload.id,
        subject,
        message,
        status: "open"
      }
    });

    return NextResponse.json({
      message_id: created.id,
      subject: created.subject,
      message: created.message,
      created_at: created.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}
