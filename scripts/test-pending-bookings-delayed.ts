import { randomUUID } from 'crypto';
import { storage } from '../server/storage';

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function run() {
  console.log('[test-delayed] Starting delayed pending bookings test');

  let facilities = await storage.getAllFacilities();
  let facility = facilities[0];
  if (!facility) {
    console.log('[test-delayed] No facilities found - creating sample facility');
    facility = await storage.createFacility({ name: 'Test Room Delayed', description: 'Auto-created for delayed tests', capacity: 8 });
  }

  const userAId = `test-user-del-A-${randomUUID()}`;
  const userBId = `test-user-del-B-${randomUUID()}`;

  await storage.upsertUser({ id: userAId, email: `${userAId}@example.com`, firstName: 'Test', lastName: 'A', role: 'student', status: 'active', createdAt: new Date(), updatedAt: new Date() });
  await storage.upsertUser({ id: userBId, email: `${userBId}@example.com`, firstName: 'Test', lastName: 'B', role: 'student', status: 'active', createdAt: new Date(), updatedAt: new Date() });

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
    purpose: 'Delayed pending A',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);

  console.log('[test-delayed] Created booking A:', bookingA.id, bookingA.status);

  console.log('[test-delayed] Waiting 10 seconds before creating booking B...');
  await sleep(10000);

  const bookingB = await storage.createFacilityBooking({
    id: randomUUID(),
    facilityId: facility.id,
    userId: userBId,
    startTime: start,
    endTime: end,
    participants: 3,
    purpose: 'Delayed pending B',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);

  console.log('[test-delayed] Created booking B:', bookingB.id, bookingB.status);

  console.log('[test-delayed] Approving booking A -> should auto-deny B');
  await storage.updateFacilityBooking(bookingA.id, { status: 'approved', updatedAt: new Date() } as any);

  // Re-run auto-deny logic similar to server
  const all = await storage.getAllFacilityBookings();
  const approved = all.find(b => b.id === bookingA.id);
  if (!approved) {
    console.error('[test-delayed] Approved booking not found after update');
    process.exit(1);
  }
  const others = all.filter((b) =>
    b.facilityId === approved.facilityId &&
    b.status === 'pending' &&
    new Date(b.startTime) < new Date(approved.endTime) &&
    new Date(b.endTime) > new Date(approved.startTime) &&
    b.id !== approved.id
  );

  console.log('[test-delayed] Overlapping pendings to deny:', others.map(o => o.id));

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

  const finalA = await storage.getFacilityBooking(bookingA.id);
  const finalB = await storage.getFacilityBooking(bookingB.id);

  console.log('[test-delayed] Final statuses: A=', finalA?.status, 'B=', finalB?.status);

  const alerts = await storage.getSystemAlerts();
  console.log('[test-delayed] Alerts for users:', alerts.filter(a => a.userId === userAId || a.userId === userBId).map(a => ({ id: a.id, userId: a.userId, title: a.title })));

  console.log('[test-delayed] Done');
  process.exit(0);
}

run().catch(err => {
  console.error('[test-delayed] Error', err);
  process.exit(1);
});
