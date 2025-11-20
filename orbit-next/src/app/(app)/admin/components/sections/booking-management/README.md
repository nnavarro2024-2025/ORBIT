# Booking Management Section

Purpose: Operational monitoring of facility bookings (active vs scheduled).

Files:
- `BookingManagementSection.tsx`: Presentation logic (copied directly; no refactors).
- `tabs.ts`: Central tab constants mapping UI labels to existing internal values (`active`, `pendingList`).
- `index.ts`: Re-export interface and component for cleaner imports.

Do not rename existing tab values unless you also update all parent state/control logic. Add new tabs via `tabs.ts`.
