import { useFacilityFilters } from "./useFacilityFilters";
import { useBookingLists } from "./useBookingLists";
import { useAnalyticsData } from "./useAnalyticsData";
import { useEquipmentManagement } from "../effects/useEquipmentManagement";
import { useEquipmentHydration } from "../effects/useEquipmentHydration";
import { useBookingMutations } from "../mutations/useBookingMutations";
import { useUserMutations } from "../mutations/useUserMutations";
import { useFacilityMutations } from "../mutations/useFacilityMutations";
import { useScheduleMutations } from "../mutations/useScheduleMutations";
import { useReportSchedules } from "./useReportSchedules";

export function useAdminDataManagement(props: {
  allBookings: any[];
  pendingBookingsData: any[];
  facilitiesData: any[];
  facilities: any[];
  reportSchedulesData: any[];
  adminBookingsData: any[];
  getFacilityName: (id: any) => string;
  formatDateTime: (date: any) => string;
  setUnavailableDatesByFacility: any;
}) {
  const {
    allBookings,
    pendingBookingsData,
    facilitiesData,
    facilities,
    reportSchedulesData,
    adminBookingsData,
    getFacilityName,
    formatDateTime,
    setUnavailableDatesByFacility,
  } = props;

  const equipmentManagement = useEquipmentManagement(allBookings, getFacilityName, formatDateTime);
  const facilityFilters = useFacilityFilters(facilitiesData, getFacilityName);
  const reportSchedules = useReportSchedules(reportSchedulesData);

  const bookingLists = useBookingLists(
    allBookings,
    pendingBookingsData,
    facilityFilters.filterByFacility,
    facilityFilters.compareFacility
  );

  const analytics = useAnalyticsData(
    allBookings,
    facilities || [],
    getFacilityName
  );

  useEquipmentHydration(
    adminBookingsData,
    pendingBookingsData,
    equipmentManagement.setNeedsStatusById,
    equipmentManagement.setBookingItemStatus
  );

  const bookingMutations = useBookingMutations();
  const userMutations = useUserMutations();
  const facilityMutations = useFacilityMutations(setUnavailableDatesByFacility);
  const scheduleMutations = useScheduleMutations();

  return {
    ...equipmentManagement,
    ...facilityFilters,
    ...reportSchedules,
    ...bookingLists,
    ...analytics,
    ...bookingMutations,
    ...userMutations,
    ...facilityMutations,
    ...scheduleMutations,
  };
}
