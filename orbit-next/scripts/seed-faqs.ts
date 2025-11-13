import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";

import "../src/server/json-parse-patch";
import * as schema from "../../shared/schema";

const { faqs } = schema;

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

const samples: Array<{ category: string; question: string; answer: string; sortOrder: number }> = [
  {
    category: "General",
    question: "How do I access the facility booking dashboard?",
    answer: "Log in with your UIC credentials, then choose Booking Dashboard from the sidebar. You can browse availability, request new bookings, and review your upcoming reservations.",
    sortOrder: 10,
  },
  {
    category: "Booking",
    question: "How far in advance can I submit a booking request?",
    answer: "Submit booking requests at least 30 minutes before your desired start time. You can request times up to 30 days in advance, depending on facility availability.",
    sortOrder: 20,
  },
  {
    category: "Policies",
    question: "What happens if I need to cancel my booking?",
    answer: "Open the booking dashboard, locate your reservation, and choose Cancel Booking. Please cancel at least 30 minutes before the start time so others can use the facility.",
    sortOrder: 30,
  },
  {
    category: "Facilities",
    question: "Which equipment is included with study rooms?",
    answer: "Standard study rooms include whiteboards, HDMI-ready monitors, and power outlets. Additional equipment such as projectors or extension cords can be requested in the booking form.",
    sortOrder: 40,
  },
  // Guidelines represented as FAQ entries
  {
    category: "Policies",
    question: "What are the normal booking hours?",
    answer: "Bookings are generally available during school hours: 7:30 AM – 7:00 PM. Requests outside these hours are reviewed by staff and may be scheduled automatically; you'll be notified of any changes.",
    sortOrder: 50,
  },
  {
    category: "Policies",
    question: "Who is eligible to book and are there room restrictions?",
    answer: "All registered users can book standard study rooms. Some facilities (e.g., Board Room and Lounge) may be restricted to faculty or administrators. If a room is restricted, you will see a notice when attempting to book.",
    sortOrder: 60,
  },
  {
    category: "Booking",
    question: "How should I choose group size and capacity?",
    answer: "Enter your expected number of participants and do not exceed the facility's capacity. Each facility card shows its maximum capacity to help you select an appropriate space.",
    sortOrder: 70,
  },
  {
    category: "Policies",
    question: "Can I change a booking after I submit it?",
    answer: "You can edit upcoming or pending bookings. If the change conflicts with an existing reservation or equipment availability, staff will contact you to reschedule.",
    sortOrder: 80,
  },
  {
    category: "Policies",
    question: "What conduct is expected when using study rooms?",
    answer: "Keep noise appropriate for a study environment, leave the space clean, return furniture and equipment to original positions, and report any damage to staff immediately.",
    sortOrder: 90,
  },
];

async function seedFaqs() {
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  for (const sample of samples) {
    const existing = await db
      .select()
      .from(faqs)
      .where(eq(faqs.question, sample.question))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(faqs).values(sample).execute();
      created.push(sample.question);
      continue;
    }

    const current = existing[0];
    const needsUpdate =
      current.answer !== sample.answer ||
      current.category !== sample.category ||
      (current.sortOrder ?? 0) !== sample.sortOrder;

    if (needsUpdate) {
      await db
        .update(faqs)
        .set({
          category: sample.category,
          answer: sample.answer,
          sortOrder: sample.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(faqs.id, current.id))
        .execute();
      updated.push(sample.question);
    } else {
      skipped.push(sample.question);
    }
  }

  const allFaqs = await db.select().from(faqs).orderBy(faqs.sortOrder);

  console.log("\n📚 FAQ seeding summary:");
  console.log(`   ➕ Created: ${created.length}`);
  created.forEach((q) => console.log(`      - ${q}`));
  console.log(`   ✏️  Updated: ${updated.length}`);
  updated.forEach((q) => console.log(`      - ${q}`));
  console.log(`   ↪️  Skipped (already up to date): ${skipped.length}`);
  skipped.forEach((q) => console.log(`      - ${q}`));
  console.log("\n📄 Current FAQ order:");
  allFaqs.forEach((faq, index) => {
    console.log(`   ${index + 1}. [${faq.category}] ${faq.question} (sortOrder=${faq.sortOrder})`);
  });

  await pool.end();
}

seedFaqs()
  .then(() => {
    console.log("\n✅ Seed process complete");
  })
  .catch(async (error) => {
    console.error("❌ Seed process failed", error);
    await pool.end();
    process.exit(1);
  });
