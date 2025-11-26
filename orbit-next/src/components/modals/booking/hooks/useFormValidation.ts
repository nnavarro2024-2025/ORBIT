/**
 * useFormValidation.ts
 * 
 * Custom hook for real-time form validation with booking-specific rules.
 */

import { useState, useEffect, useCallback } from 'react';
import { validateBookingForm, type ValidationError } from '../utils/validationUtils';
import type { Facility } from '../utils/roleFilterUtils';

export interface FormValidationParams {
  facilityId?: string;
  startTime?: Date;
  endTime?: Date;
  purpose?: string;
  participants?: number;
  facilities: Facility[];
  allBookings: any[];
  userEmail?: string;
  existingBookingId?: number;
}

export function useFormValidation(params: FormValidationParams) {
  const [formValidationWarnings, setFormValidationWarnings] = useState<ValidationError[]>([]);

  const validateForm = useCallback(() => {
    const {
      facilityId,
      startTime,
      endTime,
      purpose,
      participants,
      facilities,
      userEmail,
    } = params;

    if (!facilityId || !startTime || !endTime) {
      setFormValidationWarnings([]);
      return [];
    }

    const errors = validateBookingForm(
      {
        facilityId,
        startTime,
        endTime,
        purpose: purpose || '',
        participants: participants || 1,
      },
      facilities,
      userEmail
    );

    setFormValidationWarnings(errors);
    return errors;
  }, [
    params.facilityId,
    params.startTime,
    params.endTime,
    params.purpose,
    params.participants,
    params.facilities,
    params.allBookings,
    params.userEmail,
    params.existingBookingId,
  ]);

  const clearWarnings = useCallback(() => {
    setFormValidationWarnings([]);
  }, []);

  // Auto-validate when dependencies change
  useEffect(() => {
    validateForm();
  }, [validateForm]);

  return {
    formValidationWarnings,
    validateForm,
    clearWarnings,
  };
}
