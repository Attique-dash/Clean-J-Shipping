// src/pages/api/admin/protected-route.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Check authorization (admin role required)
  if (session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        // Example: Get data from database
        const data = await prisma.someModel.findMany();
        return res.status(200).json(data);

      case 'POST':
        // Example: Create new record
        const newRecord = await prisma.someModel.create({
          data: req.body,
        });
        return res.status(201).json(newRecord);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
}