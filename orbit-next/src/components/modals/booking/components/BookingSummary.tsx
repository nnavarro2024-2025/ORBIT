/**
 * Booking Summary Component
 * 
 * Displays a formatted summary of booking details
 */

import React from 'react';
import { format } from 'date-fns';
import { calculateDuration } from '../utils/validationUtils';
import { formatDate, formatTime } from '../utils/dateTimeUtils';
import type { EquipmentStateValue } from '../schemas/bookingSchema';

interface BookingSummaryProps {
  facility?: { name: string } | null;
  startTime?: Date;
  endTime?: Date;
  participants?: number;
  purpose?: string;
  courseYearDept?: string;
  equipmentItems?: string[];
  equipmentOthers?: string;
  equipment?: Record<string, EquipmentStateValue>;
  equipmentOtherText?: string;
  className?: string;
}

export function BookingSummary({
  facility,
  startTime,
  endTime,
  participants,
  purpose,
  courseYearDept,
  equipmentItems = [],
  equipmentOthers,
  equipment,
  equipmentOtherText,
  className = '',
}: BookingSummaryProps) {
  // Support both old and new props
  const items = equipmentItems.length > 0 
    ? equipmentItems 
    : (equipment ? Object.keys(equipment).filter(k => k !== 'others' && equipment[k]) : []);
  const others = equipmentOthers || equipmentOtherText || '';

  if (!facility && !startTime && !endTime && !purpose) {
    return null;
  }

  return (
    <div className={`border-t pt-6 mt-6 ${className}`}>
      <h3 className="font-medium mb-4">Booking Summary</h3>
      <div className="bg-accent/50 p-4 rounded-lg space-y-2">
        {facility && (
          <div className="flex justify-between">
            <span className="text-sm">Facility:</span>
            <span className="text-sm font-medium">{facility.name}</span>
          </div>
        )}

        {startTime && endTime && (
          <>
            <div className="flex justify-between">
              <span className="text-sm">Date:</span>
              <span className="text-sm font-medium">{formatDate(startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Time:</span>
              <span className="text-sm font-medium">
                {formatTime(startTime)} - {formatTime(endTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Duration:</span>
              <span className="text-sm font-medium">{calculateDuration(startTime, endTime)}</span>
            </div>
          </>
        )}

        {participants && (
          <div className="flex justify-between">
            <span className="text-sm">Participants:</span>
            <span className="text-sm font-medium">{participants}</span>
          </div>
        )}

        {purpose && (
          <div className="flex flex-col space-y-1 pt-2 border-t border-gray-200">
            <span className="text-sm font-medium">Purpose:</span>
            <span className="text-sm text-muted-foreground break-words whitespace-pre-wrap">
              {purpose}
            </span>
          </div>
        )}

        {courseYearDept && (
          <div className="flex flex-col space-y-1 pt-2 border-t border-gray-200">
            <span className="text-sm font-medium">Course & Year/Department:</span>
            <span className="text-sm text-muted-foreground">{courseYearDept}</span>
          </div>
        )}

        {(items.length > 0 || others) && (
          <div className="flex flex-col space-y-1 pt-2 border-t border-gray-200">
            <span className="text-sm font-medium">Equipment:</span>
            <ul className="text-sm text-muted-foreground list-disc list-inside">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
              {others && <li>{others}</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
