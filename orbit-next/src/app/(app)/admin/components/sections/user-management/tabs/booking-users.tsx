import React, { useState } from 'react';
import { FacilityBooking, User } from '@shared/schema';
import { Users, UserIcon, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const USER_MANAGEMENT_TAB_BOOKING_USERS = 'booking-users' as const;

export type BookingUsersTabProps = {
  normalizedSearch: string;
  bookingUsers: User[];
  bookingUsersFiltered: User[];
  bookingUsersPage: number;
  onBookingUsersPageChange: (page: number) => void;
  itemsPerPage: number;
  activeBookingsByUser: Map<string, FacilityBooking[]>;
  getFacilityName: (facilityId: any) => string;
  onRequestBan: (user: User) => void;
};

export function BookingUsersTab(props: BookingUsersTabProps) {
  const {
    normalizedSearch,
    bookingUsers,
    bookingUsersFiltered,
    bookingUsersPage,
    onBookingUsersPageChange,
    itemsPerPage,
    activeBookingsByUser,
    getFacilityName,
    onRequestBan,
  } = props;

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Facility Booking Users</h3>
        <span className="text-sm text-gray-600">
          {normalizedSearch ? `${bookingUsersFiltered.length}/${bookingUsers.length}` : `${bookingUsersFiltered.length}`} users
        </span>
      </div>

      {bookingUsers.length > 0 ? (
        <div className="space-y-3">
          {bookingUsersFiltered
            .slice(bookingUsersPage * itemsPerPage, (bookingUsersPage + 1) * itemsPerPage)
            .map(userItem => {
              const userBookings = activeBookingsByUser.get(String(userItem.id)) ?? [];

              return (
                <div key={userItem.id} onClick={() => handleUserClick(userItem)} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all duration-200 cursor-pointer">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1 overflow-hidden">
                      <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                        <UserIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h4 className="font-medium text-gray-900 break-all text-sm">{userItem.email}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          Active facilities: {userBookings.map(booking => getFacilityName(booking.facilityId)).join(", ") || "None"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium text-gray-500">Role:</span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {userItem.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          userItem.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {userItem.status}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        className="inline-flex items-center gap-1 bg-red-600 text-white hover:bg-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onRequestBan(userItem);
                        }}
                      >
                        <UserX className="h-3.5 w-3.5" />
                        Ban User
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

          {bookingUsersFiltered.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {bookingUsersPage * itemsPerPage + 1} to {Math.min((bookingUsersPage + 1) * itemsPerPage, bookingUsersFiltered.length)} of {bookingUsersFiltered.length} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => onBookingUsersPageChange(Math.max(bookingUsersPage - 1, 0))}
                  disabled={bookingUsersPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 py-1 text-sm font-medium">
                  {bookingUsersPage + 1} of {Math.ceil(bookingUsersFiltered.length / itemsPerPage)}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    onBookingUsersPageChange(
                      bookingUsersFiltered.length > (bookingUsersPage + 1) * itemsPerPage
                        ? bookingUsersPage + 1
                        : bookingUsersPage,
                    )
                  }
                  disabled={bookingUsersFiltered.length <= (bookingUsersPage + 1) * itemsPerPage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm">No users with active bookings</p>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
                <p className="text-base font-semibold text-gray-900">{selectedUser.email}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Role</h4>
                  <Badge className="bg-gray-100 text-gray-800">{selectedUser.role}</Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                  <Badge className={selectedUser.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {selectedUser.status}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Active Facilities</h4>
                <p className="text-sm text-gray-900">
                  {activeBookingsByUser.get(String(selectedUser.id))?.map(booking => getFacilityName(booking.facilityId)).join(', ') || 'None'}
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">User ID</h4>
                <p className="text-sm text-gray-600 font-mono">{selectedUser.id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
