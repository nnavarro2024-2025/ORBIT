# 🧪 Test Credentials for ORBIT System

## Quick Login Credentials

### Regular User Account

- **Email**: `test@uic.edu.ph`
- **Password**: `123`
- **Role**: Student/User
- **Access**: Booking Dashboard, Room Reservations

### Admin Account

- **Email**: `admin@uic.edu.ph`
- **Password**: `123`
- **Role**: Administrator
- **Access**: Admin Dashboard, User Management, All System Features

## How to Use

1. Navigate to the login page: `http://localhost:5173/login`
2. In development mode, you'll see test credential buttons
3. Click "Fill User Login" or "Fill Admin Login" to auto-populate fields
4. Click "Sign In" to authenticate

## Features Available

### As Regular User (`test@uic.edu.ph`)

- ✅ View available study rooms
- ✅ Create facility bookings
- ✅ Manage personal bookings
- ✅ View booking history
- ✅ Update notification settings

### As Admin (`admin@uic.edu.ph`)

- ✅ All user features +
- ✅ Approve/deny booking requests
- ✅ Manage facilities
- ✅ View system analytics
- ✅ User management
- ✅ System settings

## Auto-Creation

These test accounts are automatically created when the server starts up in development mode. The credentials are stored in Supabase authentication and will persist across server restarts.

## School Hours

Remember that the system enforces school working hours:

- **Operating Hours**: 7:30 AM - 5:00 PM
- Bookings outside these hours will be rejected
- Facilities show as "School Closed" outside operating hours

## Test Facilities

The system includes sample facilities:

1. **Collaborative Learning Room 1** (Capacity: 8 people)
2. **Collaborative Learning Room 2** (Capacity: 10 people)
3. **Board Room** (Capacity: 12 people)

---

_Note: These credentials are only available in development mode and should not be used in production._
