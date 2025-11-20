# Activity Logs - Quick Start Guide

## 🎯 What You Got

A complete Activity Logs system with:
- **Beautiful table view** with search and filtering
- **Detailed modal** that opens when you click any log
- **Full API integration** with the database
- **Admin dashboard integration** - already wired up!

## 🚀 Where to Find It

### Option 1: Admin Dashboard (Recommended)
1. Log in as an admin
2. Navigate to **Admin Dashboard** (`/admin`)
3. Click **"Admin Activity Logs"** in the left sidebar
4. Click the **"All Activity Logs"** tab

### Option 2: Direct Page
- Go to `/admin/activity-logs` directly

## 🎨 What It Looks Like

### Main View
```
┌─────────────────────────────────────────────────────┐
│  Activity Logs                            🔍 Search │
│  View and search through system activity logs       │
│                                                      │
│  ┌───────────────────┬──────────┬──────────┬──────┐│
│  │ Timestamp         │ User     │ Action   │ Desc ││
│  ├───────────────────┼──────────┼──────────┼──────┤│
│  │ Nov 20, 2:30 PM  │ user123  │ CREATE   │ ...  ││ ← Click to open modal
│  │ Nov 20, 2:25 PM  │ user456  │ UPDATE   │ ...  ││
│  │ Nov 20, 2:20 PM  │ admin1   │ DELETE   │ ...  ││
│  └───────────────────┴──────────┴──────────┴──────┘│
└─────────────────────────────────────────────────────┘
```

### Modal (Click any row)
```
┌────────────────────────────────────────┐
│  Activity Log Details              ✕   │
├────────────────────────────────────────┤
│  🕐 Timestamp                          │
│     November 20, 2025 at 2:30:45 PM   │
│                                        │
│  👤 User                               │
│     user123@example.com                │
│                                        │
│  ⚡ Action / Event                     │
│     CREATE_BOOKING                     │
│                                        │
│  📝 Description                        │
│     Created booking for Collaborative  │
│     Learning Room from 14:00 to 16:00 │
│                                        │
│  📊 Additional Metadata                │
│     🌐 IP: 192.168.1.100              │
│     💻 User Agent: Mozilla/5.0...     │
└────────────────────────────────────────┘
```

## 🔑 Key Features

### Search & Filter
- **Search bar**: Type to search across action, details, or user
- **Action filter**: Dropdown to filter by specific action types
- **Real-time**: Results update as you type

### Color Coding
- 🔴 **Red badges**: Delete, remove, ban (destructive actions)
- 🔵 **Blue badges**: Create, add, approve (creation actions)
- 🟡 **Yellow badges**: Update, edit, modify (modification actions)
- ⚪ **Gray badges**: Other actions

### Interactions
- **Hover**: Rows highlight when you hover over them
- **Click**: Click any row to see full details
- **Close**: Click outside modal or ✕ button to close

## 📝 Creating Activity Logs

### In Your Code
```typescript
import { storage } from "@/server/storage";

// Example: Log a user action
await storage.createActivityLog({
  userId: user.id,
  action: "CREATE_BOOKING",
  details: "Created booking for Room A from 2pm to 4pm",
  ipAddress: request.headers.get("x-forwarded-for") || "unknown",
  userAgent: request.headers.get("user-agent") || "unknown",
  createdAt: new Date(),
});
```

### For Testing
```bash
# Create sample activity logs
cd orbit-next
node --loader ts-node/esm scripts/seed-activity-logs.ts
```

## 🔒 Permissions

- **Admins**: Can view ALL activity logs
- **Users**: Can only view their OWN activity logs
- **Guests**: Not allowed (must be logged in)

## 💡 Pro Tips

1. **Use descriptive actions**: `CREATE_BOOKING`, `UPDATE_USER`, `DELETE_FACILITY`
2. **Add details**: Include relevant context in the details field
3. **Search is smart**: Searches across action, details, and user
4. **Filter to narrow**: Use the action filter when you know what you're looking for

## 📱 Mobile Friendly

The component works great on mobile devices:
- Responsive table layout
- Touch-friendly buttons
- Scrollable modal content
- Adaptive spacing

## 🎯 Common Use Cases

1. **Audit Trail**: See who did what and when
2. **Debugging**: Track down when an issue occurred
3. **User Activity**: Monitor specific user actions
4. **Security**: Review suspicious activities
5. **Compliance**: Generate activity reports

## 🛠️ Customization

### Change the Limit
```tsx
<ActivityLogs limit={200} />  // Show 200 logs instead of 50
```

### Show User-Specific Logs
```tsx
<ActivityLogs userId="user123" />  // Only show logs for this user
```

### Use in Custom Pages
```tsx
import { ActivityLogs } from "@/components/ActivityLogs";

export default function MyPage() {
  return (
    <div className="container">
      <h1>My Activity History</h1>
      <ActivityLogs userId={currentUser.id} limit={25} />
    </div>
  );
}
```

## ❓ Troubleshooting

### No logs showing?
- Make sure activity logs exist in the database
- Check if you're logged in as admin (to see all logs)
- Run the seed script to create sample data

### Modal not opening?
- Check browser console for errors
- Make sure you're clicking on the table rows
- Verify the log data is loading correctly

### Search not working?
- Type at least one character
- Try different search terms
- Check the action filter isn't too restrictive

## 📚 More Info

See `ACTIVITY_LOGS_COMPONENT.md` for complete documentation including:
- Full API reference
- Database schema details
- Advanced usage examples
- Accessibility features
- Performance considerations

## ✅ That's It!

Your Activity Logs component is ready to use. Just navigate to the admin dashboard and check out the "All Activity Logs" tab!
