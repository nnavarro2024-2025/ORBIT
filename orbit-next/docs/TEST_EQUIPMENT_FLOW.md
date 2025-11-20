# Equipment Flow Manual Test Instructions

## Prerequisites
1. Dev server running on `http://localhost:3000`
2. Two accounts:
   - Regular user: `test@uic.edu.ph` 
   - Admin user: `admin@uic.edu.ph`

## Test Flow

### Part 1: Create Booking with Equipment (as User)

1. **Login as regular user**
   - Navigate to `http://localhost:3000/login`
   - Login with: `test@uic.edu.ph` / `password123`

2. **Create a booking with equipment**
   - Go to Booking Dashboard
   - Click "New Booking"
   - Select a facility and time slot
   - **Check all equipment items:**
     - ✅ Whiteboard & Markers
     - ✅ Projector
     - ✅ Extension Cord
     - ✅ HDMI Cable
     - ✅ Extra Chairs
   - **Add "Other details"**: Type `test equipment flow details`
   - Submit the booking

3. **Verify submission**
   - Check Activity Logs → Notification Logs
   - Should see "Equipment Needs Submitted" with all 5 items + other details
   - **BUG TO CHECK**: Do you see numeric indices (0 1 2 3 4) or actual item names?

---

### Part 2: Mark Equipment Status (as Admin)

1. **Logout and login as admin**
   - Logout from user account
   - Navigate to `http://localhost:3000/login`
   - Login with: `admin@uic.edu.ph` / `admin123`

2. **Find the booking**
   - Go to Admin Dashboard → Booking Management → Scheduled Facilities
   - Find the booking you just created (should show equipment badge)

3. **Open equipment check modal**
   - Click "🔎 Check Equipment" button on the booking
   - Modal should open showing all 6 items:
     - whiteboard
     - projector
     - extension cord
     - hdmi
     - extra chairs
     - test equipment flow details

4. **Mark mixed statuses** (THIS IS THE BUG WE'RE TESTING)
   - Set the following:
     - **whiteboard**: ❌ Not available (red X button)
     - **projector**: ✅ Prepared (green ✓ button)
     - **extension_cord**: ❌ Not available
     - **hdmi**: ✅ Prepared
     - **extra_chairs**: ❌ Not available
     - **test**: ✅ Prepared
   
5. **Confirm and verify save**
   - Click "Confirm" button
   - **EXPECTED**: 
     - Button shows "Saving..." briefly
     - Modal closes after save
     - Toast notification appears
   - **BUG TO CHECK**: 
     - Does button stay enabled/disabled incorrectly?
     - Does modal close?
     - Does a loading state appear?

6. **Verify persistence (CRITICAL TEST)**
   - Refresh the page (F5)
   - Find the same booking again
   - Click "🔎 Check Equipment" again
   - **EXPECTED**: All items should show their colors:
     - **RED** items: whiteboard, extension_cord, extra_chairs
     - **GREEN** items: projector, hdmi, test
   - **BUG TO CHECK**: Are all items gray/default? (This indicates save failed)

---

### Part 3: Update to All Prepared

1. **Change all to prepared**
   - With modal still open, click green ✓ for ALL items
   - Click "Confirm"
   
2. **Verify final state**
   - Refresh page
   - Open modal again
   - **ALL items should be GREEN** (prepared)

---

## What The Fixes Should Accomplish

1. **Activity Logs**: Show actual equipment names, not "0 1 2 3 4"
2. **Notification Bell**: Show all selected items + "Other details" separately
3. **Equipment Modal**:
   - Loads with correct colors when reopened
   - Shows "Saving..." when clicking Confirm
   - Closes after successful save
   - Persists selections after refresh

## Console Debug Commands

If needed, run these in browser console:

```javascript
// Check current booking data
const booking = /* click on booking in list to get reference */;
console.log('Equipment:', booking.equipment);
console.log('Admin Response:', booking.adminResponse);

// Check local state
console.log('bookingItemStatus:', /* access from React DevTools */);
```

## Expected Results Summary

✅ **Activity Logs**: `whiteboard`, `projector`, `extension_cord`, `hdmi`, `extra_chairs`  
✅ **Notification Bell**: All items listed + "Other details: test equipment flow details"  
✅ **Equipment Modal**: Colors persist after refresh  
✅ **Save Flow**: Modal closes, toast shows, loading state appears  

## If Bugs Still Exist

Report which step fails:
- [ ] Activity Logs showing numbers
- [ ] Notification bell missing items
- [ ] Modal not showing colors after refresh
- [ ] Confirm button not working
- [ ] Modal not closing after save
