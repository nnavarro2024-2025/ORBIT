# Admin Activity Logs Section

Purpose: Auditing and monitoring of booking lifecycle outcomes and system/security events.

Structure:
- `AdminActivityLogsSection.tsx`: Presentation and filtering logic (unchanged from original).
- `tabs.ts`: Central tab value constants (`success`, `history`, `system`).
- `index.ts`: Re-exports component and tab constants.

Do not modify logic here; orchestration/state is handled by parent core components. Add new tab values only via `tabs.ts`.
