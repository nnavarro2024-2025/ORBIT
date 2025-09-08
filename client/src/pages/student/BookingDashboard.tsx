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
  const [selectedFacilityForBooking, setSelectedFacilityForBooking] = useState<number | null>(null);
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
      openBookingModal();
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

  // Helper function to open booking modal with a specific facility
  const openBookingModal = (facilityId?: number) => {
    setSelectedFacilityForBooking(facilityId || null);
    setShowBookingModal(true);
  };

  // Helper function to close booking modal and reset selection
  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedFacilityForBooking(null);
  };

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

  const getFacilityImageByName = (name?: string) => {
    if (!name) return null;
    const lower = name.toLowerCase();
    
    // For now, we'll use your uploaded facility image for all rooms
    // You can add more specific images later for different room types
    if (lower.includes('collaborative learning') || 
        lower.includes('collaraborative learning') || // Handle the typo in facility names
        lower.includes('board room') || 
        lower.includes('boardroom')) {
      return '/images/facility-overview.jpg';
    }
    
    return null; // Fallback to default placeholder
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
                  onClick={() => openBookingModal()}
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
                    onClick={() => openBookingModal()}
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
                                  <div className="flex items-center gap-2 cursor-help">
                                    {(booking.purpose || 'No purpose specified').length > 50 ? (
                                      <>
                                        <Eye className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                        <span className="text-gray-900 text-sm">View purpose</span>
                                      </>
                                    ) : (
                                      <p className="text-gray-900 text-sm">
                                        {booking.purpose || 'No purpose specified'}
                                      </p>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                    <p className="font-semibold text-sm text-gray-800">Purpose</p>
                                  </div>
                                  <div className="p-4 max-h-48 overflow-y-auto">
                                    <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words">
                                      {booking.purpose || 'No purpose specified'}
                                    </p>
                                  </div>
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
                  onClick={() => openBookingModal()}
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
                    className={`group bg-white border rounded-xl overflow-hidden transition-all duration-300 flex flex-col h-full ${
                      facility.isActive 
                        ? 'border-gray-200 hover:shadow-lg cursor-pointer hover:border-blue-300' 
                        : 'border-red-200 bg-gray-50 cursor-not-allowed opacity-75'
                    }`}
                    onClick={() => facility.isActive && openBookingModal(facility.id)}
                  >
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative">
                      {!facility.isActive && (
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                            Unavailable
                          </span>
                        </div>
                      )}
                      {(facility.imageUrl || getFacilityImageByName(facility.name)) ? (
                        <img
                          src={facility.imageUrl || getFacilityImageByName(facility.name)}
                          alt={facility.name}
                          className={`w-full h-full object-cover transition-transform duration-300 ${
                            facility.isActive ? 'group-hover:scale-105' : 'grayscale'
                          }`}
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList?.remove('hidden');
                          }}
                        />
                      ) : null}
                      {!(facility.imageUrl || getFacilityImageByName(facility.name)) && (
                        <div className="text-center">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                            <Calendar className={`h-8 w-8 ${facility.isActive ? 'text-gray-400' : 'text-gray-300'}`} />
                          </div>
                          <p className={`text-sm ${facility.isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                            No image available
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-6 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className={`font-bold text-lg mb-2 transition-colors ${
                          facility.isActive 
                            ? 'text-gray-900 group-hover:text-blue-600' 
                            : 'text-gray-500'
                        }`}>
                          {facility.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          facility.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {facility.isActive ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      
                      <p className={`text-sm leading-relaxed mb-4 flex-grow ${
                        facility.isActive ? 'text-gray-600' : 'text-gray-500'
                      }`}>
                        {getFacilityDescriptionByName(facility.name)}
                      </p>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 flex-1">
                          <div className={`w-2 h-2 rounded-full ${
                            facility.isActive ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          <span className={`text-sm font-medium ${
                            facility.isActive ? 'text-green-700' : 'text-gray-500'
                          }`}>
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
                            if (facility.isActive) {
                              openBookingModal(facility.id);
                            }
                          }}
                          disabled={!facility.isActive}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 shadow-sm flex-shrink-0 ${
                            facility.isActive
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {facility.isActive ? 'Book Now →' : 'Unavailable'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {facilities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No facilities available</h4>
                  <p className="text-gray-600">There are currently no facilities available for booking.</p>
                </div>
              ) : facilities.every(f => !f.isActive) ? (
                <div className="text-center py-12">
                  <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-red-500" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">All facilities unavailable</h4>
                  <p className="text-gray-600">All facilities are currently unavailable for booking. Please contact an administrator or try again later.</p>
                </div>
              ) : null}
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
                <div className="text-sm text-blue-800 space-y-3">
                  <div>
                    <h5 className="font-semibold text-blue-900 mb-1">📅 Booking Requirements</h5>
                    <ul className="space-y-1 ml-4">
                      <li>• All bookings must be made at least 30 minutes in advance</li>
                      <li>• Maximum booking duration: 4 hours per session</li>
                      <li>• You can have up to 3 active bookings at once</li>
                      <li>• Bookings are limited to library operating hours (6 AM - 12 AM)</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold text-blue-900 mb-1">⏰ Time Management</h5>
                    <ul className="space-y-1 ml-4">
                      <li>• Arrive on time - late arrivals may forfeit the booking</li>
                      <li>• 15-minute grace period for check-in</li>
                      <li>• Time extensions available through request system</li>
                      <li>• Early departure releases the space for others</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold text-blue-900 mb-1">👥 Group Bookings</h5>
                    <ul className="space-y-1 ml-4">
                      <li>• Collaborative Learning Rooms: Maximum 8 people</li>
                      <li>• Board Room: Maximum 12 people</li>
                      <li>• Study rooms: Check capacity limits for each room</li>
                      <li>• All participants must be registered library users</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold text-blue-900 mb-1">📋 Conduct & Policies</h5>
                    <ul className="space-y-1 ml-4">
                      <li>• Keep noise levels appropriate for library environment</li>
                      <li>• No food or drinks except water in sealed containers</li>
                      <li>• Clean up after use - leave space ready for next user</li>
                      <li>• Report any equipment issues immediately to staff</li>
                      <li>• No smoking, vaping, or alcohol allowed</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold text-blue-900 mb-1">❌ Cancellations & No-Shows</h5>
                    <ul className="space-y-1 ml-4">
                      <li>• Cancel at least 1 hour before your booking starts</li>
                      <li>• 3 no-shows will result in temporary booking suspension</li>
                      <li>• Repeated violations may lead to permanent booking privileges loss</li>
                      <li>• Emergency cancellations should be reported to library staff</li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-100 p-3 rounded border border-blue-300 mt-4">
                    <p className="font-semibold text-blue-900">💡 Pro Tip:</p>
                    <p className="text-blue-800">Book recurring study sessions in advance to secure your preferred times and spaces!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <button
                onClick={() => setSelectedView("my-bookings")}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-green-300 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-green-700">Active Bookings</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
                    <p className="text-xs text-gray-500 mt-1">Currently in progress</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full group-hover:bg-green-200 transition-colors duration-200">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedView("my-bookings")}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-blue-300 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-blue-700">Upcoming Bookings</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{stats.upcoming}</p>
                    <p className="text-xs text-gray-500 mt-1">Approved and scheduled</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors duration-200">
                    <History className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedView("my-bookings")}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-orange-300 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-orange-700">Pending Requests</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">{stats.pending}</p>
                    <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-full group-hover:bg-orange-200 transition-colors duration-200">
                    <Settings className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => openBookingModal()}
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
                  <p className="text-gray-600 text-sm mt-1">
                    {facilities.length === 0 
                      ? "No facilities found" 
                      : facilities.every(f => !f.isActive)
                        ? "All facilities are currently unavailable for booking"
                        : facilities.some(f => !f.isActive)
                          ? "Browse available study spaces - some facilities may be temporarily unavailable"
                          : "Book a study space for your session"
                    }
                  </p>
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
              ) : facilities.every(f => !f.isActive) ? (
                <div className="text-center py-8">
                  <div className="bg-red-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-red-500" />
                  </div>
                  <p className="text-gray-600 text-sm">All facilities are currently unavailable</p>
                  <p className="text-gray-500 text-xs mt-1">Contact an administrator or try again later</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {facilities
                    .slice(0, 6)
                    .map((facility) => (
                    <div key={facility.id} className={`bg-gray-50 rounded-lg p-4 transition-colors duration-200 group ${
                      facility.isActive 
                        ? 'hover:bg-gray-100 cursor-pointer' 
                        : 'opacity-60 cursor-not-allowed'
                    }`} onClick={() => facility.isActive && openBookingModal(facility.id)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg shadow-sm transition-shadow duration-200 ${
                          facility.isActive 
                            ? 'bg-white group-hover:shadow-md' 
                            : 'bg-gray-200'
                        }`}>
                          <MapPin className={`h-5 w-5 ${facility.isActive ? 'text-gray-600' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            facility.isActive ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className={`text-xs font-medium ${
                            facility.isActive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {facility.isActive ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      </div>

                      <h4 className={`font-medium mb-1 ${facility.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                        {facility.name}
                      </h4>
                      <p className={`text-sm mb-3 line-clamp-2 ${facility.isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                        {getFacilityDescriptionByName(facility.name)}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-1 text-xs flex-1 ${facility.isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                          <Users className="h-3 w-3" />
                          <span>Capacity: {facility.capacity}</span>
                        </div>
                        {facility.isActive ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openBookingModal(facility.id);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200 flex-shrink-0"
                          >
                            Book Now →
                          </button>
                        ) : (
                          <span className="text-red-500 font-medium text-sm flex-shrink-0">
                            Unavailable
                          </span>
                        )}
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
                    onClick={() => openBookingModal()}
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
        onClose={closeBookingModal}
        facilities={facilities}
        selectedFacilityId={selectedFacilityForBooking}
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