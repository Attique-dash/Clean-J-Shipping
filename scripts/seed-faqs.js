// scripts/seed-faqs.js
// Seed script to populate FAQ database with common questions

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const FAQSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, required: true, index: true },
  order: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
  views: { type: Number, default: 0 },
  helpful: { type: Number, default: 0 },
  notHelpful: { type: Number, default: 0 },
  createdBy: { type: String },
  updatedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const FAQ = mongoose.models.FAQ || mongoose.model('FAQ', FAQSchema);

const faqData = [
  // Shipping & Delivery
  {
    question: "How long does shipping take?",
    answer: "Shipping times vary depending on the service mode:\n\n• Air Freight: 5-10 business days\n• Ocean Freight: 20-30 business days\n• Local Delivery: 2-5 business days\n\nActual delivery times may vary based on customs clearance and destination.",
    category: "shipping",
    order: 1,
  },
  {
    question: "How do I track my package?",
    answer: "You can track your package in several ways:\n\n1. Log into your customer portal and go to 'My Packages'\n2. Use the tracking number provided in your email\n3. Visit the public tracking page and enter your tracking number\n\nYou'll receive real-time updates on your package status.",
    category: "shipping",
    order: 2,
  },
  {
    question: "What happens when my package arrives at the warehouse?",
    answer: "When your package arrives:\n\n1. We'll scan and register it in our system\n2. You'll receive an email notification with tracking details\n3. An invoice will be automatically generated\n4. You can upload your commercial invoice through the portal\n5. Once payment is received, we'll process and ship your package",
    category: "shipping",
    order: 3,
  },
  {
    question: "Can I consolidate multiple packages?",
    answer: "Yes! Package consolidation is available:\n\n• Combine multiple packages into one shipment\n• Save on shipping costs\n• Reduce customs fees\n• Request consolidation through your customer portal\n\nNote: Packages must be at the same warehouse location for consolidation.",
    category: "shipping",
    order: 4,
  },
  {
    question: "What if my package is damaged or lost?",
    answer: "We take package safety seriously:\n\n• All packages are insured during transit\n• Report damage within 48 hours of receipt\n• Contact our support team immediately\n• We'll investigate and process claims promptly\n\nInsurance coverage depends on the declared value of your items.",
    category: "shipping",
    order: 5,
  },

  // Rates & Pricing
  {
    question: "How are shipping costs calculated?",
    answer: "Shipping costs are based on:\n\n• Weight (kg or lbs)\n• Dimensions (length × width × height)\n• Service mode (Air/Ocean/Local)\n• Destination country\n• Declared value (for insurance)\n\nOur pricing calculator in the portal provides instant quotes. First 1 lb costs $700 JMD, each additional lb costs $350 JMD.",
    category: "rates",
    order: 1,
  },
  {
    question: "Are there any hidden fees?",
    answer: "No hidden fees! Our pricing is transparent:\n\n• Shipping charges (based on weight)\n• Customs duty (15% if item value > $100 USD)\n• Insurance (optional, based on declared value)\n• Storage fees (only after 30 days)\n\nAll fees are clearly displayed before you confirm your shipment.",
    category: "rates",
    order: 2,
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept multiple payment methods:\n\n• Credit/Debit Cards (Visa, Mastercard)\n• PayPal (for international payments)\n• Bank Transfer\n• Cash (at warehouse locations)\n• Test Card Payments (for testing purposes)\n\nPayments are processed securely through our payment gateway.",
    category: "rates",
    order: 3,
  },
  {
    question: "When do I need to pay?",
    answer: "Payment timing:\n\n• Invoice is generated when package arrives\n• Payment due within 30 days of invoice date\n• Early payment may qualify for discounts\n• Packages won't ship until payment is received\n\nYou can pay through your customer portal anytime.",
    category: "rates",
    order: 4,
  },
  {
    question: "Can I get a refund?",
    answer: "Refund policy:\n\n• Full refund if package is lost or severely damaged\n• Partial refund for service cancellations (before shipping)\n• No refund for shipped packages\n• Refunds processed within 5-10 business days\n\nContact support for refund requests.",
    category: "rates",
    order: 5,
  },

  // Policies & Terms
  {
    question: "What items are prohibited?",
    answer: "Prohibited items include:\n\n• Weapons and ammunition\n• Illegal drugs and substances\n• Perishable foods\n• Hazardous materials\n• Counterfeit goods\n• Cash and currency\n\nCheck our full prohibited items list in the customs policy section. Violations may result in package seizure.",
    category: "policies",
    order: 1,
  },
  {
    question: "What are the customs requirements?",
    answer: "Customs requirements:\n\n• Commercial invoice (required for items > $100 USD)\n• Accurate declared value\n• Item description and HS codes\n• Proof of purchase\n• May require additional documentation\n\nWe'll guide you through the customs process. Upload documents through your portal.",
    category: "policies",
    order: 2,
  },
  {
    question: "What is your storage policy?",
    answer: "Storage policy:\n\n• Free storage for first 30 days\n• Storage fees apply after 30 days\n• Packages held for maximum 90 days\n• Unclaimed packages may be returned or disposed\n• Contact us for storage extensions\n\nWe'll notify you before storage fees apply.",
    category: "policies",
    order: 3,
  },
  {
    question: "What is your return policy?",
    answer: "Return policy:\n\n• Returns accepted within 14 days of delivery\n• Items must be in original condition\n• Return shipping costs are customer's responsibility\n• Refunds processed after inspection\n• Some items are non-returnable\n\nContact support to initiate a return.",
    category: "policies",
    order: 4,
  },
  {
    question: "How do you handle personal data?",
    answer: "We protect your privacy:\n\n• All personal data is encrypted\n• We never share your information with third parties\n• Secure payment processing\n• GDPR compliant data handling\n• You can request data deletion anytime\n\nRead our full privacy policy for details.",
    category: "policies",
    order: 5,
  },

  // Account Management
  {
    question: "How do I create an account?",
    answer: "Creating an account is easy:\n\n1. Click 'Register' on the homepage\n2. Fill in your personal information\n3. Verify your email address\n4. Complete your profile\n5. Start shipping!\n\nYou'll receive a unique customer code (user code) for all your shipments.",
    category: "account",
    order: 1,
  },
  {
    question: "I forgot my password. How do I reset it?",
    answer: "Password reset process:\n\n1. Go to the login page\n2. Click 'Forgot Password'\n3. Enter your email address\n4. Check your email for reset link or OTP code\n5. Create a new password\n\nIf you don't receive the email, check your spam folder or contact support.",
    category: "account",
    order: 2,
  },
  {
    question: "How do I update my account information?",
    answer: "Update your account:\n\n1. Log into your customer portal\n2. Go to 'Account Settings'\n3. Edit your information\n4. Save changes\n\nYou can update:\n• Personal details\n• Shipping addresses\n• Payment methods\n• Notification preferences",
    category: "account",
    order: 3,
  },
  {
    question: "Can I have multiple shipping addresses?",
    answer: "Yes! You can add multiple addresses:\n\n• Add addresses in 'Account Settings'\n• Set a default address\n• Choose address at checkout\n• Edit or delete addresses anytime\n\nThis makes it easy to ship to different locations.",
    category: "account",
    order: 4,
  },
  {
    question: "How do I view my shipping history?",
    answer: "View your history:\n\n1. Log into customer portal\n2. Go to 'My Packages' for package history\n3. Go to 'Bills & Payments' for payment history\n4. Export data as CSV if needed\n\nAll your shipping and payment records are stored securely.",
    category: "account",
    order: 5,
  },

  // General Questions
  {
    question: "What is Clean J Shipping?",
    answer: "Clean J Shipping is a full-service shipping and logistics company:\n\n• International shipping from USA, UK, and more\n• Package consolidation services\n• Customs clearance assistance\n• Real-time tracking\n• Secure warehousing\n\nWe make international shipping simple and affordable.",
    category: "general",
    order: 1,
  },
  {
    question: "What are your business hours?",
    answer: "Our business hours:\n\n• Monday - Friday: 9:00 AM - 6:00 PM\n• Saturday: 10:00 AM - 2:00 PM\n• Sunday: Closed\n• Holidays: May vary\n\nWarehouse operations may have different hours. Check with your local warehouse.",
    category: "general",
    order: 2,
  },
  {
    question: "How do I contact customer support?",
    answer: "Contact us through:\n\n• Customer Portal: Send a message in 'Messages' section\n• Email: info@cleanshipping.com\n• Phone: 1 (876) 578-5945\n• Live Chat: Available in portal\n• Visit: Our warehouse locations\n\nWe typically respond within 24 hours.",
    category: "general",
    order: 3,
  },
  {
    question: "Do you offer insurance?",
    answer: "Yes, we offer insurance:\n\n• Coverage based on declared value\n• Protects against loss and damage\n• Optional but recommended\n• Premium calculated at checkout\n• Claims processed within 30 days\n\nInsurance is especially important for valuable items.",
    category: "general",
    order: 4,
  },
  {
    question: "Can I visit your warehouse?",
    answer: "Yes! Warehouse visits are welcome:\n\n• Schedule an appointment\n• Pick up packages in person\n• Inspect items before shipping\n• Meet with our team\n\nContact us to arrange a visit. Bring valid ID for package pickup.",
    category: "general",
    order: 5,
  },
];

async function seedFAQs() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI or DATABASE_URL not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing FAQs (optional - comment out if you want to keep existing)
    // await FAQ.deleteMany({});
    // console.log('🗑️  Cleared existing FAQs');

    // Insert FAQs
    let inserted = 0;
    let skipped = 0;

    for (const faq of faqData) {
      const exists = await FAQ.findOne({ 
        question: faq.question,
        category: faq.category 
      });

      if (!exists) {
        await FAQ.create(faq);
        inserted++;
        console.log(`✅ Added: ${faq.question.substring(0, 50)}...`);
      } else {
        skipped++;
        console.log(`⏭️  Skipped (already exists): ${faq.question.substring(0, 50)}...`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Inserted: ${inserted} FAQs`);
    console.log(`   ⏭️  Skipped: ${skipped} FAQs`);
    console.log(`   📝 Total: ${faqData.length} FAQs`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding FAQs:', error);
    process.exit(1);
  }
}

seedFAQs();

