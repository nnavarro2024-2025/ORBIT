import { BarChart3, Calendar, Users, Shield, Home, HelpCircle, CalendarClock, Building2, Landmark } from "lucide-react";

type RawItem = {
  id: string;
  label?: string;
  icon?: any;
  type?: 'item' | 'divider';
};

export function makeSidebar(isAdmin: boolean, lastItem?: RawItem, forPage: 'admin' | 'booking' | 'student' = 'student'): RawItem[] {
  // common core items (order must be stable)
  const core: RawItem[] = [
    { id: 'overview', label: 'Dashboard', icon: BarChart3 },
    { id: 'booking-management', label: 'Booking Management', icon: Calendar },
    { id: 'user-management', label: 'User Management', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    // Removed System Settings from sidebar
  ];

  // For student/booking page we prefer a slightly different top set
  if (forPage === 'booking') {
    const bookingCore: RawItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'new-booking', label: 'New Booking', icon: BarChart3 },
      { id: 'my-bookings', label: 'My Bookings', icon: Calendar },
      { id: 'available-rooms', label: 'Available Rooms', icon: Home },
      { id: 'activity-logs', label: 'Activity Logs', icon: BarChart3 },
      { id: 'faqs', label: 'FAQs', icon: HelpCircle },
    ];
    if (isAdmin && lastItem) {
      bookingCore.push({ id: 'divider-1', type: 'divider' });
      bookingCore.push(lastItem);
    }
    return bookingCore;
  }

  // For admin page, use labels that match the admin sidebar (stable order)
  if (forPage === 'admin') {
    const adminCore: RawItem[] = [
      { id: 'overview', label: 'Dashboard', icon: Home },
      { id: 'booking-management', label: 'Facility Booking Management', icon: Calendar },
      { id: 'campus-management', label: 'Campus Management', icon: Landmark },
      { id: 'facility-management', label: 'Facility Management', icon: Building2 },
      { id: 'report-schedules', label: 'Report Schedules', icon: CalendarClock },
      { id: 'user-management', label: 'User Management', icon: Users },
      { id: 'role-management', label: 'Role Management', icon: Shield },
      { id: 'security', label: 'Admin System Alerts', icon: Shield },
      { id: 'faq-management', label: 'FAQ Management', icon: HelpCircle },
      { id: 'admin-activity-logs', label: 'Admin Activity Logs', icon: BarChart3 },
      // Removed System Settings from sidebar
    ];
    if (isAdmin && lastItem) {
      return adminCore.concat([{ id: 'divider-1', type: 'divider' }, lastItem]);
    }
    return adminCore;
  }

  // Default: generic core for other pages
  if (isAdmin && lastItem) {
    return core.concat([{ id: 'divider-1', type: 'divider' }, lastItem]);
  }
  return core;
}

export type SidebarItemRaw = RawItem;
