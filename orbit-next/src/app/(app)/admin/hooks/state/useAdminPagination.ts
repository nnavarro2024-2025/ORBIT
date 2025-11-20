"use client";

import { useState } from "react";

export function useAdminPagination(itemsPerPage = 10) {
  const [activeBookingsPage, setActiveBookingsPage] = useState(0);
  const [upcomingBookingsPage, setUpcomingBookingsPage] = useState(0);
  const [approvedAndDeniedBookingsPage, setApprovedAndDeniedBookingsPage] = useState(0);
  const [pendingBookingsDashboardPage, setPendingBookingsDashboardPage] = useState(0);
  const [pendingBookingsPage, setPendingBookingsPage] = useState(0);
  const [bookingUsersPage, setBookingUsersPage] = useState(0);
  const [bannedUsersPage, setBannedUsersPage] = useState(0);
  const [activitiesPage, setActivitiesPage] = useState(0);
  const [successPage, setSuccessPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [systemPage, setSystemPage] = useState(0);
  const [bookingAlertsPage, setBookingAlertsPage] = useState(0);
  const [userAlertsPage, setUserAlertsPage] = useState(0);

  return {
    itemsPerPage,
    activeBookingsPage,
    setActiveBookingsPage,
    upcomingBookingsPage,
    setUpcomingBookingsPage,
    approvedAndDeniedBookingsPage,
    setApprovedAndDeniedBookingsPage,
    pendingBookingsDashboardPage,
    setPendingBookingsDashboardPage,
    pendingBookingsPage,
    setPendingBookingsPage,
    bookingUsersPage,
    setBookingUsersPage,
    bannedUsersPage,
    setBannedUsersPage,
    activitiesPage,
    setActivitiesPage,
    successPage,
    setSuccessPage,
    historyPage,
    setHistoryPage,
    systemPage,
    setSystemPage,
    bookingAlertsPage,
    setBookingAlertsPage,
    userAlertsPage,
    setUserAlertsPage,
  };
}
