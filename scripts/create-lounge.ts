import { storage } from '../server/storage';

async function main() {
  try {
    console.log('Checking for existing Lounge facility...');
    const facilities = await storage.getAllFacilities();
    const hasLounge = facilities.some((f: any) => /lounge/i.test(String(f.name || '')));
    if (hasLounge) {
      console.log('Lounge already exists. Nothing to do.');
      process.exit(0);
    }

    console.log('Creating Lounge facility...');
    const newFac = await storage.createFacility({
      name: 'Lounge',
      description: 'Comfortable lounge area for informal study and relaxation.',
      capacity: 10,
    });

    console.log('Created Lounge:', newFac);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create Lounge:', err);
    process.exit(1);
  }
}

main();
