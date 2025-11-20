"use client";

import { useState } from "react";

export function useAdminTabState() {
  const [selectedView, setSelectedView] = useState<string>('overview');
  const [securityTab, setSecurityTab] = useState<string>('booking');
  const [bookingTab, setBookingTab] = useState<string>('active');
  const [userTab, setUserTab] = useState<string>('booking-users');
  const [settingsTab, setSettingsTab] = useState<string>('facilities');
  const [alertsPreviewTab, setAlertsPreviewTab] = useState<string>('booking');

  return {
    selectedView,
    setSelectedView,
    securityTab,
    setSecurityTab,
    bookingTab,
    setBookingTab,
    userTab,
    setUserTab,
    settingsTab,
    setSettingsTab,
    alertsPreviewTab,
    setAlertsPreviewTab,
  };
}
