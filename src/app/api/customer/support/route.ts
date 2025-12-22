import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/rbac";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.id || payload._id || payload.uid;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");

    const where: Record<string, unknown> = {
      userId: userId,
    };

    if (status) where.status = status;
    if (category) where.category = category;

    const tickets = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Format tickets for frontend
    const formattedTickets = tickets.map((ticket) => ({
      _id: ticket.id,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      category: ticket.category,
      priority: ticket.priority,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    }));

    return NextResponse.json({ tickets: formattedTickets });
  } catch (error) {
    console.error("Support tickets GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.id || payload._id || payload.uid;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const body = await req.json();
    const { subject, message, category, priority, relatedTo, relatedType } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 }
      );
    }

    const ticket = await prisma.message.create({
      data: {
        userId: userId,
        subject,
        message,
        category: category || "inquiry",
        priority: priority || "normal",
        status: "open",
        relatedTo,
        relatedType,
        isRead: false,
        isCustomerRead: true,
        isAdminRead: false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        ticket: {
          _id: ticket.id,
          subject: ticket.subject,
          message: ticket.message,
          status: ticket.status,
          category: ticket.category,
          priority: ticket.priority,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Support ticket POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create ticket" },
      { status: 500 }
    );
  }
}

