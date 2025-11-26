/**
 * Header Component
 * 
 * Main navigation header with notifications and user profile
 */

import { useSidebar } from "@/components/ui/sidebar";
import { useHeaderLogic } from "./hooks";
import { HeaderContent } from "./components";

export default function Header({ onMobileToggle }: { onMobileToggle?: () => void }) {
  const sidebar = useSidebar();
  const headerData = useHeaderLogic();

  const handleMobileToggle = () => {
    try {
      if (typeof onMobileToggle === 'function') {
        onMobileToggle();
        return;
      }
      sidebar?.toggleSidebar?.();
    } catch (e) { /* no-op if context unavailable */ }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm backdrop-blur-sm">
      <HeaderContent
        user={headerData.user}
        isAdmin={headerData.isAdmin}
        alertsData={headerData.alertsData}
        alertsLoading={headerData.alertsLoading}
        hiddenAlertIds={headerData.hiddenAlertIds}
        hiddenAlertIdsVersion={headerData.hiddenAlertIdsVersion}
        allBookings={headerData.allBookings}
        userBookings={headerData.userBookings}
        allFacilities={headerData.allFacilities}
        onMobileToggle={handleMobileToggle}
        onMarkAsRead={headerData.markAsRead}
        onHideAlert={headerData.hideAlert}
        onLogout={headerData.handleLogout}
      />
    </header>
  );
}
