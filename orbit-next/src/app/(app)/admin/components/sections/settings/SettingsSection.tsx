import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';
import { Facility } from '@shared/schema';
import { FacilitiesTab } from './tabs';

export function SettingsSection({
  settingsTab,
  onSettingsTabChange,
  facilities,
  unavailableDatesByFacility,
  toggleFacilityAvailability,
  toggleFacilityAvailabilityMutation,
  setFacilityForAvailable,
  setIsMakeAvailableModalOpen,
}: {
  settingsTab: string;
  onSettingsTabChange: (value: string) => void;
  facilities: Facility[] | undefined;
  unavailableDatesByFacility: Record<string, string[]>;
  toggleFacilityAvailability: (facility: any | number, available: boolean) => void | Promise<void>;
  toggleFacilityAvailabilityMutation: any;
  setFacilityForAvailable: (facility: any) => void;
  setIsMakeAvailableModalOpen: (open: boolean) => void;
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
            <p className="text-gray-600 mt-1">Manage facility availability and system configurations</p>
          </div>
        </div>

        <Tabs value={settingsTab} onValueChange={onSettingsTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="facilities" className="w-full whitespace-normal flex items-center justify-start gap-2 text-left md:justify-center md:text-center">
              <Settings className="h-4 w-4 text-gray-600" />
              Facility Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="facilities" className="space-y-4 mt-6 md:mt-0">
            <FacilitiesTab
              facilities={facilities}
              unavailableDatesByFacility={unavailableDatesByFacility}
              toggleFacilityAvailability={toggleFacilityAvailability}
              toggleFacilityAvailabilityMutation={toggleFacilityAvailabilityMutation}
              setFacilityForAvailable={setFacilityForAvailable}
              setIsMakeAvailableModalOpen={setIsMakeAvailableModalOpen}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
