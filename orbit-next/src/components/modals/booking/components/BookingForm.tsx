/**
 * BookingForm.tsx
 * 
 * Complete booking form UI component with all form fields and submission logic.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/data';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormControl } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomTextarea } from '@/components/ui/custom-textarea';
import { NumberInputWithControls } from './NumberInputWithControls';
import { BookingSummary } from './BookingSummary';
import { EQUIPMENT_OPTIONS, FORM_LIMITS, type EquipmentStateValue } from '../schemas/bookingSchema';
import { getFacilityMaxCapacity } from '../utils';
import type { ValidationError } from '../utils/validationUtils';
import { apiRequest } from '@/lib/api';

const MAX_BOOKING_MS = 2 * 60 * 60 * 1000; // 2 hours max

type BookedBlock = { start: Date; end: Date; userId?: string; bookingId?: number; purpose?: string; bookedByAdmin?: boolean };

function mergeBookedSlots(slots: any[]): BookedBlock[] {
  const sorted = [...slots].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const blocks: BookedBlock[] = [];
  let i = 0;
  while (i < sorted.length) {
    const s = sorted[i];
    if (s.status !== 'scheduled') { i++; continue; }
    const bid = s.bookings?.[0]?.id;
    const uid = s.bookings?.[0]?.userId;
    const purpose = s.bookings?.[0]?.purpose;
    let j = i + 1;
    while (j < sorted.length) {
      const n = sorted[j];
      const adj = new Date(n.start).getTime() === new Date(sorted[j - 1].end).getTime();
      if (n.status === 'scheduled' && n.bookings?.[0]?.id === bid && adj) j++;
      else break;
    }
    const fb = s.bookings?.[0];
    blocks.push({
      start: fb?.startTime ? new Date(fb.startTime) : new Date(s.start),
      end:   fb?.endTime   ? new Date(fb.endTime)   : new Date(sorted[j - 1].end),
      userId: uid, bookingId: bid, purpose,
      bookedByAdmin: s.bookings?.[0]?.bookedByAdmin ?? false,
    });
    i = j;
  }
  return blocks;
}

function FacilityDayList({ facilityId, selectedDate }: { facilityId: number; selectedDate?: Date }) {
  const { user } = useAuth();
  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const displayDate = format(new Date(`${dateStr}T12:00:00`), 'EEEE, MMMM d, yyyy');

  const { data, isLoading } = useQuery<{ data: any[] }>({
    queryKey: ['/api/availability', dateStr],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/availability?date=${dateStr}`);
      return res.json();
    },
    staleTime: 60_000,
    enabled: !!facilityId,
  });

  const facilityData = useMemo(
    () => data?.data?.find((item: any) => item.facility?.id === facilityId),
    [data, facilityId]
  );
  const bookedBlocks = useMemo(() => mergeBookedSlots(facilityData?.slots ?? []), [facilityData]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking {displayDate}…
      </div>
    );
  }

  const now = new Date();
  const visibleBlocks = bookedBlocks.filter(b => b.end > now);

  if (visibleBlocks.length === 0) {
    return (
      <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
        <span className="text-emerald-600 text-xs font-bold">&#x2713;</span>
        <p className="text-xs text-emerald-700">No upcoming reservations &mdash; fully available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visibleBlocks.map((block, idx) => {
        const isActive     = block.start <= now;
        const isOwn        = user?.id === block.userId;
        const isAdminBlock = !!block.bookedByAdmin;

        // Card border/bg
        const cardBorder = isAdminBlock
          ? 'border-red-300 bg-red-50'
          : isActive
          ? 'border-rose-300 bg-white'
          : 'border-pink-200 bg-white';

        const timeColor  = isAdminBlock ? 'text-red-800'  : 'text-gray-900';
        const labelColor = isAdminBlock ? 'text-red-400'  : 'text-gray-400';
        const dateColor  = isAdminBlock ? 'text-red-400'  : 'text-gray-500';

        const badgeClass = isAdminBlock
          ? 'bg-red-100 text-red-700 border border-red-300'
          : isActive
          ? 'bg-rose-100 text-rose-700'
          : 'bg-pink-100 text-pink-700';

        const badgeLabel = isAdminBlock
          ? 'Scheduled By Admin'
          : isActive ? 'In Use'
          : 'Scheduled';

        return (
          <div key={idx} className={`rounded-xl border-2 px-4 py-3 ${cardBorder}`}>
            <div className="flex items-center gap-3">

              {/* Left: Started and Ends side by side */}
              <div className="flex gap-5 flex-shrink-0">
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${labelColor}`}>Started</p>
                  <p className={`text-base font-bold leading-tight ${timeColor}`}>{format(block.start, 'h:mm a')}</p>
                  <p className={`text-xs mt-0.5 ${dateColor}`}>{format(block.start, 'M/d/yyyy')}</p>
                </div>
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${labelColor}`}>Ends</p>
                  <p className={`text-base font-bold leading-tight ${timeColor}`}>{format(block.end, 'h:mm a')}</p>
                  <p className={`text-xs mt-0.5 ${dateColor}`}>{format(block.end, 'M/d/yyyy')}</p>
                </div>
              </div>

              {/* Middle: purpose only for admin bookings */}
              <div className="flex-1 flex items-center justify-center">
                {isAdminBlock && block.purpose ? (
                  <p className="text-xs italic text-red-600 text-center leading-snug px-2">"{block.purpose}"</p>
                ) : isOwn ? (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    Your booking
                  </span>
                ) : null}
              </div>

              {/* Right: badge */}
              <div className="flex-shrink-0">
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badgeClass}`}>
                  {badgeLabel}
                </span>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}

interface BookingFormProps {
  form: any;
  facilities: any[];
  equipmentState: Record<string, EquipmentStateValue>;
  setEquipmentState: (state: Record<string, EquipmentStateValue>) => void;
  equipmentOtherText: string;
  setEquipmentOtherText: (text: string) => void;
  onSubmit: (data: any) => void;
  onClose: () => void;
  isSubmitting: boolean;
  validationWarnings: ValidationError[];
  slotManagement: any;
  selectedFacility: any;
  isAdmin?: boolean;
}

export function BookingForm({
  form,
  facilities,
  equipmentState,
  setEquipmentState,
  equipmentOtherText,
  setEquipmentOtherText,
  onSubmit,
  onClose,
  isSubmitting,
  validationWarnings,
  selectedFacility,
  isAdmin = false,
}: BookingFormProps) {
  const { PURPOSE_MAX, OTHERS_MAX } = FORM_LIMITS;
  const maxCapacity = selectedFacility ? getFacilityMaxCapacity(selectedFacility) : 8;

  const [selectedCampus, setSelectedCampus] = useState<string>('');

  const startTime: Date | undefined = form.watch('startTime');
  const endTime: Date | undefined = form.watch('endTime');
  const facilityIdWatched: string | undefined = form.watch('facilityId');

  // Filter facilities by selected campus
  const filteredFacilities = useMemo(() => {
    if (!selectedCampus) return facilities;
    return facilities.filter((f: any) => f.campus === selectedCampus);
  }, [facilities, selectedCampus]);

  // Reset facility selection when campus changes
  useEffect(() => {
    if (!selectedCampus) return;
    const currentFacility = facilities.find((f: any) => f.id.toString() === facilityIdWatched);
    if (currentFacility && currentFacility.campus !== selectedCampus) {
      const firstMatch = filteredFacilities[0];
      form.setValue('facilityId', firstMatch ? firstMatch.id.toString() : '');
    }
  }, [selectedCampus]);

  // Sync endTime whenever startTime changes
  useEffect(() => {
    if (!startTime) return;
    if (!isAdmin) {
      // Always reset to start + 2h, capped at 7:00 PM
      const defaultEnd = new Date(startTime.getTime() + MAX_BOOKING_MS);
      const opLimit = new Date(startTime); opLimit.setHours(19, 0, 0, 0);
      form.setValue('endTime', defaultEnd > opLimit ? opLimit : defaultEnd);
    } else {
      // Admin: preserve chosen time but re-anchor date to startTime's date
      const current = form.getValues('endTime') as Date | undefined;
      if (current) {
        const newEnd = new Date(startTime);
        newEnd.setHours(current.getHours(), current.getMinutes(), 0, 0);
        if (newEnd.getTime() !== current.getTime()) form.setValue('endTime', newEnd);
      }
    }
  }, [startTime?.getTime()]);

  // Reset participants to 1 when facility changes
  useEffect(() => {
    form.setValue('participants', 1);
  }, [facilityIdWatched]);

  const { data: equipmentAvailability } = useQuery<Array<{ key: string; label: string; totalCount: number; bookedCount: number; available: number }>>({
    queryKey: ['/api/equipment/availability', startTime?.toISOString(), endTime?.toISOString()],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/equipment/availability?startTime=${encodeURIComponent(startTime!.toISOString())}&endTime=${encodeURIComponent(endTime!.toISOString())}`);
      return res.json();
    },
    enabled: !!(startTime && endTime && startTime < endTime),
    staleTime: 30_000,
  });

  // Build a lookup: key -> available count
  const equipAvailMap = (equipmentAvailability ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.key] = item.available;
    return acc;
  }, {});

  // Conflict detection: uses cached data from FacilityDayList (same queryKey)
  const conflictDateStr = startTime ? format(startTime, 'yyyy-MM-dd') : null;
  const { data: conflictAvailData } = useQuery<{ data: any[] }>({
    queryKey: ['/api/availability', conflictDateStr ?? ''],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/availability?date=${conflictDateStr}`);
      return res.json();
    },
    staleTime: 60_000,
    enabled: !!facilityIdWatched && !!conflictDateStr,
  });
  const hasTimeConflict = useMemo(() => {
    if (isAdmin || !startTime || !endTime || !facilityIdWatched || !conflictAvailData) return false;
    const fd = (conflictAvailData as any).data?.find((item: any) => item.facility?.id === parseInt(facilityIdWatched));
    if (!fd) return false;
    return mergeBookedSlots(fd.slots ?? []).some(b => startTime < b.end && endTime > b.start);
  }, [conflictAvailData, startTime?.getTime(), endTime?.getTime(), facilityIdWatched, isAdmin]);

  // Operating hours / duration enforcement (non-admin only)
  const hasEndAfterHours = useMemo(() => {
    if (isAdmin || !endTime) return false;
    return endTime.getHours() > 19 || (endTime.getHours() === 19 && endTime.getMinutes() > 0);
  }, [endTime?.getTime(), isAdmin]);

  const hasEndExceedsMax = useMemo(() => {
    if (isAdmin || !startTime || !endTime) return false;
    return endTime.getTime() > startTime.getTime() + MAX_BOOKING_MS;
  }, [startTime?.getTime(), endTime?.getTime(), isAdmin]);

  const purposeValue = form.watch('purpose');
  const isPurposeEmpty = !purposeValue || purposeValue.trim().length === 0;

  const today = new Date();
  const minDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Create Booking</DialogTitle>
          <DialogDescription>Book a facility for your event or meeting.</DialogDescription>
        </DialogHeader>

        {/* Booking Policies */}
        {!isAdmin && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">Booking Policies</p>
            <ul className="space-y-1 text-xs text-blue-700">
              <li>• Operating hours: <strong>7:30 AM – 7:00 PM</strong></li>
              <li>• Maximum booking duration: <strong>2 hours</strong></li>
              <li>• Maximum bookings per day: <strong>2</strong></li>
              <li>• Bookings cannot be made for past dates</li>
            </ul>
          </div>
        )}

        {/* Admin banner */}
        {isAdmin && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-blue-500 text-sm flex-shrink-0 mt-0.5">Admin Mode</span>
            <div>
              <p className="font-semibold text-blue-800 text-sm">Admin Booking</p>
              <p className="text-xs text-blue-600 mt-0.5">Time limits and same-day restrictions are waived.</p>
            </div>
          </div>
        )}

        {/* Campus & Facility Selection */}
        <div className="grid md:grid-cols-3 gap-4">
          <FormItem>
            <Label>Campus</Label>
            <Select onValueChange={(val) => setSelectedCampus(val === '__all__' ? '' : val)} value={selectedCampus || '__all__'}>
              <SelectTrigger>
                <SelectValue placeholder="All Campuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Campuses</SelectItem>
                <SelectItem value="selga">Selga</SelectItem>
                <SelectItem value="bonifacio">Bonifacio</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>

          <FormField
            control={form.control}
            name="facilityId"
            render={({ field }) => (
              <FormItem>
                <Label>Facility</Label>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a facility" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredFacilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id.toString()}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="participants"
            render={({ field }) => (
              <FormItem>
                <Label>Number of Participants</Label>
                <NumberInputWithControls
                  value={field.value}
                  onChange={field.onChange}
                  min={1}
                  max={maxCapacity}
                />
                {selectedFacility && (
                  <p className="text-xs text-gray-500 mt-1">Max capacity: <strong>{maxCapacity}</strong> {maxCapacity === 1 ? 'person' : 'people'}</p>
                )}
              </FormItem>
            )}
          />
        </div>

        {/* Facility schedule */}
        {facilityIdWatched && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Current reservations</p>
            <FacilityDayList
              facilityId={parseInt(facilityIdWatched)}
              selectedDate={startTime}
            />
          </div>
        )}

        {/* Date and Time */}
        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <Label>Start Date &amp; Time</Label>
                <div className="grid grid-cols-2 gap-3">
                  <FormControl>
                    <Input
                      type="date"
                      min={minDate}
                      className={hasTimeConflict && !isAdmin ? 'border-red-500 focus-visible:ring-red-400' : ''}
                      value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : ''}
                      onChange={(e) => {
                        const currentTime = field.value || new Date();
                        const newDate = new Date(e.target.value);
                        newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                        field.onChange(newDate);
                      }}
                    />
                  </FormControl>
                  <FormControl>
                    <Input
                      type="time"
                      className={hasTimeConflict && !isAdmin ? 'border-red-500 focus-visible:ring-red-400' : ''}
                      value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(11, 16) : ''}
                      onChange={(e) => {
                        const currentDate = field.value || new Date();
                        const [hours, minutes] = e.target.value.split(':');
                        const newDate = new Date(currentDate);
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        field.onChange(newDate);
                      }}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => {
              const exceedsMax = !isAdmin && startTime && field.value && field.value.getTime() > startTime.getTime() + MAX_BOOKING_MS;
              const exceedsHours = !isAdmin && field.value && (field.value.getHours() > 19 || (field.value.getHours() === 19 && field.value.getMinutes() > 0));
              const hasError = exceedsMax || exceedsHours || (hasTimeConflict && !isAdmin);
              const maxTimeStr = !isAdmin && startTime ? (() => {
                const cap2h = new Date(startTime.getTime() + MAX_BOOKING_MS);
                const cap7pm = new Date(startTime); cap7pm.setHours(19, 0, 0, 0);
                return format(cap2h < cap7pm ? cap2h : cap7pm, 'HH:mm');
              })() : undefined;
              return (
                <FormItem>
                  <Label>
                    End Time
                    {!isAdmin && <span className="text-xs text-gray-400 font-normal ml-1">(max 2h · before 7 PM)</span>}
                  </Label>
                  <FormControl>
                    <Input
                      type="time"
                      max={isAdmin ? undefined : maxTimeStr}
                      className={hasError ? 'border-red-500 focus-visible:ring-red-400' : ''}
                      value={field.value ? format(field.value, 'HH:mm') : ''}
                      onChange={(e) => {
                        if (!startTime) return;
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const newEnd = new Date(startTime);
                        newEnd.setHours(hours, minutes, 0, 0);
                        field.onChange(newEnd);
                      }}
                    />
                  </FormControl>
                  {hasError && (
                    <p className="text-xs text-red-600 mt-1">
                      {exceedsHours ? 'End time cannot be after 7:00 PM.' : 'Maximum booking duration is 2 hours.'}
                    </p>
                  )}
                </FormItem>
              );
            }}
          />
        </div>


        {/* Error banners */}
        {hasTimeConflict && !isAdmin && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Time Slot Unavailable</p>
              <p className="text-xs text-red-600 mt-0.5">Your selected time overlaps with an existing booking. Please choose a different time.</p>
            </div>
          </div>
        )}
        {hasEndAfterHours && !isAdmin && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Outside Operating Hours</p>
              <p className="text-xs text-red-600 mt-0.5">Bookings cannot end after 7:00 PM. Please adjust your end time.</p>
            </div>
          </div>
        )}
        {hasEndExceedsMax && !isAdmin && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Duration Exceeded</p>
              <p className="text-xs text-red-600 mt-0.5">Maximum booking duration is 2 hours. Please shorten your booking.</p>
            </div>
          </div>
        )}

        {/* Purpose */}
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => {
            const purposeEmpty = !field.value || field.value.trim().length === 0;
            return (
              <FormItem>
                <Label>
                  Purpose <span className="text-red-500">*</span>
                </Label>
                <CustomTextarea
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Describe your purpose for booking this facility"
                  maxLength={PURPOSE_MAX}
                  isInvalid={purposeEmpty || field.value?.length >= PURPOSE_MAX}
                  required
                />
                {purposeEmpty && (
                  <p className="text-xs text-red-600 mt-1">Please provide a purpose for your booking.</p>
                )}
              </FormItem>
            );
          }}
        />

        {/* Equipment */}
        <div>
          <Label className="block mb-3">Additional Equipment</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EQUIPMENT_OPTIONS.map((option) => {
              const availableCount = equipAvailMap[option.key];
              const isUnavailable = equipmentAvailability !== undefined && availableCount === 0;
              return (
                <div key={option.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!equipmentState[option.key]}
                    disabled={isUnavailable}
                    onChange={(e) => {
                      if (isUnavailable) return;
                      setEquipmentState({ ...equipmentState, [option.key]: e.target.checked ? 'prepared' : false });
                    }}
                    className="h-4 w-4 rounded border-gray-300 disabled:cursor-not-allowed"
                  />
                  <span className={`text-sm ${isUnavailable ? 'text-gray-400' : ''}`}>{option.label}</span>
                  {isUnavailable && (
                    <span className="ml-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                      Not Available
                    </span>
                  )}
                </div>
              );
            })}
            <div>
              <Input
                value={equipmentOtherText}
                onChange={(e) => {
                  const value = e.target.value.slice(0, OTHERS_MAX);
                  setEquipmentOtherText(value);
                  setEquipmentState({ ...equipmentState, others: value.trim() ? 'prepared' : false });
                }}
                placeholder="Other equipment..."
                maxLength={OTHERS_MAX}
              />
            </div>
          </div>
        </div>

        {/* Booking Summary */}
        <BookingSummary
          facility={selectedFacility}
          startTime={form.watch("startTime")}
          endTime={form.watch("endTime")}
          participants={form.watch("participants")}
          purpose={form.watch("purpose")}
          equipment={equipmentState}
          equipmentOtherText={equipmentOtherText}
        />



        {/* Validation Warnings (excluding Purpose Required and Booking Conflict — handled inline/redundant) */}
        {validationWarnings.filter(w => w.title !== 'Purpose Required' && w.title !== 'Booking Conflict' && w.title !== 'Maximum Duration Exceeded').length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            {validationWarnings.filter(w => w.title !== 'Purpose Required' && w.title !== 'Booking Conflict' && w.title !== 'Maximum Duration Exceeded').map((warning, idx) => (
              <div key={idx} className="flex items-start gap-3 mb-2 last:mb-0">
                <span className="text-yellow-600 text-xl">!</span>
                <div>
                  <p className="font-medium text-yellow-800">{warning.title}</p>
                  <p className="text-sm text-yellow-700">{warning.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Buttons */}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isPurposeEmpty || (!isAdmin && (hasTimeConflict || hasEndAfterHours || hasEndExceedsMax))}
          >
            {isSubmitting
              ? 'Creating...'
              : (!isAdmin && hasTimeConflict)
              ? 'Time Slot Unavailable'
              : (!isAdmin && (hasEndAfterHours || hasEndExceedsMax))
              ? 'Invalid Time'
              : 'Create Booking'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}