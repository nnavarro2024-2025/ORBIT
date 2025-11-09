// This file runs before any other code in Next.js
// We use it to patch JSON.parse to handle "undefined" strings gracefully
// This fixes an issue where the pg driver tries to parse JSONB columns
// that contain the string "undefined" instead of null

export function register() {
  if (typeof globalThis !== "undefined") {
    const originalParse = JSON.parse;
    JSON.parse = function (text: string, reviver?: any) {
      // Handle undefined/null strings
      if (text === null || text === undefined) {
        return null;
      }
      const trimmed = String(text).trim();
      if (trimmed === "undefined" || trimmed === "" || trimmed === "null") {
        return null;
      }
      try {
        return originalParse.call(this, text, reviver);
      } catch (e) {
        // If it still fails, log and return null
        console.warn("[JSON.parse] Failed to parse, returning null:", trimmed.substring(0, 100));
        return null;
      }
    };
  }
}
