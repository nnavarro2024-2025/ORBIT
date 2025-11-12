/**
 * Global JSON.parse patch to handle invalid string values like "undefined" or "null".
 * This module must be imported before the pg driver is loaded so that any code
 * that relies on JSON.parse (including pg's built-in type parsers) uses the patched version.
 */

if (typeof JSON !== "undefined" && typeof JSON.parse === "function") {
  const originalParse = JSON.parse;

  JSON.parse = function (this: unknown, text: unknown, reviver?: any) {
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
    } catch (error) {
      return null;
    }
  } as any;
}

export {}; // Ensure this file is treated as a module
