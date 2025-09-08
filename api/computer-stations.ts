import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../server/db-vercel';
import { computerStations } from '../shared/schema';
import * as cors from 'cors';

// Initialize CORS middleware
const corsMiddleware = (cors as any)({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});

// Helper to run middleware
function runMiddleware(req: VercelRequest, res: VercelResponse, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Run CORS middleware
  await runMiddleware(req, res, corsMiddleware);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      try {
        // Try to get from database first
        const stations = await db.select().from(computerStations);
        
        if (stations.length > 0) {
          return res.status(200).json(stations);
        }
      } catch (dbError) {
        console.log('Database not available, using fallback data');
      }

      // Fallback to static data if database is not available
      const fallbackStations = [
        {
          id: 1,
          name: "Station 1",
          location: "ORZ Lab A",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          name: "Station 2", 
          location: "ORZ Lab A",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 3,
          name: "Station 3",
          location: "ORZ Lab B", 
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 4,
          name: "Station 4",
          location: "ORZ Lab B",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 5,
          name: "Station 5",
          location: "ORZ Lab C",
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];

      return res.status(200).json(fallbackStations);
    }

    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}