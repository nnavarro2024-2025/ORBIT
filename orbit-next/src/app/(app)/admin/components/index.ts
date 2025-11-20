// Core shell
export { AdminLayout } from "./common/AdminLayout";
export { LoadingState } from "./common/LoadingState";
export { ErrorState } from "./common/ErrorState";
export { EquipmentDisplay } from "./common/EquipmentDisplay";
// Re-export sections for backward compatibility via the new folder
// Sections: prefer `Sections.*` namespace access over individual re-exports.
// Core orchestrator components moved into `core/` for structure clarity
export { AdminContent } from "./core/AdminContent";
export { default as AdminPageClient } from "./core/AdminPageClient";
export { Countdown } from "./common/Countdown";

export * as Overview from "./overview";
export * as Sections from "./sections";
export * as Common from "./common/index";
