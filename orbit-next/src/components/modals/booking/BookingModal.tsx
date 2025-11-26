/**
 * BookingModal.tsx
 * 
 * Minimal wrapper that delegates all logic to BookingModalContent.
 * Reduced from 2,355 lines to ~20 lines (99% reduction).
 */

import type { Facility } from '@shared/schema';
import { BookingModalContent } from './components/BookingModalContent';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: Facility[];
  selectedFacilityId?: number | null;
  initialStartTime?: Date | null;
  initialEndTime?: Date | null;
  showSuggestedSlot?: boolean;
}

export default function BookingModal(props: BookingModalProps) {
  return <BookingModalContent {...props} />;
}
