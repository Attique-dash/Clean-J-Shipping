/**
 * Askenish/KCD legacy path alias → /api/kcd/customers
 */
import { NextRequest } from 'next/server';
import { GET as kcdGetCustomers, POST as kcdPostCustomers } from '@/app/api/kcd/customers/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return kcdGetCustomers(req);
}

export async function POST(req: NextRequest) {
  return kcdPostCustomers(req);
}
