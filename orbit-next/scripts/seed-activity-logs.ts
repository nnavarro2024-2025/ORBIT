/**
 * Test script to create sample activity logs
 * Run with: node --loader ts-node/esm scripts/seed-activity-logs.ts
 */

import { storage } from "../src/server/core";

const sampleActions = [
  {
    action: "USER_LOGIN",
    details: "User successfully logged in from new device",
    userId: null, // Will be replaced with actual user
  },
  {
    action: "CREATE_BOOKING",
    details: "Created booking for Collaborative Learning Room 1 from 2025-11-20 14:00 to 2025-11-20 16:00",
  },
  {
    action: "APPROVE_BOOKING",
    details: "Approved booking request #12345 for Collaborative Learning Room 2",
  },
  {
    action: "UPDATE_FACILITY",
    details: "Updated facility 'Board Room' - changed capacity from 10 to 12",
  },
  {
    action: "DELETE_BOOKING",
    details: "Cancelled booking #67890 due to facility maintenance",
  },
  {
    action: "BAN_USER",
    details: "Temporarily banned user for violating booking policies",
  },
  {
    action: "CREATE_FAQ",
    details: "Added new FAQ in category 'Booking Rules': How do I extend my booking?",
  },
  {
    action: "UPDATE_PROFILE",
    details: "User updated profile information (phone number, department)",
  },
  {
    action: "VIEW_REPORT",
    details: "Generated and viewed monthly facility usage report",
  },
  {
    action: "EDIT_BOOKING",
    details: "Modified booking #11111 - changed end time from 15:00 to 16:30",
  },
];

async function seedActivityLogs() {
  console.log("🌱 Seeding activity logs...");

  try {
    // Get first user to assign logs to
    const users = await storage.getAllUsers();
    if (users.length === 0) {
      console.error("❌ No users found in database. Please create users first.");
      process.exit(1);
    }

    const testUser = users[0];
    console.log(`📝 Using user: ${testUser.email} (${testUser.id})`);

    // Create sample activity logs
    for (const sample of sampleActions) {
      const log = {
        id: undefined as any, // Will be auto-generated
        userId: sample.userId || testUser.id,
        action: sample.action,
        details: sample.details,
        ipAddress: "192.168.1." + Math.floor(Math.random() * 255),
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time within last week
      };

      await storage.createActivityLog(log);
      console.log(`✅ Created log: ${sample.action}`);
    }

    console.log("\n✨ Successfully seeded activity logs!");
    console.log("\n📊 Test the component at: /admin/activity-logs");
  } catch (error) {
    console.error("❌ Error seeding activity logs:", error);
    process.exit(1);
  }
}

// Run if executed directly
seedActivityLogs();
