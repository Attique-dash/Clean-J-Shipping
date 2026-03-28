import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined; // eslint-disable-line no-unused-vars
}

// Check if we're in a build/SSG environment where DB connection isn't available
const isBuildPhase = typeof window === 'undefined' && (
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.NEXT_PHASE === 'phase-export' ||
  (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI)
);

// Prevent multiple instances of Prisma Client in development
// Skip initialization during build phase to avoid path resolution errors
let prisma: PrismaClient;

if (isBuildPhase) {
  // Return a dummy PrismaClient for build phase
  prisma = {} as PrismaClient;
} else {
  prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
  }
}

export { prisma };
export default prisma;
