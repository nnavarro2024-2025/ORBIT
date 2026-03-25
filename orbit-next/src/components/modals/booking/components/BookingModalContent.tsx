/**
 * BookingModalContent.tsx
 * 
 * Complete booking modal implementation using all shared utilities and hooks.
 * This component orchestrates the booking creation flow with minimal custom logic.
 */

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/ui';
import { useAuth } from '@/hooks/data';
import { apiRequest } from '@/lib/api';
import { createBookingSchema } from '../schemas/bookingSchema';
import {
  getDefaultStartTime,
  getDefaultEndTime,
  buildEquipmentPayload,
  createEmptyEquipmentState,
  getPredefinedFacilities,
  filterFacilitiesByRole,
} from '../utils';
import { useFacilities, useSlotManagement, useFormValidation } from '../hooks';
import { BookingForm } from './BookingForm';
import { FORM_LIMITS } from '../schemas/bookingSchema';
import { useQuery } from '@tanstack/react-query';

interface BookingModalContentProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: any[];
  selectedFacilityId?: number | null;
  initialStartTime?: Date | null;
  initialEndTime?: Date | null;
}

export function BookingModalContent({
  isOpen,
  onClose,
  facilities: providedFacilities,
  selectedFacilityId,
  initialStartTime = null,
  initialEndTime = null,
}: BookingModalContentProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  // Get filtered facilities
  const facilities = useMemo(() => 
    providedFacilities.length > 0 
      ? filterFacilitiesByRole(providedFacilities, user?.role) 
      : filterFacilitiesByRole(getPredefinedFacilities(), user?.role),
    [providedFacilities, user?.role]
  );

  // Form setup
  const bookingSchema = createBookingSchema();
  type BookingFormData = z.infer<typeof bookingSchema>;

  const defaultStartTime = useMemo(() => getDefaultStartTime(initialStartTime), [initialStartTime]);
  const defaultEndTime = useMemo(() => getDefaultEndTime(defaultStartTime, initialEndTime), [defaultStartTime, initialEndTime]);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    defaultValues: {
      facilityId: selectedFacilityId?.toString() || facilities[0]?.id.toString() || "",
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      purpose: "",
      participants: 1,
      reminderOptIn: true,
      reminderLeadMinutes: 60,
    },
  });

  // Equipment state
  const [equipmentState, setEquipmentState] = useState(() => createEmptyEquipmentState());
  const [equipmentOtherText, setEquipmentOtherText] = useState('');

  // Slot management
  const facilityIdValue = form.watch("facilityId");
  const startTimeValue = form.watch("startTime");
  const endTimeValue = form.watch("endTime");
  
  const selectedFacility = useMemo(() => 
    facilities.find(f => f.id === parseInt(facilityIdValue, 10)),
    [facilities, facilityIdValue]
  );

  const slotManagement = useSlotManagement(isOpen, selectedFacility?.name);

  // Fetch user's bookings for conflict detection
  const { data: userBookingsData } = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/bookings');
      return res.json();
    },
    enabled: isOpen,
  });

  const allBookings = userBookingsData || [];

  console.log('[BookingModal] User bookings loaded:', allBookings.length, 'bookings');
  console.log('[BookingModal] All bookings data:', allBookings);
  console.log('[BookingModal] Validation data:', {
    facilityId: facilityIdValue,
    startTime: startTimeValue,
    endTime: endTimeValue,
    allBookingsCount: allBookings.length,
  });

  // Form validation
  const { formValidationWarnings } = useFormValidation({
    facilityId: facilityIdValue,
    startTime: startTimeValue,
    endTime: endTimeValue,
    purpose: form.watch("purpose"),
    participants: form.watch("participants"),
    facilities,
    allBookings,
    userEmail: user?.email,
    isAdmin,
  });

  console.log('[BookingModal] Validation warnings:', formValidationWarnings);

  // Booking mutation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      setIsSubmitting(true);
      
      const bookingData = {
        ...data,
        facilityId: parseInt(data.facilityId),
        startTime: data.startTime.toISOString(),
        endTime: data.endTime.toISOString(),
        equipment: buildEquipmentPayload(equipmentState, equipmentOtherText),
        reminderOptIn: data.reminderOptIn,
        reminderLeadMinutes: data.reminderLeadMinutes,
      };
      
      const response = await apiRequest("POST", "/api/bookings", bookingData);
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts"] }),
      ]);
      setIsSubmitting(false);
      setLastSubmissionTime(Date.now());
      
      toast({
        title: "Booking Scheduled",
        description: `${selectedFacility?.name || "Facility"} booking created successfully.`,
        variant: "default",
      });
      
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      setIsSubmitting(false);

      const rawMessage = typeof error?.message === 'string' ? error.message : '';
      const parsedMessage = rawMessage.replace(/^\d{3}:\s*/, '').trim();
      const details = error?.payload || {};
      const conflictHint =
        details?.error === 'UserHasOverlappingBooking' || details?.error === 'UserHasActiveBooking'
          ? ' You still have an overlapping or active booking. Please adjust the time slot or cancel the existing booking first.'
          : '';
      const description =
        details?.message || parsedMessage || 'Failed to create booking. Please try again.';
      
      toast({
        title: "Booking Error",
        description: `${description}${conflictHint}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingFormData) => {
    const now = Date.now();
    if (isSubmitting || (now - lastSubmissionTime < 2000)) return;
    
    if (formValidationWarnings.length > 0) {
      toast({
        title: "Validation Error",
        description: formValidationWarnings[0].description,
        variant: "destructive",
      });
      return;
    }
    
    createBookingMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <BookingForm
          form={form}
          facilities={facilities}
          equipmentState={equipmentState}
          setEquipmentState={setEquipmentState}
          equipmentOtherText={equipmentOtherText}
          setEquipmentOtherText={setEquipmentOtherText}
          onSubmit={onSubmit}
          onClose={onClose}
          isSubmitting={isSubmitting}
          validationWarnings={formValidationWarnings}
          slotManagement={slotManagement}
          selectedFacility={selectedFacility}
          isAdmin={isAdmin}
        />
      </DialogContent>
    </Dialog>
  );
}
