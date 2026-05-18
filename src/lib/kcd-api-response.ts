import { NextResponse } from 'next/server';
import type { KcdPackage } from '@/types/kcd-package';

export function kcdPackageCreatedResponse(
  packages: KcdPackage[],
  extras?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: true,
      message: 'Package created successfully',
      data: packages,
      packages,
      ...extras,
    },
    { status: 201 }
  );
}

export function kcdPackageSuccessResponse(
  packages: KcdPackage[],
  message: string,
  status = 200,
  extras?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data: packages,
      packages,
      ...extras,
    },
    { status }
  );
}

export function kcdErrorResponse(
  message: string,
  status: number,
  extras?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      message,
      data: [],
      ...extras,
    },
    { status }
  );
}
