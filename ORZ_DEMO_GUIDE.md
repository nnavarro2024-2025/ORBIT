# 🎮 ORZ Dashboard Guide

## 🚀 Quick Start

### 1. **Access the ORZ Dashboard**

- Navigate to `/orz` in your browser
- You should see the ORZ Computer Session Dashboard

### 2. **System Setup**

The system automatically creates sample data including:

- ✅ **5 Computer Stations** (Station 1-5 in ORZ Labs A, B, C)
- ✅ **5 Facilities** (Study rooms, labs, etc.)

## 🎯 Core Features

### **Student Session Management**

1. **Start a Session**
   - From the ORZ Dashboard, view the list of available computer stations.
   - Click "Start Session on [Station Name]" to begin your session.
2. **Monitor Your Session**
   - See computer station name
   - Real-time countdown timer
   - Session start time
   - Auto-logout warning
3. **Request Time Extension**
   - Click "Request Time Extension" button
   - Fill out the form to request additional time.
   - Submit for admin approval
4. **End Session**
   - Click "End Session" button
   - Session ends immediately
5. **View Recent Sessions**
   - Scroll down to "Recent Sessions" table
   - See past sessions with:
     - Date and time
     - Station used
     - Duration
     - Status (Completed/Active)

### **Facility Booking**

1. **Find a Facility**
   - Navigate to the "Book a Facility" page.
   - Browse the list of available facilities like study rooms and meeting rooms.
2. **Make a Reservation**
   - Select a facility to view its schedule.
   - Choose an available time slot and fill in the booking details (purpose, participants).
3. **Check Your Bookings**
   - Go to "My Bookings" to see the status of your pending and approved reservations.

## 🔧 Admin Features

### **Access Admin Dashboard**

1. Navigate to `/admin`

### **Manage ORZ Sessions**

1. **Monitor Active Sessions**
   - See all users with active sessions
   - Monitor session durations
   - Track station usage
2. **Manage Time Extensions**
   - Navigate to "ORZ Management" section
   - See pending time extension requests
   - Click "Approve" or "Deny"

### **Manage Facility Bookings**

1. **Review Pending Requests**
   - From the admin dashboard, go to the "Facility Bookings" section.
   - View all pending reservation requests from students and faculty.
2. **Approve or Deny**
   - Click on a request to see the details.
   - Approve or deny the booking, adding a note if necessary. The user will be notified.

---

## 🧪 Testing Checklist

### **Student Features**

- [ ] View available stations
- [ ] Start new session
- [ ] View active session with timer
- [ ] Request time extension
- [ ] End session manually
- [ ] View session history

### **Admin Features**

- [ ] Access admin dashboard
- [ ] View all active sessions
- [ ] Approve time extension
- [ ] Deny time extension

### **Facility Booking Features**

- [ ] View available facilities
- [ ] Submit a new booking request
- [ ] View personal booking history and status
- [ ] Admin can view pending bookings
- [ ] Admin can approve a booking
- [ ] Admin can deny a booking

### **System Features**

- [ ] Auto-logout after inactivity
- [ ] Session expiration handling
- [ ] Real-time updates
- [ ] Error handling
- [ ] Authentication checks

---

**🎮 Happy Testing!**
