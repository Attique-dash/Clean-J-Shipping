import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type StripeNS from "stripe";
import { stripe } from "@/lib/stripe";
import { dbConnect } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { sendPaymentReceiptEmail } from "@/lib/email";

export async function POST(req: Request) {
  const sig = headers().get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });

  let event: StripeNS.Event;
  const body = await req.text();

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = typeof err === "object" && err && "message" in err ? (err as { message?: string }).message : String(err);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  await dbConnect();

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as StripeNS.PaymentIntent;
        const amount = typeof pi.amount_received === "number" && pi.amount_received > 0 ? pi.amount_received / 100 : (typeof pi.amount === "number" ? pi.amount / 100 : 0);
        const currency = (pi.currency || "USD").toUpperCase();
        const receiptNumber = `R${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        const paidAt = pi.created ? new Date(pi.created * 1000) : new Date();

        const updated = await Payment.findOneAndUpdate(
          { gatewayId: pi.id },
          { $set: { status: "captured" }, $push: {}, $setOnInsert: {} },
          { new: true }
        );

        if (updated) {
          // persist receipt info into meta
          const meta = Object.assign({}, updated.meta, { receiptNumber, paidAt });
          updated.meta = meta;
          if (!updated.amount || !updated.currency) {
            // fill from Stripe if missing
            (updated as any).amount = updated.amount || amount;
            (updated as any).currency = updated.currency || currency;
          }
          await updated.save();

          // lookup user to email
          let toEmail: string | undefined;
          let firstName: string | undefined;
          if (updated.customer) {
            const u = await User.findById(updated.customer).select("email firstName");
            toEmail = u?.email || undefined;
            firstName = u?.firstName || undefined;
          }
          if (!toEmail && updated.userCode) {
            const u = await User.findOne({ userCode: updated.userCode }).select("email firstName");
            toEmail = toEmail || u?.email || undefined;
            firstName = firstName || u?.firstName || undefined;
          }
          if (toEmail) {
            await sendPaymentReceiptEmail({
              to: toEmail,
              firstName,
              amount: updated.amount || amount,
              currency: updated.currency || currency,
              method: updated.method,
              trackingNumber: updated.trackingNumber,
              reference: updated.reference,
              receiptNumber,
              paidAt,
            });
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as StripeNS.PaymentIntent;
        await Payment.findOneAndUpdate(
          { gatewayId: pi.id },
          { status: "failed" }
        );
        break;
      }
      default:
        // ignore other events for now
        break;
    }
  } catch (err) {
    const message = typeof err === "object" && err && "message" in err ? (err as { message?: string }).message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
