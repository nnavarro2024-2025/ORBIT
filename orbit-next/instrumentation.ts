// This file runs before any other code in Next.js
// Patch JSON.parse IMMEDIATELY to handle "undefined" strings from PostgreSQL JSONB

// Patch at module level (runs immediately when file is loaded)
if (typeof JSON !== "undefined" && typeof JSON.parse === "function") {
  const originalParse = JSON.parse;
  (JSON as any).parse = function (this: unknown, text: unknown, reviver?: any) {
    if (text === null || text === undefined) return null;
    const str = String(text).trim();
    if (
      str === "undefined" ||
      str === "null" ||
      str === "" ||
      str === '"undefined"' ||
      str === '"null"' ||
      str === '""'
    ) {
      return null;
    }
    try {
      return originalParse.call(this, text as any, reviver);
    } catch (e) {
      console.warn('[JSON.parse] Parse failed, returning null:', str.substring(0, 50));
      return null;
    }
  };
}

export function register() {
  // Register function is still required but patch already applied above
  console.log('[instrumentation] JSON.parse patch active');
}
