"use client";

import React, { useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSearchBar } from "@/components/common";
import { Users, UserX } from "lucide-react";
import { FacilityBooking, User } from "@shared/schema";
import { BookingUsersTab } from "./tabs/booking-users";
import { BannedUsersTab } from "./tabs/banned-users";

export type UserManagementSectionProps = {
  users?: User[];
  activeBookings?: FacilityBooking[];
  itemsPerPage: number;
  bookingUsersPage: number;
  onBookingUsersPageChange: (page: number) => void;
  bannedUsersPage: number;
  onBannedUsersPageChange: (page: number) => void;
  userTab: "booking-users" | "banned-users";
  onUserTabChange: (tab: "booking-users" | "banned-users") => void;
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  getBookingUserStatus: (userId: any) => boolean;
  getFacilityName: (facilityId: any) => string;
  onRequestBan: (user: User) => void;
  onRequestUnban: (userId: string) => void;
};

export function UserManagementSection({
  users,
  activeBookings,
  itemsPerPage,
  bookingUsersPage,
  bannedUsersPage,
  onBookingUsersPageChange,
  onBannedUsersPageChange,
  userTab,
  onUserTabChange,
  globalSearch,
  onGlobalSearchChange,
  getBookingUserStatus,
  getFacilityName,
  onRequestBan,
  onRequestUnban,
}: UserManagementSectionProps) {
  const normalizedSearch = globalSearch.trim().toLowerCase();
  const usersList = users ?? [];
  const bookingsList = activeBookings ?? [];

  const bookingUsers = useMemo(
    () => usersList.filter(user => getBookingUserStatus(user.id) && user.status !== "banned"),
    [usersList, getBookingUserStatus],
  );

  const bannedUsers = useMemo(
    () => usersList.filter(user => user.status === "banned"),
    [usersList],
  );

  const bookingUsersFiltered = useMemo(() => {
    if (!normalizedSearch) return bookingUsers;
    return bookingUsers.filter(user => {
      const haystack = [user.email, user.role, user.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [bookingUsers, normalizedSearch]);

  const bannedUsersFiltered = useMemo(() => {
    if (!normalizedSearch) return bannedUsers;
    return bannedUsers.filter(user => {
      const haystack = [user.email, user.role, user.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [bannedUsers, normalizedSearch]);

  const activeBookingsByUser = useMemo(() => {
    const map = new Map<string, FacilityBooking[]>();
    bookingsList.forEach(booking => {
      if (!booking?.userId) return;
      const key = String(booking.userId);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(booking);
    });
    return map;
  }, [bookingsList]);

  useEffect(() => {
    if (!normalizedSearch) return;
    const bookingCount = bookingUsersFiltered.length;
    const bannedCount = bannedUsersFiltered.length;

    if (userTab === "booking-users" && bookingCount === 0 && bannedCount > 0) {
      onUserTabChange("banned-users");
    } else if (userTab === "banned-users" && bannedCount === 0 && bookingCount > 0) {
      onUserTabChange("booking-users");
    }
  }, [normalizedSearch, bookingUsersFiltered.length, bannedUsersFiltered.length, onUserTabChange, userTab]);

  const handleSearchChange = (value: string) => {
    onGlobalSearchChange(value);
    onBookingUsersPageChange(0);
    onBannedUsersPageChange(0);
  };

  const bookingUsersCountLabel = normalizedSearch
    ? `${bookingUsersFiltered.length}/${bookingUsers.length}`
    : `${bookingUsers.length}`;

  const bannedUsersCountLabel = normalizedSearch
    ? `${bannedUsersFiltered.length}/${bannedUsers.length}`
    : `${bannedUsers.length}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-6">
            <div className="flex-1 min-w-0">
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Manage facility booking users and suspended accounts
                </p>
                <AdminSearchBar
                  value={globalSearch}
                  onChange={handleSearchChange}
                  placeholder="Search users..."
                  ariaLabel="User management search"
                  className="pt-1"
                />
              </div>
            </div>
            <div className="flex flex-row flex-wrap sm:flex-col md:flex-row gap-2 items-start md:items-center">
              <div
                className="bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap"
                title={bookingUsersCountLabel}
              >
                {bookingUsersCountLabel} Booking Users
              </div>
              <div
                className="bg-red-100 text-red-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap"
                title={bannedUsersCountLabel}
              >
                {bannedUsersCountLabel} Suspended
              </div>
            </div>
          </div>
        </div>

        <Tabs value={userTab} onValueChange={value => onUserTabChange(value as "booking-users" | "banned-users")} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 gap-2">
            <TabsTrigger
              value="booking-users"
              className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center"
            >
              <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="truncate">Booking Users</span>
            </TabsTrigger>
            <TabsTrigger
              value="banned-users"
              className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center"
            >
              <UserX className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="truncate">Suspended</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="booking-users" className="space-y-4 mt-6 md:mt-0">
            <BookingUsersTab
              normalizedSearch={normalizedSearch}
              bookingUsers={bookingUsers}
              bookingUsersFiltered={bookingUsersFiltered}
              bookingUsersPage={bookingUsersPage}
              onBookingUsersPageChange={onBookingUsersPageChange}
              itemsPerPage={itemsPerPage}
              activeBookingsByUser={activeBookingsByUser}
              getFacilityName={getFacilityName}
              onRequestBan={onRequestBan}
            />
          </TabsContent>

          <TabsContent value="banned-users" className="space-y-4 mt-6 md:mt-0">
            <BannedUsersTab
              normalizedSearch={normalizedSearch}
              bannedUsers={bannedUsers}
              bannedUsersFiltered={bannedUsersFiltered}
              bannedUsersPage={bannedUsersPage}
              onBannedUsersPageChange={onBannedUsersPageChange}
              itemsPerPage={itemsPerPage}
              onRequestUnban={onRequestUnban}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
