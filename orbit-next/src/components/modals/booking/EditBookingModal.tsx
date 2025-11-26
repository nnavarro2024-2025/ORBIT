/**
 * EditBookingModal.tsx
 * 
 * Minimal wrapper that delegates all logic to EditBookingModalContent.
 * Reduced from 985 lines to ~20 lines (98% reduction).
 */

import { EditBookingModalContent } from './components/EditBookingModalContent';

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  facilities: any[];
  onSave: (updatedBooking: any) => Promise<any> | void;
}

export default function EditBookingModal(props: EditBookingModalProps) {
  return <EditBookingModalContent {...props} />;
}
