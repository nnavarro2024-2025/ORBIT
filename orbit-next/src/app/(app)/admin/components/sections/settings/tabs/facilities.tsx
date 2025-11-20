import React from 'react';
import { Settings, MapPin } from 'lucide-react';
import { Facility } from '@shared/schema';

export const SETTINGS_TAB_FACILITIES = 'facilities' as const;

export type FacilitiesTabProps = {
  facilities: Facility[] | undefined;
  unavailableDatesByFacility: Record<string, string[]>;
  toggleFacilityAvailability: (facility: any | number, available: boolean) => void | Promise<void>;
  toggleFacilityAvailabilityMutation: any;
  setFacilityForAvailable: (facility: any) => void;
  setIsMakeAvailableModalOpen: (open: boolean) => void;
};

export function FacilitiesTab({
  facilities,
  unavailableDatesByFacility,
  toggleFacilityAvailability,
  toggleFacilityAvailabilityMutation,
  setFacilityForAvailable,
  setIsMakeAvailableModalOpen,
}: FacilitiesTabProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Facility Availability Control</h3>
        <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">{facilities?.length || 0} facilities</span>
      </div>
      {facilities && facilities.length > 0 ? (
        <div className="space-y-3">
          {facilities.map((facility: Facility) => (
            <div key={facility.id} className={`bg-white rounded-lg p-4 border border-gray-200 transition-colors duration-200 hover:${facility.isActive ? 'border-green-300' : 'border-red-300'}`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-start md:items-center gap-4">
                  <div className={`${facility.isActive ? 'bg-green-100' : 'bg-red-100'} p-2 rounded-lg`}>
                    <MapPin className={`h-5 w-5 ${facility.isActive ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{facility.name}</h4>
                    <p className="text-sm text-gray-600">Capacity: {facility.capacity} people</p>
                    {facility.description && (
                      <p className="text-sm text-gray-500 mt-1">{facility.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${facility.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {facility.isActive ? 'Available' : 'Unavailable'}
                  </span>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={() => toggleFacilityAvailability(facility, false)}
                      disabled={toggleFacilityAvailabilityMutation.isPending}
                      className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700 text-white`}
                    >
                      {toggleFacilityAvailabilityMutation.isPending && toggleFacilityAvailabilityMutation.variables?.facilityId === facility.id && toggleFacilityAvailabilityMutation.variables?.available === false
                        ? 'Updating...'
                        : 'Make Unavailable'}
                    </button>
                    <button
                      onClick={() => {
                        setFacilityForAvailable(facility);
                        setIsMakeAvailableModalOpen(true);
                      }}
                      disabled={(unavailableDatesByFacility[facility.id] || []).length === 0 || !!toggleFacilityAvailabilityMutation.isPending}
                      className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 text-white`}
                      title={(unavailableDatesByFacility[facility.id] || []).length === 0 ? 'No system-blocked dates to clear' : 'Make Available'}
                    >
                      {toggleFacilityAvailabilityMutation.isPending && toggleFacilityAvailabilityMutation.variables?.facilityId === facility.id && toggleFacilityAvailabilityMutation.variables?.available === true
                        ? 'Updating...'
                        : 'Make Available'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <Settings className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm">No facilities found</p>
        </div>
      )}
    </div>
  );
}
