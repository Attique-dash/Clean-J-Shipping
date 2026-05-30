/**
 * Askenish/KCD legacy path alias → /api/kcd/packages/add
 */
import { NextRequest } from 'next/server';
import { GET as kcdGetAdd, POST as kcdPostAdd } from '@/app/api/kcd/packages/add/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return kcdGetAdd(req);
}

export async function POST(req: NextRequest) {
  return kcdPostAdd(req);
}
