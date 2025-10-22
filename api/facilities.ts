import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../server/db-vercel';
import { facilities, users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as cors from 'cors';
import { supabaseAdmin } from '../server/supabaseAdmin';

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
        // Get user from authorization header
        let userRole = null;
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);
            if (supabaseUser && !error) {
              // Get user from database
              const [dbUser] = await db.select().from(users).where(eq(users.id, supabaseUser.id)).limit(1);
              if (dbUser) {
                userRole = dbUser.role;
                console.log(`[API FACILITIES] User: ${dbUser.email}, Role: ${userRole}`);
              }
            }
          } catch (authError) {
            console.log('[API FACILITIES] Auth check failed:', authError);
          }
        }
        
        // Try to get from database first
        let dbFacilities = await db.select().from(facilities);
        
        // Filter for faculty role - only show Board Room and Lounge
        if (userRole === 'faculty') {
          console.log(`[API FACILITIES] Filtering for faculty - Before: ${dbFacilities.length} facilities`);
          dbFacilities = dbFacilities.filter((f: any) => 
            f.name.toLowerCase() === 'board room' || f.name.toLowerCase() === 'lounge'
          );
          console.log(`[API FACILITIES] After filter: ${dbFacilities.length} facilities`);
        }
        
        if (dbFacilities.length > 0) {
          return res.status(200).json(dbFacilities);
        }
      } catch (dbError) {
        console.log('Database not available, using fallback data');
      }

      // Fallback to static data if database is not available (for initial testing)
  const schoolFacilities = [
        {
          id: 1,
          name: "Collaraborative Learning Room 1",
          description: "Perfect for group study sessions and collaborative projects. Equipped with modern technology and comfortable seating.",
          capacity: 8,
          imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=250&fit=crop",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          name: "Collaraborative Learning Room 2",
          description: "Ideal for team meetings and study groups. Features whiteboards and presentation equipment.",
          capacity: 10,
          imageUrl: "https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=400&h=250&fit=crop",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 3,
          name: "Board Room",
          description: "Professional meeting space with conference table and presentation capabilities. Perfect for formal discussions.",
          capacity: 12,
          imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=250&fit=crop",
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];
      
  return res.status(200).json(schoolFacilities);
    }

    if (req.method === 'POST') {
      try {
        const facility = await db.insert(facilities).values(req.body).returning();
        return res.status(201).json(facility[0]);
      } catch (dbError) {
        console.error('Database insert error:', dbError);
        return res.status(500).json({ message: 'Database not available' });
      }
    }

    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}