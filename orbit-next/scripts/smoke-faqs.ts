import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

import { eq, inArray } from "drizzle-orm";

import "../src/server/utils/json-parse-patch";
import * as schema from "../../shared/schema";
import { db } from "../src/server/config";
import { storage } from "../src/server/core";

const { faqs, activityLogs } = schema;

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
};

loadEnv();

const SMOKE_PREFIX = "SMOKE FAQ";

async function runSmokeTest() {
  console.log("🔍 Starting FAQ CRUD smoke test\n");

  const initialFaqs = await storage.getFaqs();
  console.log(`• Initial FAQ count: ${initialFaqs.length}`);

  const testId = randomUUID();
  const question = `${SMOKE_PREFIX}: ${testId}`;
  const basePayload = {
    category: "Technical",
    question,
    answer: "This is a temporary smoke-test FAQ answer.",
    sortOrder: 999,
  } as const;

  const logIds: string[] = [];

  // CREATE
  const created = await storage.createFaq(basePayload);
  console.log(`• Created FAQ ${created.id}`);

  const createLogId = randomUUID();
  await storage.createActivityLog({
    id: createLogId,
    action: "FAQ Created (smoke)",
    details: `Created ${question}`,
    userId: null,
    ipAddress: null,
    userAgent: "smoke-test",
    createdAt: new Date(),
  });
  logIds.push(createLogId);

  // VERIFY CREATE
  const afterCreate = await db.select().from(faqs).where(eq(faqs.id, created.id));
  if (afterCreate.length !== 1) {
    throw new Error("FAQ creation verification failed");
  }

  // UPDATE
  const updatedAnswer = `${basePayload.answer} (updated)`;
  await storage.updateFaq(created.id, { answer: updatedAnswer, sortOrder: 950 });
  console.log("• Updated FAQ answer and sort order");

  const updateLogId = randomUUID();
  await storage.createActivityLog({
    id: updateLogId,
    action: "FAQ Updated (smoke)",
    details: `Updated ${question}`,
    userId: null,
    ipAddress: null,
    userAgent: "smoke-test",
    createdAt: new Date(),
  });
  logIds.push(updateLogId);

  const afterUpdate = await db.select().from(faqs).where(eq(faqs.id, created.id));
  if (afterUpdate[0]?.answer !== updatedAnswer || afterUpdate[0]?.sortOrder !== 950) {
    throw new Error("FAQ update verification failed");
  }

  // DELETE
  await storage.deleteFaq(created.id);
  console.log("• Deleted FAQ");

  const deleteLogId = randomUUID();
  await storage.createActivityLog({
    id: deleteLogId,
    action: "FAQ Deleted (smoke)",
    details: `Deleted ${question}`,
    userId: null,
    ipAddress: null,
    userAgent: "smoke-test",
    createdAt: new Date(),
  });
  logIds.push(deleteLogId);

  const afterDelete = await db.select().from(faqs).where(eq(faqs.id, created.id));
  if (afterDelete.length !== 0) {
    throw new Error("FAQ deletion verification failed");
  }

  // VERIFY LOGS
  const smokeLogs = await db
    .select()
    .from(activityLogs)
    .where(inArray(activityLogs.id, logIds));

  console.log(`• Activity logs created: ${smokeLogs.length}`);

  if (smokeLogs.length !== logIds.length) {
    throw new Error("Activity log verification failed");
  }

  // Clean up logs to keep table tidy
  await db.delete(activityLogs).where(inArray(activityLogs.id, logIds));
  console.log("• Cleaned up smoke-test activity logs");

  console.log("\n✅ FAQ CRUD smoke test passed\n");
}

runSmokeTest().catch((error) => {
  console.error("❌ Smoke test failed", error);
  process.exit(1);
});
