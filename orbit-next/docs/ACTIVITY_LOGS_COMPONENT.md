# Activity Logs Component

## Overview

The Activity Logs component provides a comprehensive interface for viewing and searching through system activity logs. It includes a table/list view for browsing logs and a detailed modal for viewing complete log information.

## Features

- **Table View**: Clean, responsive table displaying activity logs with key information
- **Search & Filter**: Real-time search by action, details, or user with action-based filtering
- **Modal Details**: Click any log entry to view full details in a beautiful modal
- **Smooth Transitions**: Polished animations and hover effects for better UX
- **User-Friendly**: Color-coded badges, icons, and clear information hierarchy
- **Responsive**: Works seamlessly on desktop and mobile devices
- **Permission-Based**: Admins can view all logs, users see only their own

## Components

### 1. ActivityLogs (Main Component)
Location: `src/components/ActivityLogs.tsx`

Main component that displays the activity logs table with search and filter capabilities.

**Props:**
- `userId?: string` - Optional filter to show logs for a specific user
- `limit?: number` - Maximum number of logs to fetch (default: 50, max: 500)

**Usage:**
```tsx
import { ActivityLogs } from "@/components/ActivityLogs";

// Show all logs (admin view)
<ActivityLogs />

// Show logs for specific user
<ActivityLogs userId="user123" />

// Custom limit
<ActivityLogs limit={100} />
```

### 2. ActivityLogModal
Location: `src/components/modals/ActivityLogModal.tsx`

Modal component that displays detailed information about a selected activity log.

**Props:**
- `log: ActivityLog | null` - The log entry to display
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Callback when modal is closed

**Features:**
- Timestamp with full date/time formatting
- User information (if available)
- Action badge with color coding
- Full description with proper text wrapping
- Metadata section (IP address, user agent)
- Unique log ID display
- Smooth open/close animations

## API Endpoint

### GET /api/activity-logs

Fetches activity logs from the database.

**Query Parameters:**
- `userId` (optional) - Filter logs by specific user ID
- `limit` (optional) - Number of results to return (default: 50, max: 500)

**Permissions:**
- Admins can view all logs or filter by any user
- Regular users can only view their own logs

**Example Requests:**
```bash
# Get all logs (admin only)
GET /api/activity-logs

# Get logs for specific user
GET /api/activity-logs?userId=user123

# Get 100 most recent logs
GET /api/activity-logs?limit=100
```

## Database Schema

The activity logs use the existing `activity_logs` table defined in `shared/schema.ts`:

```typescript
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  details: text("details"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

## Usage Examples

### Admin Dashboard Page
```tsx
"use client";

import { ActivityLogs } from "@/components/ActivityLogs";

export default function AdminActivityLogsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <ActivityLogs />
    </div>
  );
}
```

### User Profile Page (Own Logs)
```tsx
"use client";

import { ActivityLogs } from "@/components/ActivityLogs";
import { useAuth } from "@/hooks/useAuth";

export default function UserActivityPage() {
  const { user } = useAuth();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <ActivityLogs userId={user?.id} limit={25} />
    </div>
  );
}
```

### Embedded in a Dashboard
```tsx
import { ActivityLogs } from "@/components/ActivityLogs";

export default function Dashboard() {
  return (
    <div className="grid gap-6">
      <h1>System Dashboard</h1>
      
      {/* Other dashboard content */}
      
      <div className="mt-8">
        <ActivityLogs limit={10} />
      </div>
    </div>
  );
}
```

## Creating Activity Logs

To create new activity logs in your application, use the storage service:

```typescript
import { storage } from "@/server/storage";

// Example: Log a booking creation
await storage.createActivityLog({
  userId: user.id,
  action: "CREATE_BOOKING",
  details: `Created booking for ${facility.name} from ${startTime} to ${endTime}`,
  ipAddress: request.headers.get("x-forwarded-for") || "unknown",
  userAgent: request.headers.get("user-agent") || "unknown",
  createdAt: new Date(),
});

// Example: Log an admin action
await storage.createActivityLog({
  userId: admin.id,
  action: "APPROVE_BOOKING",
  details: `Approved booking ${bookingId} for user ${userId}`,
  ipAddress: request.headers.get("x-forwarded-for") || "unknown",
  userAgent: request.headers.get("user-agent") || "unknown",
  createdAt: new Date(),
});
```

## Action Types & Badge Colors

The component automatically color-codes actions:

- **Red (Destructive)**: delete, remove, ban, reject
- **Blue (Default)**: create, add, approve, grant
- **Yellow (Secondary)**: update, edit, modify, change
- **Gray (Outline)**: view, read, access, other actions

## Styling & Theming

The component uses:
- Tailwind CSS for styling
- shadcn/ui components for consistent design
- Lucide React icons for visual elements
- Class Variance Authority (CVA) for variant management

All colors automatically adapt to your theme (light/dark mode).

## Accessibility

- Keyboard navigation support
- Screen reader friendly with proper ARIA labels
- Focus management in modal
- Semantic HTML structure
- Proper color contrast

## Performance

- React Query for efficient data caching
- Optimized re-renders with proper memoization
- Lazy loading for large datasets
- Client-side filtering for instant search results

## Browser Support

Works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Future Enhancements

Potential improvements:
- Export logs to CSV/PDF
- Date range filtering
- Bulk actions
- Real-time log streaming
- Advanced search with regex
- Log retention policies
- Audit trail signing
