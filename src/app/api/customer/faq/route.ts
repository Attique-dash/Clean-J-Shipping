import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { FAQ } from "@/models/FAQ";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");

    const filter: Record<string, unknown> = {
      isActive: true,
    };

    if (category) {
      filter.category = category;
    }

    let faqs = await FAQ.find(filter).sort({ order: 1, createdAt: -1 }).lean();

    // Client-side search filtering (can be moved to database query if needed)
    if (search) {
      const searchLower = search.toLowerCase();
      faqs = faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchLower) ||
          faq.answer.toLowerCase().includes(searchLower)
      );
    }

    // Group by category
    const grouped = faqs.reduce((acc, faq) => {
      if (!acc[faq.category]) {
        acc[faq.category] = [];
      }
      acc[faq.category].push(faq);
      return acc;
    }, {} as Record<string, typeof faqs>);

    return NextResponse.json({
      faqs: grouped,
      flat: faqs,
      categories: Object.keys(grouped),
    });
  } catch (error) {
    console.error("FAQ GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch FAQs" },
      { status: 500 }
    );
  }
}

