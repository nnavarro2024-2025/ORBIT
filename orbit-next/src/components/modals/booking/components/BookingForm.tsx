/**
 * BookingForm.tsx
 * 
 * Complete booking form UI component with all form fields and submission logic.
 */

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
}: BookingFormProps) {
  const { PURPOSE_MAX, COURSE_MAX, OTHERS_MAX } = FORM_LIMITS;
  const maxCapacity = selectedFacility ? getFacilityMaxCapacity(selectedFacility) : 8;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Create Booking</DialogTitle>
          <DialogDescription>Book a facility for your event or meeting.</DialogDescription>
        </DialogHeader>

        {/* Validation Warnings */}
        {validationWarnings.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            {validationWarnings.map((warning, idx) => (
              <div key={idx} className="flex items-start gap-3 mb-2 last:mb-0">
                <span className="text-yellow-600 text-xl">⚠️</span>
                <div>
                  <p className="font-medium text-yellow-800">{warning.title}</p>
                  <p className="text-sm text-yellow-700">{warning.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Facility Selection */}
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
                  {facilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id.toString()}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {/* Date and Time */}
        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <Label>Start Date & Time</Label>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <Label>End Date & Time</Label>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Participants */}
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
            </FormItem>
          )}
        />

        {/* Purpose */}
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <Label>Purpose</Label>
              <CustomTextarea
                value={field.value}
                onChange={field.onChange}
                placeholder="Describe your purpose for booking this facility"
                maxLength={PURPOSE_MAX}
                isInvalid={field.value?.length >= PURPOSE_MAX}
              />
            </FormItem>
          )}
        />

        {/* Course/Department */}
        <FormField
          control={form.control}
          name="courseYearDept"
          render={({ field }) => (
            <FormItem>
              <Label>Course & Year/Department</Label>
              <CustomTextarea
                value={field.value}
                onChange={field.onChange}
                placeholder="e.g. BSIT 3rd Year, Faculty of Engineering"
                maxLength={COURSE_MAX}
                rows={1}
              />
            </FormItem>
          )}
        />

        {/* Equipment */}
        <div>
          <Label className="block mb-3">Additional Equipment</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EQUIPMENT_OPTIONS.map((option) => (
              <div key={option.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!equipmentState[option.key]}
                  onChange={(e) => setEquipmentState({ ...equipmentState, [option.key]: e.target.checked ? 'prepared' : false })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
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

        {/* Footer Buttons */}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Booking"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export default BookingForm;
