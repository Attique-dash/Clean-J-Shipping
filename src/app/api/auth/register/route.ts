import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { registerSchema, customerRegisterSchema, customerRegisterAltSchema } from "@/lib/validators";
import { EmailToken } from "@/models/EmailToken";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

// Type guard to detect Mongo duplicate key errors safely
function isMongoDuplicateKeyError(e: unknown): e is { code: number } {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "number" &&
    (e as { code: unknown }).code === 11000
  );
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Try existing schema first for backward compatibility
    const parsedLegacy = registerSchema.safeParse(body);
    let firstName: string;
    let lastName: string;
    let email: string;
    let password: string;
    let branch: string | undefined;
    let serviceTypeIDs: string[] | undefined;
    let phone: string | undefined;
    let address:
      | {
          street?: string;
          city?: string;
          state?: string;
          zipCode?: string;
          country?: string;
        }
      | undefined;

    if (parsedLegacy.success) {
      ({ firstName, lastName, email, password, branch, serviceTypeIDs } = parsedLegacy.data);
    } else {
      // Try the strict alternative schema first (matches user's requested payload)
      const parsedAlt = customerRegisterAltSchema.safeParse(body);
      if (parsedAlt.success) {
        const { fullName, email: em, phoneNo, password: pwd, adress, city, state, zip_code, country } = parsedAlt.data;
        email = em;
        password = pwd;
        phone = phoneNo;
        // Split fullName into first and last name
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) {
          firstName = parts[0];
          lastName = "";
        } else {
          lastName = parts.pop() as string;
          firstName = parts.join(" ");
        }
        address = {
          street: adress,
          city,
          state,
          zipCode: zip_code,
          country,
        };
      } else {
        // Fallback to the existing customer schema (backward compatible)
        const parsedNew = customerRegisterSchema.safeParse(body);
        if (!parsedNew.success) {
          return NextResponse.json(
            { error: { legacy: parsedLegacy.error.flatten(), alt: parsedAlt.error.flatten(), customer: parsedNew.error.flatten() } },
            { status: 400 }
          );
        }
        const { full_name, address: addr, phone: ph, password: pwd, email: em } = parsedNew.data;
        email = em;
        password = pwd;
        phone = ph;
        // Split full_name into first and last name (last token as lastName)
        const parts = full_name.trim().split(/\s+/);
        if (parts.length === 1) {
          firstName = parts[0];
          lastName = "";
        } else {
          lastName = parts.pop() as string;
          firstName = parts.join(" ");
        }
        if (addr) {
          address = {
            street: addr.street,
            city: addr.city,
            state: addr.state,
            zipCode: addr.zip_code,
            country: addr.country,
          };
        }
      }
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Create a simple userCode from timestamp - in production you may use a better generator
    const userCode = `U${Date.now()}`;
    const passwordHash = await hashPassword(password);

    const user = await User.create({
      userCode,
      firstName,
      lastName,
      email,
      passwordHash,
      branch,
      serviceTypeIDs,
      phone,
      address,
      role: "customer",
    });

    // Create email verification token (valid for 24 hours)
    try {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await EmailToken.create({ userId: user._id, token, expiresAt });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
      const verifyUrl = `${baseUrl}/api/auth/verify?t=${encodeURIComponent(token)}`;
      await sendVerificationEmail({
        to: email,
        firstName,
        verifyUrl,
      });
    } catch (e) {
      console.error("Failed to queue verification email", e);
      // Do not fail registration if email cannot be sent
    }

    // Dashboard-friendly response
    return NextResponse.json({
      message: "Registered",
      user: {
        id: user._id,
        user_code: user.userCode,
        full_name: [firstName, lastName].filter(Boolean).join(" "),
        email: user.email,
        phone: user.phone,
        address: address
          ? { street: address.street, city: address.city, state: address.state, zip_code: address.zipCode, country: address.country }
          : undefined,
      },
      email_verification: { sent: true },
    });
  } catch (err: unknown) {
    // Map common mongoose errors
    if (isMongoDuplicateKeyError(err)) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    console.error("/api/auth/register failed", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
