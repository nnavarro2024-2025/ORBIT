"use client";

import { useState } from "react";

export function useAdminSearchState() {
  const [activityLogsSearch, setActivityLogsSearch] = useState('');
  const [successBookingsSearch, setSuccessBookingsSearch] = useState('');
  const [historyBookingsSearch, setHistoryBookingsSearch] = useState('');
  const [globalActivitySearch, setGlobalActivitySearch] = useState('');
  const [globalSystemAlertsSearch, setGlobalSystemAlertsSearch] = useState('');
  const [globalUserManagementSearch, setGlobalUserManagementSearch] = useState('');
  const [globalFacilityBookingSearch, setGlobalFacilityBookingSearch] = useState('');
  const [faqSearch, setFaqSearch] = useState("");

  return {
    activityLogsSearch,
    setActivityLogsSearch,
    successBookingsSearch,
    setSuccessBookingsSearch,
    historyBookingsSearch,
    setHistoryBookingsSearch,
    globalActivitySearch,
    setGlobalActivitySearch,
    globalSystemAlertsSearch,
    setGlobalSystemAlertsSearch,
    globalUserManagementSearch,
    setGlobalUserManagementSearch,
    globalFacilityBookingSearch,
    setGlobalFacilityBookingSearch,
    faqSearch,
    setFaqSearch,
  };
}
