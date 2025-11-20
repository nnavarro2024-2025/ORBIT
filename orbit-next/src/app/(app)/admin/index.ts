export { default as AdminPageClient } from "./components/core/AdminPageClient";
export { AdminContent } from "./components";

export * as Sections from "./components/sections";
export * as Overview from "./components/overview";

// Hooks: expose a flat surface (no groups namespace)
export * from "./hooks";
export * as hooks from "./hooks";

// Lib re-exports and namespace
export * from "./lib";
export * as lib from "./lib";