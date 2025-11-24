"use client";

import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/data";
import { useToast } from "@/hooks/ui";
import { Header, Sidebar } from "@/components/layout";
import BookingModal from "@/components/modals/BookingModal";
import EditBookingModal from "@/components/modals/EditBookingModal";
import { format } from 'date-fns';
import { useLegacyLocation } from "@/lib/utils";

// Import config
import {
  ITEMS_PER_PAGE,
  NOTIFICATIONS_PER_PAGE,
  BOOKINGS_PER_PAGE,
  generateSidebarItems,
  createSidebarClickHandler,
} from '../../config';

// Import hooks
import {
  // State hooks
  useBookingModalState,
  useEditBookingModalState,
  useCancelBookingModalState,
  useViewState,
  useActivityState,
  useEscapeKey,
  // Data hooks
  useFacilities,
  useAvailability,
  useUserBookings,
  useAllBookings,
  useNotifications,
  // Mutation hooks
  useUpdateBooking,
  useCancelBooking,
  useMarkNotificationRead,
  // Navigation hooks
  useInitialHashNavigation,
  useActivityLogsHashNavigation,
  useOpenNotificationsOnce,
  useOpenAvailableRoomsOnce,
  useReloadNormalization,
  useHashChangeListener,
  useLegacyNotificationsRoute,
  useOpenBookingOnce,
  createOpenBookingModal,
} from '../../hooks';

// Import lib helpers
import {
  getFacilityBookingStatus,
  getBookingStatus,
  getStats,
  isLibraryClosedNow,
  getFacilityDisplay,
  isRestrictedFacility,
  formatFacilityName,
  getFacilityDescriptionByName,
  getFacilityImageByName,
  parseEquipmentFromMessage,
  getEquipmentStatusColor,
  canEditBooking,
  canCancelBooking,
  buildUnavailableDatesByFacility,
  generateMockForFacilities,
  createActivityTabChangeHandler,
  createActivitySearchChangeHandler,
  createNavigateToBookingDetailsHandler,
  createMarkNotificationReadHandler,
  createCancelBookingHandler,
  createConfirmCancelBookingHandler,
  createCancelCancelBookingHandler,
  createSaveEditBookingHandler,
  createEditBookingHandler,
  createViewAllBookingHistoryHandler,
  createArrivalCountdownExpireHandler,
  createActiveCountdownExpireHandler,
  useScrollToBookingEffect,
} from '../../lib';

// Import components
import { ContentRenderer } from './ContentRenderer';
import { LoadingSkeleton } from '../layout/LoadingSkeleton';
import { CancellationModal } from '../modals/CancellationModal';

export function BookingDashboardInner() {
  // Core hooks
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, setLocation] = useLegacyLocation();
  
  // State management
  const bookingModalState = useBookingModalState();
  const editBookingModalState = useEditBookingModalState();
  const cancelBookingModalState = useCancelBookingModalState();
  const viewState = useViewState();
  const activityState = useActivityState();
  
  // Keyboard handling
  useEscapeKey(viewState.isMobileSidebarOpen, viewState.setIsMobileSidebarOpen);
  
  // Data fetching
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');
  const { data: facilities = [], isLoading: isFacilitiesLoading, isFetching: isFacilitiesFetching } = useFacilities();
  const { data: availabilityDataRaw } = useAvailability(todayDateStr, user, authLoading);
  const { data: userBookingsData = [], isLoading: isUserBookingsLoading, isFetching: isUserBookingsFetching } = useUserBookings(user, authLoading);
  const { data: allBookingsData = [] } = useAllBookings(user, authLoading);
  const { data: notificationsData = [], isLoading: isNotificationsLoading, isFetching: isNotificationsFetching } = useNotifications(user, authLoading);
  
  // Mutations
  const updateBookingMutation = useUpdateBooking(toast, editBookingModalState.setEditingBooking);
  const cancelBookingMutation = useCancelBooking(toast);
  const markNotificationReadMutation = useMarkNotificationRead();
  
  // Data processing
  const userBookings = Array.isArray(userBookingsData) ? userBookingsData : [];
  const allBookings = Array.isArray(allBookingsData) ? allBookingsData : [];
  
  const unavailableDatesByFacility = useMemo(
    () => buildUnavailableDatesByFacility(facilities),
    [facilities]
  );
  
  const availabilityMap = (availabilityDataRaw && availabilityDataRaw.data && availabilityDataRaw.data.length > 0)
    ? new Map<number, any>((availabilityDataRaw.data || []).map((d: any) => [d.facility.id, d]))
    : generateMockForFacilities(facilities || []);
  
  const stats = getStats(userBookings);
  
  // Sidebar configuration
  const sidebarItems = generateSidebarItems(user);
  
  // Create handler functions with proper closures
  const openBookingModal = createOpenBookingModal(
    facilities,
    availabilityMap,
    todayDateStr,
    user,
    toast,
    bookingModalState.setSelectedFacilityForBooking,
    bookingModalState.setInitialStartForBooking,
    bookingModalState.setInitialEndForBooking,
    bookingModalState.setShowBookingModal
  );
  
  const handleSidebarClick = createSidebarClickHandler(
    setLocation,
    openBookingModal,
    viewState.setSelectedView,
    viewState.setIsMobileSidebarOpen
  );
  
  const handleActivityTabChange = createActivityTabChangeHandler(activityState.setActivityTab);
  
  const handleActivitySearchChange = createActivitySearchChangeHandler(
    activityState.setActivitySearchTerm,
    activityState.setActivityBookingPage,
    activityState.setActivityNotificationsPage
  );
  
  const handleNavigateToBookingDetails = createNavigateToBookingDetailsHandler(
    viewState.setSelectedView,
    viewState.setScrollToBookingId
  );
  
  const handleMarkNotificationRead = createMarkNotificationReadHandler(markNotificationReadMutation);
  
  const handleCancelBooking = createCancelBookingHandler(
    cancelBookingModalState.setBookingToCancel,
    cancelBookingModalState.setShowCancelModal
  );
  
  const confirmCancelBooking = createConfirmCancelBookingHandler(
    cancelBookingModalState.bookingToCancel,
    cancelBookingMutation,
    (id) => getFacilityDisplay(id, facilities),
    toast,
    cancelBookingModalState.setShowCancelModal,
    cancelBookingModalState.setBookingToCancel
  );
  
  const cancelCancelBooking = createCancelCancelBookingHandler(
    cancelBookingModalState.setShowCancelModal,
    cancelBookingModalState.setBookingToCancel
  );
  
  const handleSaveEditBooking = createSaveEditBookingHandler(updateBookingMutation);
  
  const handleEditBooking = createEditBookingHandler(
    editBookingModalState.setEditingBooking,
    editBookingModalState.setShowEditBookingModal
  );
  
  const handleViewAllBookingHistory = createViewAllBookingHistoryHandler(
    viewState.setSelectedView,
    activityState.setActivityTab
  );
  
  const handleArrivalCountdownExpire = createArrivalCountdownExpireHandler(
    queryClient,
    (id) => getFacilityDisplay(id, facilities),
    toast
  );
  
  const handleActiveCountdownExpire = createActiveCountdownExpireHandler(
    queryClient,
    (id) => getFacilityDisplay(id, facilities),
    toast
  );
  
  // Navigation effects
  useInitialHashNavigation(
    viewState.setSelectedView,
    openBookingModal,
    bookingModalState.setInitialStartForBooking,
    bookingModalState.setInitialEndForBooking,
    bookingModalState.setInitialTimesAreSuggested
  );
  
  useActivityLogsHashNavigation(
    viewState.setSelectedView,
    activityState.setActivityTab,
    activityState.setActivityBookingPage,
    activityState.setActivityNotificationsPage
  );
  
  useOpenNotificationsOnce(
    viewState.setSelectedView,
    activityState.setActivityTab,
    activityState.setActivityNotificationsPage
  );
  
  useOpenAvailableRoomsOnce(viewState.setSelectedView);
  
  useReloadNormalization(viewState.setSelectedView);
  
  useHashChangeListener(
    viewState.setSelectedView,
    activityState.setActivityTab,
    activityState.setActivityBookingPage,
    activityState.setActivityNotificationsPage
  );
  
  useLegacyNotificationsRoute(
    viewState.setSelectedView,
    activityState.setActivityTab,
    activityState.setActivityNotificationsPage
  );
  
  useOpenBookingOnce(
    viewState.setSelectedView,
    viewState.setScrollToBookingId,
    editBookingModalState.setEditingBooking,
    userBookings,
    allBookings
  );
  
  // Scroll effect
  useEffect(() => {
    return useScrollToBookingEffect(
      viewState.scrollToBookingId,
      viewState.selectedView,
      viewState.setScrollToBookingId
    );
  }, [viewState.scrollToBookingId, viewState.selectedView]);
  
  // Check if initial loading
  const isInitialLoading = (isFacilitiesLoading && facilities.length === 0) || 
                          (isUserBookingsLoading && userBookings.length === 0);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onMobileToggle={() => viewState.setIsMobileSidebarOpen(!viewState.isMobileSidebarOpen)} />
        <LoadingSkeleton
          sidebarItems={sidebarItems}
          selectedView={viewState.selectedView}
          handleSidebarClick={handleSidebarClick}
          isMobileSidebarOpen={viewState.isMobileSidebarOpen}
          setIsMobileSidebarOpen={viewState.setIsMobileSidebarOpen}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onMobileToggle={() => viewState.setIsMobileSidebarOpen(!viewState.isMobileSidebarOpen)} />
      
      {viewState.isMobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 top-16"
          onClick={() => viewState.setIsMobileSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 relative">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 h-[calc(100vh-4rem)] border-r bg-card fixed top-16 left-0 z-30 overflow-y-auto">
          <Sidebar
            items={sidebarItems}
            activeItem={viewState.selectedView}
            onItemClick={handleSidebarClick}
          />
        </div>

        {/* Mobile Sidebar */}
        <div
          className={`lg:hidden fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-card border-r z-40 overflow-y-auto transition-transform duration-300 ease-in-out ${
            viewState.isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            items={sidebarItems}
            activeItem={viewState.selectedView}
            onItemClick={handleSidebarClick}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-64 ml-0 w-full overflow-x-hidden">
          <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <ContentRenderer
            selectedView={viewState.selectedView}
            user={user}
            userBookings={userBookings}
            facilities={facilities}
            isUserBookingsLoading={isUserBookingsLoading}
            isUserBookingsFetching={isUserBookingsFetching}
            itemsPerPage={ITEMS_PER_PAGE}
            openBookingModal={openBookingModal}
            getBookingStatus={getBookingStatus}
            getFacilityDisplay={(id) => getFacilityDisplay(id, facilities)}
            openOthers={viewState.openOthers}
            setOpenOthers={viewState.setOpenOthers}
            onViewAllBookingHistory={handleViewAllBookingHistory}
            canEditBooking={canEditBooking}
            onEditBooking={handleEditBooking}
            canCancelBooking={canCancelBooking}
            onCancelBooking={handleCancelBooking}
            cancelBookingMutationStatus={cancelBookingMutation.status}
            onArrivalCountdownExpire={handleArrivalCountdownExpire}
            onActiveCountdownExpire={handleActiveCountdownExpire}
            scrollToBookingId={viewState.scrollToBookingId}
            onResetScrollHighlight={() => viewState.setScrollToBookingId(null)}
            activityTab={activityState.activityTab}
            onActivityTabChange={handleActivityTabChange}
            activitySearchTerm={activityState.activitySearchTerm}
            onSearchTermChange={handleActivitySearchChange}
            activityBookingPage={activityState.activityBookingPage}
            activityNotificationsPage={activityState.activityNotificationsPage}
            setActivityNotificationsPage={activityState.setActivityNotificationsPage}
            bookingsPerPage={BOOKINGS_PER_PAGE}
            notificationsPerPage={NOTIFICATIONS_PER_PAGE}
            notificationsData={notificationsData}
            isNotificationsLoading={isNotificationsLoading}
            isNotificationsFetching={isNotificationsFetching}
            parseEquipmentFromMessage={parseEquipmentFromMessage}
            getEquipmentStatusColor={getEquipmentStatusColor}
            onNavigateToBookingDetails={handleNavigateToBookingDetails}
            onMarkNotificationRead={handleMarkNotificationRead}
            markNotificationReadPending={markNotificationReadMutation.isPending}
            isFacilitiesLoading={isFacilitiesLoading}
            isFacilitiesFetching={isFacilitiesFetching}
            availabilityMap={availabilityMap}
            unavailableDatesByFacility={unavailableDatesByFacility}
            getFacilityBookingStatus={(id) => getFacilityBookingStatus(id, facilities, allBookings, userBookings, viewState.devForceOpen)}
            getFacilityDescriptionByName={getFacilityDescriptionByName}
            getFacilityImageByName={getFacilityImageByName}
            formatFacilityName={formatFacilityName}
            isRestrictedFacility={isRestrictedFacility}
            isLibraryClosedNow={() => isLibraryClosedNow(viewState.devForceOpen)}
            devForceOpen={viewState.devForceOpen}
            setDevForceOpen={viewState.setDevForceOpen}
            setSelectedFacilityForBooking={bookingModalState.setSelectedFacilityForBooking}
            setInitialStartForBooking={bookingModalState.setInitialStartForBooking}
            setInitialEndForBooking={bookingModalState.setInitialEndForBooking}
            setInitialTimesAreSuggested={bookingModalState.setInitialTimesAreSuggested}
            toast={toast}
            stats={stats}
            setSelectedView={viewState.setSelectedView}
            setActivityTab={activityState.setActivityTab}
            setActivityBookingPage={activityState.setActivityBookingPage}
          />
          </div>
        </div>
      </div>
      
      <BookingModal
        isOpen={bookingModalState.showBookingModal}
        onClose={bookingModalState.closeBookingModal}
        facilities={facilities}
        selectedFacilityId={bookingModalState.selectedFacilityForBooking}
        initialStartTime={bookingModalState.initialStartForBooking}
        initialEndTime={bookingModalState.initialEndForBooking}
        showSuggestedSlot={bookingModalState.initialTimesAreSuggested}
      />
      
      <EditBookingModal
        isOpen={editBookingModalState.showEditBookingModal}
        onClose={() => editBookingModalState.setShowEditBookingModal(false)}
        booking={editBookingModalState.editingBooking}
        facilities={facilities}
        onSave={handleSaveEditBooking}
      />
      
      <CancellationModal
        showCancelModal={cancelBookingModalState.showCancelModal}
        setShowCancelModal={cancelBookingModalState.setShowCancelModal}
        bookingToCancel={cancelBookingModalState.bookingToCancel}
        cancelBookingMutationStatus={cancelBookingMutation.status}
        getFacilityDisplay={(id) => getFacilityDisplay(id, facilities)}
        confirmCancelBooking={confirmCancelBooking}
        cancelCancelBooking={cancelCancelBooking}
      />
    </div>
  );
}
