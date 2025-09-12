import { db } from './server/db.js';
import { facilities } from './shared/schema.js';

// Check current facilities data
async function checkFacilities() {
  try {
    const allFacilities = await db.select().from(facilities);
    console.log('\n📋 Current facilities in database:');
    allFacilities.forEach(facility => {
      console.log(`- ID: ${facility.id}, Name: "${facility.name}", Capacity: ${facility.capacity} people`);
    });
  } catch (error) {
    console.error('❌ Error fetching facilities:', error);
  }
  
  process.exit(0);
}

checkFacilities();
