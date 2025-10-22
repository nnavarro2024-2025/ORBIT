import { storage } from '../server/storage';

async function main() {
  try {
    const facilities = await storage.getAllFacilities();
    console.log('Facilities:', facilities.map(f => ({ id: f.id, name: f.name, capacity: f.capacity, isActive: f.isActive }))); 
    process.exit(0);
  } catch (err) {
    console.error('Failed to list facilities:', err);
    process.exit(1);
  }
}

main();
