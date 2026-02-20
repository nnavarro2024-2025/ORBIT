/**
 * SimpleTimeSlotPicker.tsx
 * 
 * Simple, clean time slot picker for booking modal
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';

interface TimeSlot {
  start: string;
  end: string;
  status: 'available' | 'scheduled' | 'unavailable';
}

interface SimpleTimeSlotPickerProps {
  facilityId: number;
  date: Date;
  onSelectSlot: (start: Date, end: Date) => void;
}

export function SimpleTimeSlotPicker({ facilityId, date, onSelectSlot }: SimpleTimeSlotPickerProps) {
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/availability', dateStr, facilityId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/availability?date=${dateStr}`);
      const response = await res.json();
      console.log('API Response:', response);
      // The API returns { data: [...] }, not just an array
      const allData = response.data || response;
      console.log('All facilities:', allData);
      const facilityData = allData.find((f: any) => f.facility.id === facilityId);
      console.log('Facility Data for ID', facilityId, ':', facilityData);
      console.log('Slots:', facilityData?.slots);
      return facilityData;
    },
    enabled: !!facilityId,
  });

  if (!facilityId) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        Please select a facility first
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500 text-sm">
        Error loading time slots
      </div>
    );
  }

  const slots: TimeSlot[] = data?.slots || [];
  console.log('Total slots:', slots.length);
  console.log('All slots:', slots);
  const availableSlots = slots.filter((s) => s.status === 'available');
  console.log('Available slots:', availableSlots.length, availableSlots);

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No available time slots for this date
        <div className="text-xs mt-2">Total slots: {slots.length}</div>
      </div>
    );
  }

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return format(d, 'h:mm a');
  };

  return (
    <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
      {availableSlots.map((slot, idx) => (
        <Button
          key={idx}
          type="button"
          variant="outline"
          className={cn(
            "h-auto py-2 px-2 flex flex-col items-center justify-center text-xs",
            "hover:bg-green-50 hover:border-green-500 hover:text-green-700",
            "transition-all duration-200"
          )}
          onClick={() => {
            onSelectSlot(new Date(slot.start), new Date(slot.end));
          }}
        >
          <span className="font-semibold">{formatTime(slot.start)}</span>
          <span className="text-xs text-gray-600 font-bold">to</span>
          <span className="font-semibold">{formatTime(slot.end)}</span>
        </Button>
      ))}
    </div>
  );
}
