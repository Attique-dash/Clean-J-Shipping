// src/app/api/customer/bills/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, IPackage } from "@/models/Package";
import Invoice from "@/models/Invoice";
import { Payment } from "@/models/Payment";
import { Bill } from "@/models/Bill";
import { getAuthFromRequest } from "@/lib/rbac";
import { CurrencyService } from "@/lib/currency-service";
import { Types } from "mongoose";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const userId = (payload as { id?: string; _id?: string; uid?: string }).id || 
                  (payload as { id?: string; _id?: string; uid?: string })._id || 
                  (payload as { id?: string; _id?: string; uid?: string }).uid;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Bills API] Loading bills for user: ${userId}`);

    // Fetch invoices from Invoice model (primary source of truth)
    let invoices: any[] = [];
    try {
      invoices = await Invoice.find({ 
        $or: [
          { userId: new Types.ObjectId(userId) },
          { 'customer.id': userId }
        ]
      })
        .populate('package', 'trackingNumber')
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();
      console.log(`[Bills API] Found ${invoices.length} invoices`);
    } catch (err) {
      console.error("[Bills API] Error fetching invoices:", err);
      invoices = [];
    }

    // Fetch packages
    const pkgs = await Package.find({ userId, status: { $ne: "Deleted" } })
      .select("trackingNumber invoiceDocuments invoiceRecords updatedAt createdAt description totalAmount shippingCost itemDescription Branch branch ManifestCode manifestId Shipper shipper Weight weight Description HSCode hsCode UserCode userCode Pieces pieces Length length Width width Height height EntryDate entryDate ServiceTypeID serviceMode itemValueUsd usdValue freight processingFee storageFee dutyPercent gctPercent warehouseLocation rateGroup commercialInvoice houseAwb trackingNum collection customerName customerEmail customerPhone")
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();

    type Bill = {
      tracking_number: string;
      description: string;
      invoice_number?: string;
      invoice_date?: string;
      currency?: string;
      amount_due: number;
      payment_status: "submitted" | "reviewed" | "rejected" | "none" | "paid" | "overdue" | "partially_paid";
      document_url?: string;
      last_updated?: string;
      payment_id?: string;
      payment_method?: string;
      due_payment?: number;
      paid_payment?: number;
      balance?: number;
      packageDetails?: any;
    };

    // Helper: Get currency symbol properly
    const getCurrencySymbol = (currencyCode: string): string => {
      const info = CurrencyService.getCurrencyInfo((currencyCode || 'USD').toUpperCase());
      return info?.symbol || currencyCode || '$';
    };

    // Helper: Format amount with correct symbol
    const formatCurrency = (amount: number, currencyCode: string): string => {
      const symbol = getCurrencySymbol(currencyCode);
      return `${symbol}${amount.toFixed(2)}`;
    };

    // FIX: Create bills ONLY from invoices (single source of truth)
    const bills: Bill[] = invoices.map((inv: any) => {
      const totalAmount = Number(inv.total) || 0;
      const paidFromHistory = Array.isArray(inv.paymentHistory)
        ? inv.paymentHistory.reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0)
        : 0;
      const amountPaid = paidFromHistory > 0 ? paidFromHistory : (Number(inv.amountPaid) || 0);
      const balanceDue = Math.max(0, totalAmount - amountPaid);
      
      let paymentStatus: Bill["payment_status"];
      if (inv.status === "paid" || amountPaid >= totalAmount) {
        paymentStatus = "paid";
      } else if (inv.status === "overdue") {
        paymentStatus = "overdue";
      } else if (amountPaid > 0) {
        paymentStatus = "partially_paid";
      } else if (inv.status === "sent") {
        paymentStatus = "submitted";
      } else {
        paymentStatus = "none";
      }
      
      const trackingNumber = inv.package?.trackingNumber || inv.tracking_number || inv.invoiceNumber || 'UNKNOWN';
      const currency = (inv.currency || 'USD').toUpperCase();
      
      console.log(`[Bills API] Creating bill from invoice ${inv.invoiceNumber}: tracking=${trackingNumber}, currency=${currency}, total=${totalAmount}, paid=${amountPaid}`);

      return {
        tracking_number: trackingNumber,
        description: inv.items?.[0]?.description || inv.notes || `Invoice ${inv.invoiceNumber}`,
        invoice_number: inv.invoiceNumber,
        invoice_date: inv.issueDate ? new Date(inv.issueDate).toISOString() : (inv.createdAt ? new Date(inv.createdAt).toISOString() : undefined),
        currency: currency,
        amount_due: balanceDue,
        payment_status: paymentStatus,
        last_updated: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : (inv.createdAt ? new Date(inv.createdAt).toISOString() : undefined),
        packageDetails: {
          // Get from package if available
          branch: 'Main Branch',
          manifest: '',
          merchant: inv.items?.[0]?.description || 'Service',
          weight: 0,
          description: inv.items?.[0]?.description || 'Shipping Service',
        },
      };
    });

    console.log(`[Bills API] Created ${bills.length} bills from invoices`);

    // Fetch payments
    let payments: any[] = [];
    if (bills.length > 0) {
      try {
        const billTrackingNumbers = bills.map(b => b.tracking_number);
        const invoiceNumbers = bills.filter(b => b.invoice_number).map(b => b.invoice_number!);
        
        payments = await Payment.find({
          $or: [
            { trackingNumber: { $in: billTrackingNumbers } },
            { reference: { $in: invoiceNumbers } }
          ],
          status: "captured"
        })
        .sort({ createdAt: -1 })
        .lean();
        
        console.log(`[Bills API] Found ${payments.length} payments`);
      } catch (err) {
        console.error("[Bills API] Error fetching payments:", err);
      }
    }

    // Map payments to bills
    const paymentMap = new Map<string, any>();
    payments.forEach((payment: any) => {
      if (payment.trackingNumber) {
        const key = payment.trackingNumber;
        if (!paymentMap.has(key) || new Date(payment.createdAt) > new Date(paymentMap.get(key).createdAt)) {
          paymentMap.set(key, payment);
        }
      }
      if (payment.reference && payment.reference.startsWith('INV-')) {
        const key = `invoice-${payment.reference}`;
        if (!paymentMap.has(key) || new Date(payment.createdAt) > new Date(paymentMap.get(key).createdAt)) {
          paymentMap.set(key, payment);
        }
      }
    });

    // Enrich bills with payment information
    const enrichedBills = bills.map(bill => {
      const paymentByInvoice = bill.invoice_number ? paymentMap.get(`invoice-${bill.invoice_number}`) : null;
      const paymentByTracking = paymentMap.get(bill.tracking_number);
      const payment = paymentByInvoice || paymentByTracking;

      if (payment) {
        return {
          ...bill,
          payment_id: payment._id?.toString() || payment.transactionId || payment.gatewayId,
          payment_method: payment.method || 'card',
        };
      }
      return bill;
    });

    // Calculate balance fields
    const finalBills = enrichedBills.map(bill => {
      const totalAmount = bill.amount_due;
      const paidAmount = bill.payment_status === 'paid' ? totalAmount : 0;
      const balance = bill.payment_status === 'paid' ? 0 : bill.amount_due;

      return {
        ...bill,
        due_payment: bill.payment_status === 'paid' ? totalAmount : bill.amount_due,
        paid_payment: paidAmount,
        balance: balance,
      };
    });

    // Sort by date (most recent first)
    finalBills.sort((a, b) => {
      const dateA = new Date(a.last_updated || a.invoice_date || 0).getTime();
      const dateB = new Date(b.last_updated || b.invoice_date || 0).getTime();
      return dateB - dateA;
    });

    console.log(`[Bills API] Returning ${finalBills.length} final bills for user ${userId}`);
    
    return NextResponse.json({ bills: finalBills });
  } catch (error) {
    console.error("[Bills API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
