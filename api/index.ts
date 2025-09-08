import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ 
    message: 'TaskMasterPro API',
    version: '1.0.0',
    endpoints: {
      facilities: '/api/facilities',
      computerStations: '/api/computer-stations',
      auth: '/api/auth/*'
    }
  });
}