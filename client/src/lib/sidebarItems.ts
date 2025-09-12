import { BarChart3, Calendar, Users, Shield, Settings, Home } from "lucide-react";

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
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // For student/booking page we prefer a slightly different top set
  if (forPage === 'booking') {
    const bookingCore: RawItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'new-booking', label: 'New Booking', icon: BarChart3 },
      { id: 'my-bookings', label: 'My Bookings', icon: Calendar },
      { id: 'available-rooms', label: 'Available Rooms', icon: Home },
      { id: 'settings', label: 'Booking Settings', icon: Settings },
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
      { id: 'user-management', label: 'User Management', icon: Users },
      { id: 'security', label: 'Admin System Alerts', icon: Shield },
      { id: 'settings', label: 'System Settings', icon: Settings },
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
