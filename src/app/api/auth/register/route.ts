import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User } from '@/models/User';
import { ShippingAddress } from '@/models/ShippingAddress';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { sendWelcomeEmail } from '@/utils/welcomeEmail';

// Validation schema
const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name must be less than 100 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20, 'Phone number is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
  dateOfBirth: z.string().optional(),
  address: z.object({
    parish: z.string().min(1, 'Parish/State is required').max(50, 'Parish name is too long'),
    city: z.string().min(1, 'City is required').max(50, 'City name is too long'),
    street: z.string().min(1, 'Street address is required').max(200, 'Street address is too long'),
    zipCode: z.string().min(1, 'ZIP code is required').max(20, 'ZIP code is too long'),
  }),
});

// Generate unique mailbox number
async function generateMailboxNumber(): Promise<string> {
  await dbConnect();
  const prefix = 'MB';
  
  // Get the highest existing mailbox number
  const lastUser = await User.findOne({
    mailboxNumber: { $exists: true, $regex: `^${prefix}` }
  })
  .sort({ mailboxNumber: -1 })
  .select('mailboxNumber');

  let nextNumber = 1001; // Start from MB1001
  
  if (lastUser && lastUser.mailboxNumber) {
    const lastNum = parseInt(lastUser.mailboxNumber.replace(prefix, ''));
    nextNumber = lastNum + 1;
  }

  return `${prefix}${nextNumber}`;
}

// Generate US shipping addresses
function generateShippingAddresses(fullName: string, mailboxNumber: string) {
  const baseAirAddress = {
    street: "1234 Shipping Way, Suite 100",
    city: "Miami",
    state: "FL",
    zipCode: "33101",
    country: "United States"
  };

  const baseOceanAddress = {
    street: "5678 Port Boulevard, Warehouse B",
    city: "Miami", 
    state: "FL",
    zipCode: "33102",
    country: "United States"
  };

  return {
    airFreight: {
      fullName,
      mailboxNumber,
      company: "Clean J Shipping - Air Freight Division",
      ...baseAirAddress
    },
    oceanFreight: {
      fullName,
      mailboxNumber,
      company: "Clean J Shipping - Ocean Freight Division", 
      ...baseOceanAddress
    }
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Register API] Registration attempt for:', body.email);

    // Validate input
    const validatedData = registerSchema.parse(body);

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: validatedData.email.toLowerCase() },
        { phone: validatedData.phone }
      ]
    });

    if (existingUser) {
      if (existingUser.email === validatedData.email.toLowerCase()) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        );
      }
      if (existingUser.phone === validatedData.phone) {
        return NextResponse.json(
          { error: 'An account with this phone number already exists' },
          { status: 400 }
        );
      }
    }

    // Generate mailbox number
    const mailboxNumber = await generateMailboxNumber();
    
    // Generate shipping addresses
    const shippingAddresses = generateShippingAddresses(validatedData.fullName, mailboxNumber);

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Split full name into first and last name
    const nameParts = validatedData.fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create user
    const user = new User({
      firstName,
      lastName,
      fullName: validatedData.fullName,
      email: validatedData.email.toLowerCase(),
      phone: validatedData.phone,
      passwordHash,
      mailboxNumber,
      airFreightAddress: shippingAddresses.airFreight,
      oceanFreightAddress: shippingAddresses.oceanFreight,
      dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
      role: 'customer',
      accountStatus: 'active',
      isActive: true,
      isVerified: false,
      address: {
        street: validatedData.address.street,
        city: validatedData.address.city,
        state: validatedData.address.parish,
        country: 'Jamaica'
      },
    });

    await user.save();

    // Create default shipping address
    const defaultAddress = new ShippingAddress({
      userId: user._id,
      label: 'Home',
      contactName: validatedData.fullName,
      phone: validatedData.phone,
      address: validatedData.address.street,
      city: validatedData.address.city,
      state: validatedData.address.parish,
      zipCode: validatedData.address.zipCode,
      country: 'Jamaica',
      isDefault: true,
      isActive: true,
    });

    await defaultAddress.save();

    console.log('[Register API] User created successfully:', {
      id: user._id,
      email: user.email,
      mailboxNumber: user.mailboxNumber,
    });

    // Send welcome email with shipping addresses
    try {
      const emailResult = await sendWelcomeEmail({
        fullName: user.fullName,
        email: user.email,
        mailboxNumber: user.mailboxNumber,
        airFreightAddress: user.airFreightAddress,
        oceanFreightAddress: user.oceanFreightAddress,
      });
      
      if (emailResult.success) {
        console.log('[Register API] Welcome email sent successfully');
      } else {
        console.error('[Register API] Failed to send welcome email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('[Register API] Error sending welcome email:', emailError);
      // Don't fail the registration if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        mailboxNumber: user.mailboxNumber,
        airFreightAddress: user.airFreightAddress,
        oceanFreightAddress: user.oceanFreightAddress,
      }
    });

  } catch (error) {
    console.error('[Register API] Error:', error);

    if (error instanceof z.ZodError) {
      // Format all validation errors for better user feedback
      const errorMessages = error.errors.map(err => {
        const field = err.path.join('.');
        const message = err.message;
        return `${field}: ${message}`;
      });
      
      console.error('[Register API] Validation errors:', errorMessages);
      
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: errorMessages,
          message: errorMessages[0] // Return first error as primary message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred during registration' },
      { status: 500 }
    );
  }
}
