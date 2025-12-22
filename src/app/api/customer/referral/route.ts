import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Referral } from "@/models/Referral";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";
import crypto from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Generate unique referral code
function generateReferralCode(userCode: string): string {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${userCode}-${random}`;
}

export async function GET(req: Request) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const userId = payload._id || payload.id || payload.uid;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const user = await User.findById(userId).select("userCode").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's referral code (generate if doesn't exist)
    let referralCode = user.userCode ? `${user.userCode}-REF` : `REF-${userId.slice(-6)}`;

    // Get all referrals by this user
    const referrals = await Referral.find({ referrerId: userId })
      .sort({ createdAt: -1 })
      .lean();

    // Calculate stats
    const stats = {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === "pending").length,
      registered: referrals.filter((r) => r.status === "registered").length,
      completed: referrals.filter((r) => r.status === "completed").length,
      totalRewards: referrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
      pendingRewards: referrals
        .filter((r) => r.rewardStatus === "pending" && r.rewardAmount)
        .reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
    };

    return NextResponse.json({
      referralCode,
      referrals,
      stats,
    });
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch referrals" },
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

    await dbConnect();

    const userId = payload._id || payload.id || payload.uid;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const body = await req.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await User.findById(userId).select("userCode email").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if email is already referred
    const existing = await Referral.findOne({
      referrerId: userId,
      referredEmail: email.toLowerCase(),
    });

    if (existing) {
      return NextResponse.json(
        { error: "This email has already been referred" },
        { status: 400 }
      );
    }

    // Check if email is already a user
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 400 }
      );
    }

    // Generate referral code
    const referralCode = generateReferralCode(user.userCode || userId.slice(-6));

    const referral = await Referral.create({
      referrerId: userId,
      referredEmail: email.toLowerCase(),
      referredName: name,
      referralCode,
      status: "pending",
    });

    return NextResponse.json(
      {
        success: true,
        referral: {
          _id: referral._id,
          referralCode: referral.referralCode,
          email: referral.referredEmail,
          status: referral.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Referral POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create referral" },
      { status: 500 }
    );
  }
}

