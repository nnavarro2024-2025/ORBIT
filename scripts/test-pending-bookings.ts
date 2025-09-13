import { randomUUID } from 'crypto';
import { storage } from '../server/storage';

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function run() {
  console.log('[test] Starting pending bookings test');

  // Ensure at least one facility exists
  let facilities = await storage.getAllFacilities();
  let facility = facilities[0];
  if (!facility) {
    console.log('[test] No facilities found - creating sample facility');
    facility = await storage.createFacility({ name: 'Test Room', description: 'Auto-created for tests', capacity: 8 });
  }

  // Create two test users
  const userAId = `test-user-a-${randomUUID()}`;
  const userBId = `test-user-b-${randomUUID()}`;

  await storage.upsertUser({ id: userAId, email: `${userAId}@example.com`, firstName: 'Test', lastName: 'A', role: 'student', status: 'active', createdAt: new Date(), updatedAt: new Date() });
  await storage.upsertUser({ id: userBId, email: `${userBId}@example.com`, firstName: 'Test', lastName: 'B', role: 'student', status: 'active', createdAt: new Date(), updatedAt: new Date() });

  // Booking times: 1 hour from now to 2 hours from now
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const bookingA = await storage.createFacilityBooking({
    id: randomUUID(),
    facilityId: facility.id,
    userId: userAId,
    startTime: start,
    endTime: end,
    participants: 2,
    purpose: 'Testing pending A',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);

  const bookingB = await storage.createFacilityBooking({
    id: randomUUID(),
    facilityId: facility.id,
    userId: userBId,
    startTime: start,
    endTime: end,
    participants: 3,
    purpose: 'Testing pending B',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);

  console.log('[test] Created bookings:');
  console.log(' - A:', bookingA.id, bookingA.status);
  console.log(' - B:', bookingB.id, bookingB.status);

  // Now approve bookingA (simulate admin action)
  console.log('[test] Approving booking A -> this should trigger auto-deny of B');
  await storage.updateFacilityBooking(bookingA.id, { status: 'approved', updatedAt: new Date() } as any);

  // Run the same auto-deny logic as server
  const all = await storage.getAllFacilityBookings();
  const approved = all.find(b => b.id === bookingA.id);
  if (!approved) {
    console.error('[test] Approved booking not found after update');
    return process.exit(1);
  }

  const others = all.filter((b) =>
    b.facilityId === approved.facilityId &&
    b.status === 'pending' &&
    new Date(b.startTime) < new Date(approved.endTime) &&
    new Date(b.endTime) > new Date(approved.startTime) &&
    b.id !== approved.id
  );

  console.log('[test] Found overlapping pending bookings to deny:', others.map(o => o.id));

  for (const other of others) {
    await storage.updateFacilityBooking(other.id, { status: 'denied', adminResponse: 'Automatically denied: time slot already booked', updatedAt: new Date() } as any);
    await storage.createSystemAlert({
      id: randomUUID(),
      type: 'booking',
      severity: 'low',
      title: 'Booking Denied - Slot Taken',
      message: `Your booking request for ${facility.name} from ${new Date(other.startTime).toLocaleString()} to ${new Date(other.endTime).toLocaleString()} was denied because the time slot was already booked.`,
      userId: other.userId,
      isRead: false,
      createdAt: new Date(),
    } as any);
  }

  // Small sleep to allow DB propagation
  await sleep(500);

  const finalA = await storage.getFacilityBooking(bookingA.id);
  const finalB = await storage.getFacilityBooking(bookingB.id);

  console.log('[test] Final statuses:');
  console.log(' - A:', finalA?.id, finalA?.status);
  console.log(' - B:', finalB?.id, finalB?.status);

  const alerts = await storage.getSystemAlerts();
  console.log('[test] Alerts for users:', alerts.filter(a => a.userId === userAId || a.userId === userBId).map(a => ({ id: a.id, userId: a.userId, title: a.title })));

  console.log('[test] Done');
  process.exit(0);
}

run().catch(err => {
  console.error('[test] Error', err);
  process.exit(1);
});
