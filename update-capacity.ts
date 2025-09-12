import { db } from './server/db.ts';
import { facilities } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

// Update Collaborative Learning Room 2 capacity from 10 to 8
async function updateRoom2Capacity() {
  try {
    const result = await db
      .update(facilities)
      .set({ 
        capacity: 8,
        description: 'Computer lab with workstations'
      })
      .where(eq(facilities.name, 'Collaraborative Learning Room 2'))
      .returning();
    
    console.log('✅ Updated facility:', result);
    console.log('Updated Collaborative Learning Room 2 capacity to 8 people');
  } catch (error) {
    console.error('❌ Error updating capacity:', error);
  }
  
  // Show all current facilities to verify
  try {
    const allFacilities = await db.select().from(facilities);
    console.log('\n📋 Current facilities:');
    allFacilities.forEach(facility => {
      console.log(`- ${facility.name}: ${facility.capacity} people`);
    });
  } catch (error) {
    console.error('❌ Error fetching facilities:', error);
  }
  
  process.exit(0);
}

updateRoom2Capacity();
