# Admin Dashboard Testing Guide

## Overview

The admin dashboard has been fixed and now includes proper authorization, all required API endpoints, and sample data for testing.

## Features Fixed

### ✅ Authorization

- Admin role verification before accessing dashboard
- Proper middleware for admin-only routes
- Development feature to promote users to admin for testing

### ✅ API Endpoints Added

- `/api/admin/stats` - Dashboard statistics
- `/api/admin/sessions` - Active ORZ sessions
- `/api/admin/alerts` - System alerts
- `/api/admin/activity` - Activity logs
- `/api/bookings/pending` - Pending facility bookings
- `/api/bookings/:id/approve` - Approve bookings
- `/api/bookings/:id/deny` - Deny bookings
- `/api/orz/time-extension/pending` - Pending time extensions
- `/api/orz/time-extension/:id/approve` - Approve time extensions
- `/api/orz/time-extension/:id/deny` - Deny time extensions
- `/api/admin/users` - Get users by role
- `/api/admin/users/:id/promote` - Promote users to different roles

### ✅ Sample Data

- Admin user: `admin@taskmasterpro.com`
- Sample student users
- Sample facilities and computer stations
- Sample pending bookings and time extensions
- Sample system alerts

## How to Test

### 1. Access Admin Dashboard

1. Navigate to `/admin` in your application
2. If you don't have admin role, you'll see an access denied page
3. Click the "🧪 Promote to Admin (Dev)" button to get admin access
4. Refresh the page after promotion

### 2. Test Admin Features

- **Dashboard Overview**: View statistics, recent activity, and pending approvals
- **ORZ Management**: Monitor active computer sessions and approve time extensions
- **Facility Management**: Approve or deny facility booking requests
- **Security Management**: View system alerts
- **Reports**: View usage statistics

### 3. Test Admin Actions

- Approve/deny facility bookings
- Approve/deny time extension requests
- View system alerts and activity logs
- Monitor active ORZ sessions

## Sample Data Created

### Users

- **Admin**: `admin@taskmasterpro.com` (role: admin)
- **Students**: `student1@test.com`, `student2@test.com`, `student3@test.com` (role: student)

### Facilities

- Study Room A (4 seats)
- Study Room B (8 seats)
- Conference Room (20 seats)
- Computer Lab (15 seats)

### Computer Stations

- Station 1-5 in ORZ Labs A, B, and C

### Sample Data

- 3 pending facility bookings
- 2 active ORZ sessions
- 2 pending time extension requests
- 2 system alerts

## Development Features

### Promote to Admin

- Click the "🧪 Promote to Admin (Dev)" button on the access denied page
- This is for development/testing purposes only
- Should be removed in production

### Sample Data Generation

- Sample data is automatically created when the server starts
- Data is only created if it doesn't already exist
- Check server logs for data creation messages

## Security Notes

⚠️ **Important**: The development promotion feature should be removed in production. In a real environment, admin roles should be assigned through a secure administrative process.

## Troubleshooting

### Common Issues

1. **Access Denied**: Make sure you have admin role or use the promotion button
2. **No Data**: Check server logs for sample data creation messages
3. **API Errors**: Ensure all routes are properly registered and middleware is working

### Server Logs

Look for these messages during startup:

- `👤 [ADMIN] Creating sample admin user`
- `🏢 [FACILITIES] No facilities found, creating sample facilities`
- `💻 [SAMPLE] Creating sample computer stations`
- `📅 [SAMPLE] Creating sample pending bookings`
- `🚨 [SAMPLE] Creating sample system alerts`
- `💻 [SAMPLE] Creating sample ORZ sessions`
- `⏱️ [SAMPLE] Creating sample time extension requests`


