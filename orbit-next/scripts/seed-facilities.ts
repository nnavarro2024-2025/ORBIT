/**
 * Seed Facilities Script
 * Creates sample facilities in the database
 * Usage: npx tsx scripts/seed-facilities.ts (from orbit-next directory)
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";

import "../src/server/utils/json-parse-patch";
import * as schema from "../../shared/schema";

const { facilities } = schema;

const loadEnv = () => {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.warn(`⚠️  No .env.local file found at ${envPath}`);
    return;
  }

  const content = readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...rest] = trimmed.split("=");
    if (!key || rest.length === 0) return;
    const value = rest.join("=").trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
  console.log("✅ Loaded environment from .env.local");
};

loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL is not set. Please configure it in .env.local");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
});

const db = drizzle(pool, { schema });

const facilityTemplates: Array<{
  name: string;
  description: string;
  capacity: number;
  image?: string;
}> = [
  {
    name: "Study Room A",
    description: "Small study room for individual or pair work. Equipped with whiteboard and desk.",
    capacity: 2,
    image: "/images/study-room.jpg",
  },
  {
    name: "Study Room B",
    description: "Medium study room with seating for small groups. Includes HDMI monitor and projector.",
    capacity: 4,
    image: "/images/study-room.jpg",
  },
  {
    name: "Study Room C",
    description: "Large study room perfect for group projects. Whiteboard, monitor, and extended seating.",
    capacity: 6,
    image: "/images/study-room.jpg",
  },
  {
    name: "Board Room",
    description: "Professional board room for meetings and presentations. Projector, video conferencing setup. Faculty/Admin only.",
    capacity: 10,
    image: "/images/board-room.jpg",
  },
  {
    name: "Computer Lab",
    description: "Room with 20 desktop computers for coursework and programming. Managed access.",
    capacity: 20,
    image: "/images/computer-lab.jpg",
  },
  {
    name: "Lounge",
    description: "Casual seating area for collaboration and informal meetings. Faculty/Admin only.",
    capacity: 12,
    image: "/images/lounge.jpg",
  },
  {
    name: "Seminar Room",
    description: "Mid-sized room suitable for workshops and seminars. Includes projector and sound system.",
    capacity: 30,
    image: "/images/seminar-room.jpg",
  },
];

async function seedFacilities() {
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  for (const template of facilityTemplates) {
    const existing = await db
      .select()
      .from(facilities)
      .where(eq(facilities.name, template.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(facilities).values({
        ...template,
        isActive: true,
      }).execute();
      created.push(template.name);
      continue;
    }

    const current = existing[0];
    const needsUpdate =
      current.description !== template.description ||
      current.capacity !== template.capacity ||
      (current.image ?? null) !== (template.image ?? null);

    if (needsUpdate) {
      await db
        .update(facilities)
        .set({
          description: template.description,
          capacity: template.capacity,
          image: template.image || null,
        })
        .where(eq(facilities.id, current.id))
        .execute();
      updated.push(template.name);
    } else {
      skipped.push(template.name);
    }
  }

  const allFacilities = await db.select().from(facilities);

  console.log("\n🏢 Facility seeding summary:");
  console.log(`  ✅ Created: ${created.length} new facilities`);
  if (created.length > 0) {
    created.forEach((name) => console.log(`     - ${name}`));
  }

  console.log(`  🔄 Updated: ${updated.length} existing facilities`);
  if (updated.length > 0) {
    updated.forEach((name) => console.log(`     - ${name}`));
  }

  console.log(`  ⏭️  Skipped: ${skipped.length} unchanged facilities`);

  console.log(`\n📊 Total facilities in database: ${allFacilities.length}`);
  console.log("   Facilities:");
  allFacilities.forEach((f) => {
    console.log(`     - ${f.name} (capacity: ${f.capacity}, active: ${f.isActive})`);
  });

  console.log("\n✨ Facility seeding complete!");
  process.exit(0);
}

seedFacilities().catch((err) => {
  console.error("❌ Facility seeding failed:", err);
  process.exit(1);
});
