import { BarChart3, Calendar, Users, Shield, Settings, Home, HelpCircle, CalendarClock, Plus, CheckCircle } from "lucide-react";

type RawItem = {
  id: string;
  label?: string;
  icon?: any;
  type?: 'item' | 'divider';
  role?: 'student' | 'faculty' | 'admin';
};

export function makeSidebar(isAdmin: boolean, lastItem?: RawItem, forPage: 'admin' | 'booking' | 'student' = 'student', userRole?: 'student' | 'faculty' | 'admin'): RawItem[] {
  // For student/booking page with role-based filtering
  if (forPage === 'booking') {
    const role = userRole || (isAdmin ? 'admin' : 'student');
    
    // STUDENT ROLE - Limited access
    if (role === 'student') {
      const studentItems: RawItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'available-rooms', label: 'Available Study Rooms', icon: Home },
        { id: 'my-bookings', label: 'My Bookings', icon: Calendar },
        { id: 'faqs', label: 'FAQs', icon: HelpCircle },
      ];
      if (isAdmin && lastItem) {
        studentItems.push({ id: 'divider-1', type: 'divider' });
        studentItems.push(lastItem);
      }
      return studentItems;
    }
    
    // FACULTY ROLE - Can manage facilities and approve bookings
    if (role === 'faculty') {
      const facultyItems: RawItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'available-rooms', label: 'Available Study Rooms', icon: Home },
        { id: 'my-bookings', label: 'My Bookings', icon: Calendar },
        { id: 'divider-faculty-1', type: 'divider' },
        { id: 'add-facility', label: 'Add Facilities', icon: Plus },
        { id: 'manage-reservations', label: 'Manage Reservations', icon: BarChart3 },
        { id: 'scheduled-bookings', label: 'Scheduled Bookings', icon: CalendarClock },
        { id: 'approve-bookings', label: 'Approve Bookings', icon: CheckCircle },
        { id: 'faqs', label: 'FAQs', icon: HelpCircle },
      ];
      if (isAdmin && lastItem) {
        facultyItems.push({ id: 'divider-faculty-2', type: 'divider' });
        facultyItems.push(lastItem);
      }
      return facultyItems;
    }
    
    // ADMIN ROLE - Full access to all student/faculty features
    const adminBookingItems: RawItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'new-booking', label: 'New Booking', icon: Plus },
      { id: 'my-bookings', label: 'My Bookings', icon: Calendar },
      { id: 'available-rooms', label: 'Available Study Rooms', icon: Home },
      { id: 'activity-logs', label: 'Activity Logs', icon: BarChart3 },
      { id: 'faqs', label: 'FAQs', icon: HelpCircle },
    ];
    if (isAdmin && lastItem) {
      adminBookingItems.push({ id: 'divider-1', type: 'divider' });
      adminBookingItems.push(lastItem);
    }
    return adminBookingItems;
  }

  // For admin page, use labels that match the admin sidebar (stable order)
  if (forPage === 'admin') {
    const adminCore: RawItem[] = [
      { id: 'overview', label: 'Dashboard', icon: Home },
      { id: 'booking-management', label: 'Facility Booking Management', icon: Calendar },
      { id: 'facility-management', label: 'Manage Facilities', icon: Plus },
      { id: 'report-schedules', label: 'Report Schedules', icon: CalendarClock },
      { id: 'user-management', label: 'User Management', icon: Users },
      { id: 'security', label: 'Admin System Alerts', icon: Shield },
      { id: 'faq-management', label: 'FAQ Management', icon: HelpCircle },
      { id: 'admin-activity-logs', label: 'Admin Activity Logs', icon: BarChart3 },
      { id: 'settings', label: 'System Settings', icon: Settings },
    ];
    if (isAdmin && lastItem) {
      return adminCore.concat([{ id: 'divider-1', type: 'divider' }, lastItem]);
    }
    return adminCore;
  }

  // Default: generic core for other pages
  const core: RawItem[] = [
    { id: 'overview', label: 'Dashboard', icon: BarChart3 },
    { id: 'booking-management', label: 'Booking Management', icon: Calendar },
    { id: 'user-management', label: 'User Management', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  if (isAdmin && lastItem) {
    return core.concat([{ id: 'divider-1', type: 'divider' }, lastItem]);
  }
  return core;
}

export type SidebarItemRaw = RawItem;
