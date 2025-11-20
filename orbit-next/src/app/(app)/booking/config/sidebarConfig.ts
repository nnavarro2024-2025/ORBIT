import { Plus, Calendar, Home, BarChart3, HelpCircle } from "lucide-react";

/**
 * Generate sidebar items based on user role
 */
export function generateSidebarItems(user: any) {
  let sidebarItems: any[] = [];
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { makeSidebar } = require('@/lib/config');
    const lastItem = (user && user.role === 'admin') 
      ? { id: 'admin-dashboard', label: 'Admin Dashboard', icon: BarChart3 } 
      : undefined;
    sidebarItems = makeSidebar(!!(user && user.role === 'admin'), lastItem, 'booking');
  } catch (e) {
    // Fallback sidebar items
    sidebarItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'new-booking', label: 'New Booking', icon: Plus },
      { id: 'my-bookings', label: 'My Bookings', icon: Calendar },
      { id: 'available-rooms', label: 'Available Rooms', icon: Home },
      { id: 'activity-logs', label: 'Activity Logs', icon: BarChart3 },
      { id: 'faqs', label: 'FAQs', icon: HelpCircle },
    ];
    
    if (user && user.role === 'admin') {
      sidebarItems.push({ id: 'divider-1', type: 'divider' });
      sidebarItems.push({ id: 'admin-dashboard', label: 'Admin Dashboard', icon: BarChart3 });
    }
  }
  
  return sidebarItems;
}

/**
 * Create sidebar click handler
 */
export function createSidebarClickHandler(
  setLocation: (path: string) => void,
  openBookingModal: () => void,
  setSelectedView: (view: string) => void,
  setIsMobileSidebarOpen: (value: boolean) => void
) {
  return (id: string) => {
    if (id === 'admin-dashboard') {
      setLocation('/admin');
      return;
    }
    if (id === 'booking-dashboard') {
      setLocation('/booking#dashboard');
      return;
    }
    if (id === 'new-booking') {
      openBookingModal();
      setIsMobileSidebarOpen(false);
      return;
    }
    
    setSelectedView(id);
    setIsMobileSidebarOpen(false);
  };
}
