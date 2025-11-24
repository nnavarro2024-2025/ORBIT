"use client";

import { useState } from "react";
import { useAdminUtilities } from "@admin/hooks/state/useAdminUtilities";
import { useAdminPagination } from "@admin/hooks/state/useAdminPagination";
import { useAdminSearchState } from "@admin/hooks/state/useAdminSearchState";
import { useAdminTabState } from "@admin/hooks/state/useAdminTabState";
import { useAdminModals } from "@admin/hooks/state/useAdminModals";
import { useReportScheduleState } from "@admin/hooks/state/useReportScheduleState";

export function useAdminState() {
  // Basic UI state
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isNavigatingToBooking, setIsNavigatingToBooking] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<any | null>(null);
  const [userToUnban, setUserToUnban] = useState<any | null>(null);
  const [unbannedUserEmail, setUnbannedUserEmail] = useState<string>("");
  const [facilityForUnavailable, setFacilityForUnavailable] = useState<any | null>(null);
  const [unavailableDatesByFacility, setUnavailableDatesByFacility] = useState<Record<string, string[]>>({});
  const [facilityForAvailable, setFacilityForAvailable] = useState<any | null>(null);
  const [openOthers, setOpenOthers] = useState<Record<string, boolean>>({});
  const [openPurpose, setOpenPurpose] = useState<Record<string, boolean>>({});

  // Consolidated hook states
  const utilities = useAdminUtilities();
  const pagination = useAdminPagination();
  const searchState = useAdminSearchState();
  const tabState = useAdminTabState();
  const modalState = useAdminModals();
  const scheduleState = useReportScheduleState();

  return {
    // Basic state
    isExportingPdf,
    setIsExportingPdf,
    isNavigatingToBooking,
    setIsNavigatingToBooking,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    userToBan,
    setUserToBan,
    userToUnban,
    setUserToUnban,
    unbannedUserEmail,
    setUnbannedUserEmail,
    facilityForUnavailable,
    setFacilityForUnavailable,
    unavailableDatesByFacility,
    setUnavailableDatesByFacility,
    facilityForAvailable,
    setFacilityForAvailable,
    openOthers,
    setOpenOthers,
    openPurpose,
    setOpenPurpose,
    
    // Spread all hook states
    ...utilities,
    ...pagination,
    ...searchState,
    ...tabState,
    ...modalState,
    ...scheduleState,
  };
}
