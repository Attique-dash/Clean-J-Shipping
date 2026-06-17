// Example: src/app/api/customer/bills/route.ts
// Apply this pattern to ALL customer API routes

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, IPackage } from "@/models/Package";
import Invoice from "@/models/Invoice";
import { Payment } from "@/models/Payment";
import { Bill } from "@/models/Bill";
import { getAuthFromRequest } from "@/lib/rbac";
import { Types } from "mongoose";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // ✅ FIX: Added await here
    const payload = await getAuthFromRequest(req);
    if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get consistent user ID
    const userId = (payload as { id?: string; _id?: string; uid?: string }).id || 
                  (payload as { id?: string; _id?: string; uid?: string })._id || 
                  (payload as { id?: string; _id?: string; uid?: string }).uid;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch package-based bills first
    // Fetch package-based bills with full detail fields
    const pkgs = await Package.find({ userId, status: { $ne: "Deleted" } })
      .select("trackingNumber invoiceDocuments invoiceRecords updatedAt createdAt description totalAmount shippingCost itemDescription Branch branch ManifestCode manifestId Shipper shipper Weight weight Description HSCode hsCode UserCode userCode Pieces pieces Length length Width width Height height EntryDate entryDate ServiceTypeID serviceMode itemValueUsd usdValue freight processingFee storageFee dutyPercent gctPercent warehouseLocation rateGroup commercialInvoice houseAwb trackingNum collection customerName customerEmail customerPhone")
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();

    
    // Fetch admin invoices separately with error handling
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
    } catch (err) {
      console.error("Error fetching invoices:", err);
      // Continue without invoices if there's an error
      invoices = [];
    }

    type Bill = {
      tracking_number: string;
      description?: string;
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
      packageDetails?: {
        branch?: string;
        manifest?: string;
        merchant?: string;
        weight?: number;
        description?: string;
        hsCode?: string;
        userCode?: string;
        pieces?: number;
        dimensions?: { length: number; width: number; height: number };
        entryDate?: Date | string;
        serviceMode?: string;
        itemValue?: number;
        freight?: number;
        processingFee?: number;
        storageFee?: number;
        dutyPercent?: number;
        gctPercent?: number;
        warehouseLocation?: string;
        rateGroup?: string;
        commercialInvoice?: string;
        houseAwb?: string;
        trackingNum?: string;
        collection?: string;
        customerName?: string;
        customerEmail?: string;
        customerPhone?: string;
      };
    };

    // Create a package lookup map by tracking number for enriching invoice bills
    const pkgByTracking = new Map<string, any>();
    (pkgs as any[]).forEach((pkg: any) => {
      const tn = pkg.trackingNumber || pkg.TrackingNumber || '';
      if (tn) pkgByTracking.set(tn, pkg);
    });

    // Create bills from admin invoices
    const invoiceBills: Bill[] = invoices.map((inv: {
      _id?: string;
      invoiceNumber: string;
      status: string;
      issueDate?: Date | string;
      createdAt?: Date | string;
      currency?: string;
      total?: number;
      amountPaid?: number;
      balanceDue?: number;
      items?: Array<{
        description?: string;
      }>;
      notes?: string;
      package?: {
        trackingNumber?: string;
      };
      updatedAt?: Date | string;
      paymentHistory?: Array<{ amount?: number }>;
    }) => {
      // Calculate amounts consistently with admin invoices page
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
      
      // Ensure tracking_number is always a string - check multiple sources
      const trackingNumber = inv.package?.trackingNumber || (inv as any).tracking_number || inv.invoiceNumber || 'UNKNOWN';
      
      // Look up matching package for detail fields
      const matchedPkg = pkgByTracking.get(trackingNumber);
      const pkgDetails = matchedPkg ? {
        branch: matchedPkg.Branch || matchedPkg.branch || 'Main Branch',
        manifest: matchedPkg.ManifestCode || matchedPkg.manifestId || '',
        merchant: matchedPkg.Shipper || matchedPkg.shipper || matchedPkg.description || 'UNKNOWN',
        weight: matchedPkg.Weight || matchedPkg.weight || 0,
        description: matchedPkg.Description || matchedPkg.description || matchedPkg.itemDescription || 'Merchandise',
        hsCode: matchedPkg.HSCode || matchedPkg.hsCode || '',
        userCode: matchedPkg.UserCode || matchedPkg.userCode || '',
        pieces: matchedPkg.Pieces || matchedPkg.pieces || 1,
        dimensions: { length: matchedPkg.Length || matchedPkg.length || 0, width: matchedPkg.Width || matchedPkg.width || 0, height: matchedPkg.Height || matchedPkg.height || 0 },
        entryDate: matchedPkg.EntryDate || matchedPkg.entryDate || matchedPkg.createdAt || '',
        serviceMode: matchedPkg.ServiceTypeID || matchedPkg.serviceMode || 'air',
        itemValue: matchedPkg.itemValueUsd || matchedPkg.usdValue || 0,
        freight: matchedPkg.freight || matchedPkg.shippingCost || matchedPkg.totalAmount || 0,
        processingFee: matchedPkg.processingFee || 0,
        storageFee: matchedPkg.storageFee || 0,
        dutyPercent: matchedPkg.dutyPercent || 20,
        gctPercent: matchedPkg.gctPercent || 15,
        warehouseLocation: matchedPkg.warehouseLocation || matchedPkg.Branch || matchedPkg.branch || 'Main Branch',
        rateGroup: matchedPkg.rateGroup || 'Standard Rate',
        commercialInvoice: matchedPkg.commercialInvoice || 'NO',
        houseAwb: matchedPkg.houseAwb || matchedPkg.trackingNumber || matchedPkg.TrackingNumber || '',
        trackingNum: matchedPkg.trackingNum || matchedPkg.trackingNumber || matchedPkg.TrackingNumber || '',
        collection: matchedPkg.collection || matchedPkg.CollectionCode || '',
        customerName: matchedPkg.customerName || '',
        customerEmail: matchedPkg.customerEmail || '',
        customerPhone: matchedPkg.customerPhone || '',
      } : undefined;
            
      return {
        tracking_number: trackingNumber,
        description: inv.items?.[0]?.description || inv.notes || `Invoice ${inv.invoiceNumber}`,
        invoice_number: inv.invoiceNumber,
        invoice_date: inv.issueDate ? new Date(inv.issueDate).toISOString() : (inv.createdAt ? new Date(inv.createdAt).toISOString() : undefined),
        currency: inv.currency || "USD",
        amount_due: balanceDue, // Use calculated balanceDue to match admin view
        payment_status: paymentStatus,
        last_updated: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : (inv.createdAt ? new Date(inv.createdAt).toISOString() : undefined),
        packageDetails: pkgDetails,
      };
    });

    // Pre-fetch invoice numbers for packages that need them
    const packagesNeedingInvoiceNumbers = (pkgs as unknown[]).filter((p) => {
      const pkg = p as IPackage & { 
        invoiceRecords?: Array<unknown>;
        totalAmount?: number;
        shippingCost?: number;
      };
      const recs = Array.isArray(pkg.invoiceRecords) ? pkg.invoiceRecords : [];
      const packageAmount = (typeof pkg.totalAmount === "number" && pkg.totalAmount > 0) 
        ? pkg.totalAmount 
        : (typeof pkg.shippingCost === "number" && pkg.shippingCost > 0)
          ? pkg.shippingCost + (pkg.shippingCost * 0.15)
          : 0;
      return recs.length === 0 && packageAmount > 0;
    });

    const trackingNumbers = packagesNeedingInvoiceNumbers.map((p) => (p as IPackage).trackingNumber);
    const invoiceNumberMap = new Map<string, string>();
    
    if (trackingNumbers.length > 0) {
      try {
        const linkedInvoices = await Invoice.find({
          $or: [
            { tracking_number: { $in: trackingNumbers } },
            { userId: new Types.ObjectId(userId), invoiceType: 'billing' }
          ]
        })
        .populate('package', 'trackingNumber')
        .sort({ createdAt: -1 })
        .select('invoiceNumber package tracking_number')
        .lean();
        
        linkedInvoices.forEach((inv: any) => {
          // Check multiple sources for tracking number
          const trackingNum = inv.tracking_number || inv.package?.trackingNumber;
          if (trackingNum && inv.invoiceNumber) {
            invoiceNumberMap.set(trackingNum, inv.invoiceNumber);
          }
        });
      } catch (err) {
        console.error("Error fetching invoice numbers:", err);
      }
    }

    // Create bills from package records (legacy)
    const packageBills: Bill[] = (pkgs as unknown[]).flatMap((p) => {
      const pkg = p as IPackage & { 
        invoiceRecords?: Array<{ 
          invoiceNumber?: string; 
          invoiceDate?: Date | string; 
          currency?: string; 
          totalValue?: number; 
          status?: string; 
          amountPaid?: number;
        }>;
        invoiceDocuments?: unknown[];
        totalAmount?: number;
        shippingCost?: number;
        itemDescription?: string;
        // Additional detail fields
        Branch?: string; branch?: string;
        ManifestCode?: string; manifestId?: string;
        Shipper?: string; shipper?: string;
        Weight?: number; weight?: number;
        Description?: string; description?: string;
        HSCode?: string; hsCode?: string;
        UserCode?: string; userCode?: string;
        Pieces?: number; pieces?: number;
        Length?: number; length?: number;
        Width?: number; width?: number;
        Height?: number; height?: number;
        EntryDate?: Date | string; entryDate?: Date | string;
        ServiceTypeID?: string; serviceMode?: string;
        itemValueUsd?: number; usdValue?: number;
        freight?: number; processingFee?: number; storageFee?: number;
        dutyPercent?: number; gctPercent?: number;
        warehouseLocation?: string; rateGroup?: string;
        commercialInvoice?: string; houseAwb?: string;
        trackingNum?: string; collection?: string;
        customerName?: string; customerEmail?: string; customerPhone?: string;
      };
      const recs = Array.isArray(pkg.invoiceRecords) ? pkg.invoiceRecords : [];
      
      // Use package's totalAmount (includes tax) as primary source
      // Fallback to shippingCost + 15% tax if totalAmount not set
      let packageAmount = 0;
      if (typeof pkg.totalAmount === "number" && pkg.totalAmount > 0) {
        packageAmount = pkg.totalAmount;
      } else if (typeof pkg.shippingCost === "number" && pkg.shippingCost > 0) {
        packageAmount = pkg.shippingCost + (pkg.shippingCost * 0.15); // Add 15% tax
      }
            
      if (recs.length === 0) {
        const docs = Array.isArray(pkg.invoiceDocuments) ? pkg.invoiceDocuments : [];
        let payment_status: Bill["payment_status"];
        let description: string;
        
        if (packageAmount > 0) {
          payment_status = "submitted"; // Package has automatic invoice
          description = `${pkg.itemDescription || pkg.description} (Auto-generated invoice)`;
        } else {
          payment_status = docs.length > 0 ? "submitted" : "none";
          description = pkg.itemDescription || pkg.description || "Invoice pending generation";
        }
        
        // Get invoice number from pre-fetched map or use package tracking number
        let invoiceNumber = null;
        if (packageAmount > 0) {
          const linkedInvoiceNumber = invoiceNumberMap.get(pkg.trackingNumber || pkg.TrackingNumber || '');
          if (linkedInvoiceNumber) {
            invoiceNumber = linkedInvoiceNumber;
          } else {
            // Don't generate fake invoice numbers - only use real ones from Invoice model
            invoiceNumber = null;
          }
        }
        
      return [
        {
          tracking_number: pkg.trackingNumber || pkg.TrackingNumber || '',
          description,
          invoice_number: invoiceNumber || undefined,
          invoice_date: pkg.createdAt ? new Date(pkg.createdAt).toISOString() : undefined,
          amount_due: packageAmount,
          payment_status,
          currency: "USD", // Use USD as default, not JMD
          last_updated: (pkg.updatedAt || pkg.createdAt) ? new Date(pkg.updatedAt || pkg.createdAt).toISOString() : undefined,
          // Package detail fields
          packageDetails: {
            branch: pkg.Branch || pkg.branch || 'Main Branch',
            manifest: pkg.ManifestCode || pkg.manifestId || '',
            merchant: pkg.Shipper || pkg.shipper || pkg.description || 'UNKNOWN',
            weight: pkg.Weight || pkg.weight || 0,
            description: pkg.Description || pkg.description || pkg.itemDescription || 'Merchandise',
            hsCode: pkg.HSCode || pkg.hsCode || '',
            userCode: pkg.UserCode || pkg.userCode || '',
            pieces: pkg.Pieces || pkg.pieces || 1,
            dimensions: { length: pkg.Length || pkg.length || 0, width: pkg.Width || pkg.width || 0, height: pkg.Height || pkg.height || 0 },
            entryDate: pkg.EntryDate || pkg.entryDate || pkg.createdAt || '',
            serviceMode: pkg.ServiceTypeID || pkg.serviceMode || 'air',
            itemValue: pkg.itemValueUsd || pkg.usdValue || 0,
            freight: pkg.freight || pkg.shippingCost || pkg.totalAmount || packageAmount,
            processingFee: pkg.processingFee || 0,
            storageFee: pkg.storageFee || 0,
            dutyPercent: pkg.dutyPercent || 20,
            gctPercent: pkg.gctPercent || 15,
            warehouseLocation: pkg.warehouseLocation || pkg.Branch || pkg.branch || 'Main Branch',
            rateGroup: pkg.rateGroup || 'Standard Rate',
            commercialInvoice: pkg.commercialInvoice || 'NO',
            houseAwb: pkg.houseAwb || pkg.trackingNumber || pkg.TrackingNumber || '',
            trackingNum: pkg.trackingNum || pkg.trackingNumber || pkg.TrackingNumber || '',
            collection: pkg.collection || pkg.CollectionCode || '',
            customerName: pkg.customerName || '',
            customerEmail: pkg.customerEmail || '',
            customerPhone: pkg.customerPhone || '',
          },
        },
      ];
      }
      
      // Get the most recent invoice record
      const latest = recs[recs.length - 1];
      const totalAmount = typeof latest.totalValue === "number" ? latest.totalValue : packageAmount;
      const amountPaid = typeof latest.amountPaid === "number" ? latest.amountPaid : 0;
      
      // Determine payment status and amount due
      let paymentStatus: Bill["payment_status"];
      let amountDue: number;
      
      if (latest.status === "paid" || amountPaid >= totalAmount) {
        paymentStatus = "paid";
        amountDue = 0;
      } else if (latest.status === "overdue") {
        paymentStatus = "overdue";
        amountDue = Math.max(0, totalAmount - amountPaid);
      } else if (amountPaid > 0) {
        paymentStatus = "partially_paid";
        amountDue = Math.max(0, totalAmount - amountPaid);
      } else {
        paymentStatus = (latest.status as Bill["payment_status"]) || "submitted";
        amountDue = totalAmount;
      }
      
      // Get actual invoice number from Invoice model if available
      const actualInvoiceNumber = invoiceNumberMap.get(pkg.trackingNumber || pkg.TrackingNumber || '') || latest.invoiceNumber || null;
      
      return [
        {
          tracking_number: pkg.trackingNumber || pkg.TrackingNumber || '',
          description: pkg.itemDescription || pkg.description,
          invoice_number: actualInvoiceNumber || undefined, // Only show real invoice numbers
          invoice_date: latest.invoiceDate ? new Date(latest.invoiceDate).toISOString() : 
                       pkg.createdAt ? new Date(pkg.createdAt).toISOString() : undefined,
          currency: latest.currency || "USD", // Use USD as default
          amount_due: amountDue,
          payment_status: paymentStatus,
          last_updated: (pkg.updatedAt || pkg.createdAt) ? new Date(pkg.updatedAt || pkg.createdAt).toISOString() : undefined,
          // Package detail fields
          packageDetails: {
            branch: pkg.Branch || pkg.branch || 'Main Branch',
            manifest: pkg.ManifestCode || pkg.manifestId || '',
            merchant: pkg.Shipper || pkg.shipper || pkg.description || 'UNKNOWN',
            weight: pkg.Weight || pkg.weight || 0,
            description: pkg.Description || pkg.description || pkg.itemDescription || 'Merchandise',
            hsCode: pkg.HSCode || pkg.hsCode || '',
            userCode: pkg.UserCode || pkg.userCode || '',
            pieces: pkg.Pieces || pkg.pieces || 1,
            dimensions: { length: pkg.Length || pkg.length || 0, width: pkg.Width || pkg.width || 0, height: pkg.Height || pkg.height || 0 },
            entryDate: pkg.EntryDate || pkg.entryDate || pkg.createdAt || '',
            serviceMode: pkg.ServiceTypeID || pkg.serviceMode || 'air',
            itemValue: pkg.itemValueUsd || pkg.usdValue || 0,
            freight: pkg.freight || pkg.shippingCost || pkg.totalAmount || totalAmount,
            processingFee: pkg.processingFee || 0,
            storageFee: pkg.storageFee || 0,
            dutyPercent: pkg.dutyPercent || 20,
            gctPercent: pkg.gctPercent || 15,
            warehouseLocation: pkg.warehouseLocation || pkg.Branch || pkg.branch || 'Main Branch',
            rateGroup: pkg.rateGroup || 'Standard Rate',
            commercialInvoice: pkg.commercialInvoice || 'NO',
            houseAwb: pkg.houseAwb || pkg.trackingNumber || pkg.TrackingNumber || '',
            trackingNum: pkg.trackingNum || pkg.trackingNumber || pkg.TrackingNumber || '',
            collection: pkg.collection || pkg.CollectionCode || '',
            customerName: pkg.customerName || '',
            customerEmail: pkg.customerEmail || '',
            customerPhone: pkg.customerPhone || '',
          },
        },
      ];
    });

    // Combine both types of bills, with admin invoices taking precedence
    // Create a map keyed by invoice_number to prevent duplicates
    const billMap = new Map<string, Bill>();
    
    // Track which tracking numbers have real invoices from Invoice model
    const trackingNumbersWithRealInvoices = new Set<string>();
    invoiceBills.forEach(bill => {
      if (bill.invoice_number && bill.invoice_number.startsWith('INV-')) {
        // Skip auto-generated invoices like "INV-1768063947790" - these are temporary
        if (!bill.invoice_number.match(/^INV-\d{13}$/)) {
          billMap.set(bill.invoice_number, bill);
          if (bill.tracking_number) {
            trackingNumbersWithRealInvoices.add(bill.tracking_number);
          }
        }
      }
    });
    
    // Add package bills only if no real invoice exists for this tracking number
    packageBills.forEach(bill => {
      // Skip if there's already a real invoice for this tracking number
      if (bill.tracking_number && trackingNumbersWithRealInvoices.has(bill.tracking_number)) {
        return;
      }
      
      // Skip auto-generated package invoices if they match the pattern "INV-CJS-..."
      if (bill.invoice_number && bill.invoice_number.startsWith('INV-CJS-')) {
        // Check if there's a better invoice already
        const hasBetterInvoice = Array.from(billMap.values()).some(b => 
          b.tracking_number === bill.tracking_number && 
          b.invoice_number && 
          !b.invoice_number.startsWith('INV-CJS-') &&
          !b.invoice_number.match(/^INV-\d{13}$/)
        );
        if (hasBetterInvoice) {
          return;
        }
      }
      
      // Use invoice_number as key, or tracking_number + source as fallback
      const key = bill.invoice_number || `${bill.tracking_number}-package`;
      if (!billMap.has(key)) {
        billMap.set(key, bill);
      }
    });
    
    // Convert map back to array, sorted by last updated date (most recent first)
    let bills = Array.from(billMap.values())
      .sort((a, b) => {
        const dateA = new Date(a.last_updated || a.invoice_date || 0).getTime();
        const dateB = new Date(b.last_updated || b.invoice_date || 0).getTime();
        return dateB - dateA;
      });

    // Fetch payment information for paid bills to populate Bills History
    const billTrackingNumbers = bills.map(b => b.tracking_number);
    const invoiceNumbers = bills.filter(b => b.invoice_number).map(b => b.invoice_number!);
    
    let payments: any[] = [];
    if (billTrackingNumbers.length > 0 || invoiceNumbers.length > 0) {
      try {
        payments = await Payment.find({
          $or: [
            { trackingNumber: { $in: billTrackingNumbers } },
            { reference: { $in: invoiceNumbers } }
          ],
          status: "captured"
        })
        .sort({ createdAt: -1 })
        .lean();
      } catch (err) {
        console.error("Error fetching payments:", err);
      }
    }

    // Create a map of payments by tracking number and invoice number
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
    bills = bills.map(bill => {
      const paymentByTracking = paymentMap.get(bill.tracking_number);
      const paymentByInvoice = bill.invoice_number ? paymentMap.get(`invoice-${bill.invoice_number}`) : null;
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

    // Calculate balance, due_payment, and paid_payment for each bill
    bills = bills.map(bill => {
      // For paid bills, amount_due should be 0, but we keep the original total for history
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

    // Fetch admin-created bills from Bill model (these have billNumber like BILL-YYYYMM-XXXX)
    let adminBills: any[] = [];
    try {
      const userObjectId = new Types.ObjectId(userId);
      const dbBills = await Bill.find({
        customerId: userObjectId,
        status: { $in: ['pending', 'sent', 'overdue', 'paid'] }
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      adminBills = dbBills.map((bill: any) => {
        const isPaid = bill.status === 'paid';
        const totalAmount = bill.totalAmount || 0;
        
        return {
          _id: bill._id?.toString(),
          tracking_number: bill.packages?.[0]?.trackingNumber || bill.billNumber,
          description: `Admin Bill - ${bill.packages?.length || 0} package(s)`,
          invoice_number: bill.billNumber,
          invoice_date: bill.createdAt ? new Date(bill.createdAt).toISOString() : undefined,
          currency: bill.currency || "USD",
          amount_due: isPaid ? 0 : totalAmount,
          payment_status: isPaid ? 'paid' : (bill.status === 'overdue' ? 'overdue' : 'submitted'),
          last_updated: bill.updatedAt ? new Date(bill.updatedAt).toISOString() : (bill.createdAt ? new Date(bill.createdAt).toISOString() : undefined),
          payment_id: bill.paymentId,
          payment_method: bill.paymentGateway,
          due_payment: totalAmount,
          paid_payment: isPaid ? totalAmount : 0,
          balance: isPaid ? 0 : totalAmount,
          // Additional fields for Bill model data
          billNumber: bill.billNumber,
          status: bill.status,
          itemTotal: bill.itemTotal,
          shippingFee: bill.shippingFee,
          customsFee: bill.customsFee,
          totalAmount: bill.totalAmount,
          packages: bill.packages?.map((p: any) => ({
            packageId: p.packageId?.toString(),
            trackingNumber: p.trackingNumber,
            shipper: p.shipper,
            weight: p.weight,
            itemValue: p.itemValue,
            shippingFee: p.shippingFee,
            customsFee: p.customsFee,
            total: p.total
          })),
          paidAt: bill.paidAt ? new Date(bill.paidAt).toISOString() : undefined,
          paidAmount: bill.paidAmount,
          createdAt: bill.createdAt ? new Date(bill.createdAt).toISOString() : undefined,
          adminNotes: bill.adminNotes,
        };
      });
    } catch (err) {
      console.error("Error fetching admin bills:", err);
    }

    // Add admin bills to the bills array, avoiding duplicates by billNumber
    const existingBillNumbers = new Set(bills.map(b => b.invoice_number).filter(Boolean));
    for (const adminBill of adminBills) {
      if (!existingBillNumbers.has(adminBill.billNumber)) {
        bills.push(adminBill);
      }
    }

    // Re-sort bills by date (most recent first)
    bills.sort((a, b) => {
      const dateA = new Date(a.last_updated || a.invoice_date || 0).getTime();
      const dateB = new Date(b.last_updated || b.invoice_date || 0).getTime();
      return dateB - dateA;
    });
    
    return NextResponse.json({ bills });
  } catch (error) {
    console.error("Error in /api/customer/bills:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}