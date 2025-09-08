import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BookingModal from "@/components/modals/BookingModal";
import EditBookingModal from "@/components/modals/EditBookingModal";
import DeveloperCredit from "@/components/DeveloperCredit";
import { Plus, Calendar, History, Settings, Home, ChevronLeft, ChevronRight, Eye, Users, MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function BookingDashboard() {
  useAuth(); // Keep auth hook for authentication check
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [selectedView, setSelectedView] = useState("dashboard");
  const [myBookingsPage, setMyBookingsPage] = useState(0);
  const itemsPerPage = 10;

  // State for email notifications (moved from ProfileModal)
  const [emailNotifications, setEmailNotifications] = useState(true); // Assuming default true

  const updateBookingMutation = useMutation({
    mutationFn: (updatedBooking: any) => apiRequest("PUT", `/api/bookings/${updatedBooking.id}`, updatedBooking),
    onSuccess: () => {
      toast({
        title: "Booking Updated",
        description: "Your booking has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Booking Update Failed",
        description: error.message || "An error occurred while updating your booking.",
        variant: "destructive",
      });
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: string) => apiRequest("POST", `/api/bookings/${bookingId}/cancel`),
    onSuccess: () => {
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled.",
      });
      // Give admin dashboard a nudge by invalidating potential shared caches
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/activity"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "An error occurred while cancelling your booking.",
        variant: "destructive",
      });
    },
  });

  // Mutation for user settings (specifically for email notifications)
  const updateUserSettingsMutation = useMutation({
    mutationFn: (data: { emailNotifications?: boolean }) =>
      apiRequest("PUT", "/api/user/settings", data),
    onSuccess: () => {
      toast({
        title: "Booking Settings Updated",
        description: "Your booking preferences have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Booking Settings Update Failed",
        description: error.message || "An error occurred while updating your booking settings.",
        variant: "destructive",
      });
    },
  });

  const handleSaveEditBooking = (updatedBooking: any) => {
    updateBookingMutation.mutate(updatedBooking);
  };

  // Handler for email notifications change
  const handleEmailNotificationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setEmailNotifications(checked);
    updateUserSettingsMutation.mutate({ emailNotifications: checked });
  };

  // ✅ Default to empty arrays to avoid undefined errors
  const { data: facilities = [] } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/facilities");
      return response.json();
    },
  });

  const { data: userBookingsData = [] } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bookings");
      return response.json();
    },
  });

  // ✅ Ensure userBookings is always an array
  const userBookings = Array.isArray(userBookingsData) ? userBookingsData : [];

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "new-booking", label: "New Booking", icon: Plus },
    { id: "my-bookings", label: "My Bookings", icon: History },
    { id: "available-rooms", label: "Available Rooms", icon: Calendar },
    { id: "booking-settings", label: "Booking Settings", icon: Settings }, // New item for booking settings
  ];

  const handleSidebarClick = (itemId: string) => {
    if (itemId === "new-booking") {
      setShowBookingModal(true);
    } else {
      setSelectedView(itemId);
    }
  };

  const getStats = () => {
    const now = new Date();

    // Active: approved and currently within time window
    const active = userBookings.filter((b) => {
      if (b.status !== "approved") return false;
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      return now >= start && now <= end;
    }).length;

    // Upcoming: approved and starts in the future
    const upcoming = userBookings.filter((b) => {
      if (b.status !== "approved") return false;
      const start = new Date(b.startTime);
      return start > now;
    }).length;

    // Pending approval: bookings waiting for admin approval
    const pending = userBookings.filter((b) => b.status === "pending").length;

    return { active, upcoming, pending };
  };

  const stats = getStats();

  const getFacilityDisplay = (facilityId: number) => {
    const facility = facilities.find((f) => f.id === facilityId);
    if (!facility) return `Facility ${facilityId}`;
    const name = facility.name || `Facility ${facilityId}`;
    const lower = name.toLowerCase();
    if (lower.includes('collaborative learning room 1') || lower.includes('collaborative learning room 2')) {
      // Room capacity is 8
    } else if (lower.includes('board room') || lower.includes('boardroom')) {
      // Room capacity is 12
    }
    return name;
  };

  const getFacilityDescriptionByName = (name?: string) => {
    if (!name) return '';
    const lower = name.toLowerCase();
    if (lower.includes('collaborative learning room 1') || lower.includes('collaborative learning room 2')) {
      return 'Collaborative space designed for group study, discussions, and project work.';
    }
    if (lower.includes('board room') || lower.includes('boardroom')) {
      return 'Formal boardroom suitable for meetings, presentations, and committee sessions.';
    }
    return 'Comfortable study space for individual or small group use.';
  };

  const getBookingStatus = (booking: any): { label: string; badgeClass: string } => {
    const now = new Date();
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    if (booking.status === "pending") return { label: "Pending Request", badgeClass: "pending" };
    if (booking.status === "denied") return { label: "Denied", badgeClass: "denied" };
    if (booking.status === "approved") {
      if (now < start) return { label: "Pending", badgeClass: "pending" };
      if (now >= start && now <= end) return { label: "Active", badgeClass: "active" };
      if (now > end) return { label: "Done", badgeClass: "inactive" };
    }
    return { label: booking.status, badgeClass: booking.status };
  };

  const canEditBooking = (booking: any): boolean => {
    const status = getBookingStatus(booking).label;
    return status === 'Pending Request';
  };

  const canCancelBooking = (booking: any): boolean => {
    const status = getBookingStatus(booking).label;
    return status === 'Pending' || status === 'Pending Request';
  };

  const renderContent = () => {
    switch (selectedView) {
      case "my-bookings":
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">My Bookings</h3>
                  <p className="text-sm text-gray-600 mt-1">Manage your facility reservations</p>
                </div>
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Booking
                </button>
              </div>

              {userBookings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h4>
                  <p className="text-gray-600 mb-6">Create your first booking to get started with facility reservations.</p>
                  <button
                    onClick={() => setShowBookingModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                  >
                    Book Your First Room
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userBookings
                    .slice(myBookingsPage * itemsPerPage, (myBookingsPage + 1) * itemsPerPage)
                    .map((booking) => {
                    const status = getBookingStatus(booking);
                    const statusColors = {
                      'Active': 'bg-green-100 text-green-800 border-green-200',
                      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                      'Pending Request': 'bg-blue-100 text-blue-800 border-blue-200',
                      'Done': 'bg-gray-100 text-gray-800 border-gray-200',
                      'Denied': 'bg-red-100 text-red-800 border-red-200'
                    };

                    return (
                      <div key={booking.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-lg">
                              <Calendar className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-lg text-gray-900">{getFacilityDisplay(booking.facilityId)}</h4>
                              <p className="text-sm text-gray-600">Room #{booking.facilityId}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[status.label as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                            <div className={`w-2 h-2 rounded-full mr-2 inline-block ${
                              status.label === 'Active' ? 'bg-green-500' :
                              status.label === 'Pending' || status.label === 'Pending Request' ? 'bg-yellow-500' :
                              status.label === 'Done' ? 'bg-gray-500' :
                              status.label === 'Denied' ? 'bg-red-500' : 'bg-gray-500'
                            }`}></div>
                            {status.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-600 mb-1">Date & Time</p>
                            <p className="font-semibold text-gray-900">
                              {new Date(booking.startTime).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(booking.startTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })} - {new Date(booking.endTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </p>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-600 mb-1">Purpose</p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-gray-900 line-clamp-3 cursor-help">
                                    {booking.purpose || 'No purpose specified'}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-sm p-3">
                                  <p className="whitespace-pre-wrap">{booking.purpose || 'No purpose specified'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="text-sm text-gray-500">
                            Booked on {new Date(booking.createdAt || booking.startTime).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2">
                            {canEditBooking(booking) && (
                              <button
                                onClick={() => {
                                  setEditingBooking(booking);
                                  setShowEditBookingModal(true);
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                              >
                                Edit
                              </button>
                            )}
                            {canCancelBooking(booking) && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
                                    cancelBookingMutation.mutate(booking.id);
                                  }
                                }}
                                className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
                              >
                                Cancel
                              </button>
                            )}
                            {!canEditBooking(booking) && !canCancelBooking(booking) && (
                              <span className="text-gray-400 text-sm">No actions available</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Enhanced Pagination */}
                  {userBookings.length > itemsPerPage && (
                    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        Showing {myBookingsPage * itemsPerPage + 1} to {Math.min((myBookingsPage + 1) * itemsPerPage, userBookings.length)} of {userBookings.length} bookings
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMyBookingsPage(prev => Math.max(prev - 1, 0))}
                          disabled={myBookingsPage === 0}
                          className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="px-3 py-1 text-sm font-medium">
                          {myBookingsPage + 1} of {Math.ceil(userBookings.length / itemsPerPage)}
                        </span>
                        <button
                          onClick={() => setMyBookingsPage(prev => ((prev + 1) * itemsPerPage < userBookings.length ? prev + 1 : prev))}
                          disabled={(myBookingsPage + 1) * itemsPerPage >= userBookings.length}
                          className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
        );

      case "available-rooms":
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Available Study Rooms</h2>
                  <p className="text-gray-600 mt-1">Browse and book available facilities</p>
                </div>
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 shadow-sm"
                >
                  <Plus className="h-5 w-5" />
                  Book Room
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {facilities.map((facility) => (
                  <div
                    key={facility.id}
                    className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-blue-300"
                    onClick={() => setShowBookingModal(true)}
                  >
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      {facility.imageUrl ? (
                        <img
                          src={facility.imageUrl}
                          alt={facility.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-center">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                            <Calendar className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500">No image available</p>
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {facility.name}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed mb-4">
                        {getFacilityDescriptionByName(facility.name)}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-700">
                            {(() => {
                              const n = facility.name?.toLowerCase() || '';
                              if (n.includes('collaborative learning room 1') || n.includes('collaborative learning 1') ||
                                  n.includes('collaborative learning room 2') || n.includes('collaborative learning 2')) {
                                return 'Up to 8 people';
                              }
                              if (n.includes('board room') || n.includes('boardroom')) {
                                return 'Up to 12 people';
                              }
                              return `${facility.capacity} people`;
                            })()}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowBookingModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 shadow-sm"
                        >
                          Book Now →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {facilities.length === 0 && (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No facilities available</h4>
                  <p className="text-gray-600">There are currently no facilities available for booking.</p>
                </div>
              )}
            </div>
        );

      case "booking-settings":
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">Booking Settings</h3>
              <p className="text-gray-600 mt-1">Manage your booking preferences and notifications</p>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Receive email updates for booking confirmations, reminders, and status changes
                    </p>
                  </div>
                  <div className="ml-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={handleEmailNotificationsChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Booking Guidelines</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Bookings can be made up to 30 days in advance</li>
                  <li>• Maximum booking duration is 4 hours per day</li>
                  <li>• Cancellations must be made at least 2 hours before the booking time</li>
                  <li>• No-shows may result in booking restrictions</li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Bookings</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
                    <p className="text-xs text-gray-500 mt-1">Currently in progress</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Upcoming Bookings</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{stats.upcoming}</p>
                    <p className="text-xs text-gray-500 mt-1">Approved and scheduled</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <History className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">{stats.pending}</p>
                    <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-full">
                    <Settings className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 border border-blue-200"
                >
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-blue-900">New Booking</p>
                    <p className="text-sm text-blue-700">Reserve a study room</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedView("my-bookings")}
                  className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200 border border-green-200"
                >
                  <div className="bg-green-600 p-2 rounded-lg">
                    <History className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-green-900">My Bookings</p>
                    <p className="text-sm text-green-700">View all reservations</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedView("available-rooms")}
                  className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors duration-200 border border-purple-200"
                >
                  <div className="bg-purple-600 p-2 rounded-lg">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-purple-900">Available Rooms</p>
                    <p className="text-sm text-purple-700">Browse facilities</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Available Rooms */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Available Rooms</h3>
                  <p className="text-gray-600 text-sm mt-1">Book a study space for your session</p>
                </div>
                <button
                  onClick={() => setSelectedView("available-rooms")}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200"
                >
                  View All →
                </button>
              </div>

              {facilities.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <MapPin className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-sm">No rooms available at the moment</p>
                  <p className="text-gray-500 text-xs mt-1">Check back later or try a different time</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {facilities
                    .slice(0, 6)
                    .map((facility) => (
                    <div key={facility.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200 cursor-pointer group" onClick={() => setShowBookingModal(true)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="bg-white p-2 rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200">
                          <MapPin className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-green-600 font-medium">Available</span>
                        </div>
                      </div>

                      <h4 className="font-medium text-gray-900 mb-1">{facility.name}</h4>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{getFacilityDescriptionByName(facility.name)}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="h-3 w-3" />
                          <span>Capacity: {facility.capacity}</span>
                        </div>
                        <button className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200">
                          Book Now →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Recent Bookings</h3>
                  <p className="text-gray-600 text-sm mt-1">Your latest facility reservations</p>
                </div>
                <button
                  onClick={() => setSelectedView("my-bookings")}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200"
                >
                  View All →
                </button>
              </div>

              {userBookings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-sm">No recent bookings</p>
                  <button
                    onClick={() => setShowBookingModal(true)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm mt-2 transition-colors duration-200"
                  >
                    Make your first booking →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userBookings
                    .slice(0, 5)
                    .map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                          <Calendar className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{getFacilityDisplay(booking.facilityId)}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(booking.startTime).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })} • {new Date(booking.startTime).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {(() => {
                          const status = getBookingStatus(booking);
                          const statusColors = {
                            'Active': 'bg-green-100 text-green-800',
                            'Pending': 'bg-yellow-100 text-yellow-800',
                            'Pending Request': 'bg-blue-100 text-blue-800',
                            'Done': 'bg-gray-100 text-gray-800',
                            'Denied': 'bg-red-100 text-red-800'
                          };
                          return (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status.label as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                              {status.label}
                            </span>
                          );
                        })()}

                        <button
                          onClick={() => setSelectedView("my-bookings")}
                          className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Sidebar
              items={sidebarItems}
              activeItem={selectedView}
              onItemClick={handleSidebarClick}
            />
          </div>
          <div className="lg:col-span-3">{renderContent()}</div>
        </div>
      </div>
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        facilities={facilities}
      />
      <EditBookingModal
        isOpen={showEditBookingModal}
        onClose={() => setShowEditBookingModal(false)}
        booking={editingBooking}
        facilities={facilities}
        onSave={handleSaveEditBooking}
      />
      <DeveloperCredit />
    </div>
  );
}