// src/app/api/admin/invoices/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { dbConnect } from '@/lib/db';
import Package from '@/models/Package';
import User from '@/models/User';
import { Bill } from '@/models/Bill';
import { emailService } from '@/lib/email-service';
import { Types } from 'mongoose';

// POST - Approve invoice and optionally generate bill
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();
    
    const {
      action, // 'approve' or 'reject'
      rejectionReason,
      // Bill generation fields (only for approve)
      shippingFee,
      customsFee,
      additionalFees,
      adminNotes
    } = data;

    // Find the package
    const pkg = await Package.findById(id);
    
    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Check if invoice is already processed
    if (pkg.invoiceStatus === 'billed') {
      return NextResponse.json({ 
        error: 'Invoice has already been processed and billed. Cannot modify.' 
      }, { status: 400 });
    }

    if (action === 'reject') {
      // Reject the invoice
      pkg.invoiceStatus = 'rejected';
      pkg.invoiceReviewedAt = new Date();
      pkg.invoiceReviewedBy = session.user?.name || session.user?.email || 'admin';
      pkg.invoiceRejectionReason = rejectionReason || 'No reason provided';
      // Reset invoice upload status so customer can resubmit
      pkg.invoiceUploaded = false;
      
      await pkg.save();
      
      return NextResponse.json({
        success: true,
        message: 'Invoice rejected successfully',
        packageId: id,
        status: 'rejected'
      });
    }

    if (action === 'approve') {
      // Approve the invoice
      pkg.invoiceStatus = 'approved';
      pkg.invoiceReviewedAt = new Date();
      pkg.invoiceReviewedBy = session.user?.name || session.user?.email || 'admin';
      
      await pkg.save();

      // Generate bill if requested
      if (data.generateBill) {
        try {
          // Get customer information first
          const userIdString = typeof pkg.userId === 'string' ? pkg.userId : pkg.userId?.toString();
          const customer = await User.findById(userIdString);
          
          if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
          }

          // Get customer name from available fields
          const getCustomerName = (customer: any) => {
            if (customer.name) return customer.name;
            if (customer.firstName && customer.lastName) return `${customer.firstName} ${customer.lastName}`;
            if (customer.firstName) return customer.firstName;
            return 'Valued Customer';
          };

          // Calculate fees
          const itemValue = pkg.pricePaid || 0;
          const shippingFeeValue = shippingFee || 0;
          const customsFeeValue = customsFee || 0;
          
          // Calculate additional fees total
          const additionalFeesTotal = (additionalFees || []).reduce(
            (sum: number, fee: { amount: number }) => sum + (fee.amount || 0), 
            0
          );
          
          const totalAmount = itemValue + shippingFeeValue + customsFeeValue + additionalFeesTotal;

          console.log('Creating bill with data:', {
            customerId: pkg.userId,
            packages: [{
              packageId: pkg._id,
              trackingNumber: pkg.trackingNumber,
              shipper: pkg.shipper || pkg.senderName,
              weight: pkg.weight,
              itemValue: itemValue,
              shippingFee: shippingFeeValue,
              customsFee: customsFeeValue,
              total: itemValue + shippingFeeValue + customsFeeValue
            }],
            itemTotal: itemValue,
            shippingFee: shippingFeeValue,
            customsFee: customsFeeValue,
            additionalFees: additionalFees || [],
            totalAmount: totalAmount,
            status: 'pending',
            adminNotes: adminNotes
          });

          // Create the bill
          const bill = new Bill({
            customerId: pkg.userId,
            customerName: getCustomerName(customer),
            customerEmail: customer.email,
            packages: [{
              packageId: pkg._id,
              trackingNumber: pkg.trackingNumber,
              shipper: pkg.shipper || pkg.senderName,
              weight: pkg.weight,
              itemValue: itemValue,
              shippingFee: shippingFeeValue,
              customsFee: customsFeeValue,
              total: itemValue + shippingFeeValue + customsFeeValue
            }],
            itemTotal: itemValue,
            shippingFee: shippingFeeValue,
            customsFee: customsFeeValue,
            additionalFees: additionalFees || [],
            totalAmount: totalAmount,
            status: 'pending',
            adminNotes: adminNotes
          });

          await bill.save();
          console.log('Bill saved successfully:', bill.billNumber);

          // Update package with bill reference
          pkg.invoiceStatus = 'billed';
          pkg.billId = bill.billNumber;
          await pkg.save();

          // Send billing email to customer
          let emailSent = false;
          let emailErrorMsg = '';
          try {
            console.log('Found customer for email:', { name: customer.name, email: customer.email, _id: customer._id });
            
            if (customer.email) {

              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.cleanjshipping.com';
              const paymentLink = `${baseUrl}/customer/pay/${bill.billNumber}`;

              console.log('Sending billing email to:', customer.email);
              console.log('Payment link:', paymentLink);
              console.log('Email config check:', {
                hasHost: !!process.env.SMTP_HOST,
                hasUser: !!process.env.SMTP_USER,
                hasPass: !!process.env.SMTP_PASS
              });

              emailSent = await emailService.sendBillingEmail({
                to: customer.email,
                customerName: getCustomerName(customer),
                billNumber: bill.billNumber,
                packages: [{
                  trackingNumber: pkg.trackingNumber,
                  shipper: pkg.shipper || pkg.senderName || 'Unknown',
                  weight: pkg.weight || 0,
                  itemValue: itemValue,
                  shippingFee: shippingFeeValue,
                  customsFee: customsFeeValue,
                  total: itemValue + shippingFeeValue + customsFeeValue,
                  content: pkg.content || pkg.description || pkg.itemDescription || 'N/A'
                }],
                itemTotal: itemValue,
                shippingFee: shippingFeeValue,
                customsFee: customsFeeValue,
                additionalFees: additionalFees || [],
                totalAmount: totalAmount,
                paymentLink
              });

              console.log('Email send result:', emailSent);

              if (emailSent) {
                // Update bill status to sent
                bill.status = 'sent';
                bill.sentAt = new Date();
                await bill.save();
                console.log('Bill status updated to sent');
              } else {
                emailErrorMsg = 'Email service returned false';
                console.error('Email service returned false - email not sent');
              }
            } else {
              emailErrorMsg = customer ? 'Customer has no email' : 'Customer not found';
              console.error('Customer not found or no email address. userId:', userIdString);
            }
          } catch (emailError) {
            emailErrorMsg = emailError instanceof Error ? emailError.message : 'Unknown error';
            console.error('Error sending billing email:', emailError);
            // Log full error details
            if (emailError instanceof Error) {
              console.error('Email error details:', {
                message: emailError.message,
                stack: emailError.stack
              });
            }
          }

          return NextResponse.json({
            success: true,
            message: emailSent 
              ? 'Invoice approved and bill generated successfully. Email sent to customer.' 
              : `Invoice approved and bill generated successfully. Email could not be sent: ${emailErrorMsg}`,
            packageId: id,
            billId: bill._id,
            billNumber: bill.billNumber,
            status: 'billed',
            totalAmount: totalAmount,
            emailSent: emailSent,
            emailError: emailErrorMsg || undefined
          });
        } catch (billError) {
          console.error('Error creating bill:', billError);
          return NextResponse.json({
            error: 'Failed to create bill: ' + (billError instanceof Error ? billError.message : 'Unknown error')
          }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Invoice approved successfully',
        packageId: id,
        status: 'approved'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error processing invoice approval:', error);
    return NextResponse.json(
      { error: 'Failed to process invoice approval' },
      { status: 500 }
    );
  }
}
