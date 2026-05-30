/**
 * Askenish/KCD legacy path alias → /api/kcd/packages/{trackingNumber}
 */
import { NextRequest } from 'next/server';
import {
  GET as kcdGetPackage,
  POST as kcdPostPackage,
} from '@/app/api/kcd/packages/[trackingNumber]/route';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { trackingNumber: string } };

export async function GET(req: NextRequest, context: RouteContext) {
  return kcdGetPackage(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  return kcdPostPackage(req, context);
}

/** Some warehouse configs send PUT for updates */
export async function PUT(req: NextRequest, context: RouteContext) {
  return kcdPostPackage(req, context);
}
