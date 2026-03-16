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
import { SimpleTimeSlotPicker } from './SimpleTimeSlotPicker';
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
  const { PURPOSE_MAX, OTHERS_MAX } = FORM_LIMITS;
  const maxCapacity = selectedFacility ? getFacilityMaxCapacity(selectedFacility) : 8;

  // Get current date in YYYY-MM-DD format for min date
  const today = new Date();
  const minDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Create Booking</DialogTitle>
          <DialogDescription>Book a facility for your event or meeting.</DialogDescription>
        </DialogHeader>

        {/* Facility Selection */}
        <div className="grid md:grid-cols-2 gap-4">
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
        </div>

        {/* Time Slot Picker */}
        {form.watch("facilityId") && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <Label className="block mb-3">Quick Select Time Slot</Label>
            <SimpleTimeSlotPicker
              facilityId={parseInt(form.watch("facilityId"))}
              date={form.watch("startTime") || new Date()}
              onSelectSlot={(start, end) => {
                form.setValue("startTime", start);
                form.setValue("endTime", end);
              }}
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
                <Label>Start Date & Time</Label>
                <div className="grid grid-cols-2 gap-3">
                  <FormControl>
                    <Input
                      type="date"
                      min={minDate}
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
            render={({ field }) => (
              <FormItem>
                <Label>End Date & Time</Label>
                <div className="grid grid-cols-2 gap-3">
                  <FormControl>
                    <Input
                      type="date"
                      min={minDate}
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
        </div>

        {/* Purpose */}
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <Label>
                Purpose <span className="text-red-500">*</span>
              </Label>
              <CustomTextarea
                value={field.value}
                onChange={field.onChange}
                placeholder="Describe your purpose for booking this facility"
                maxLength={PURPOSE_MAX}
                isInvalid={field.value?.length >= PURPOSE_MAX}
                required
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

        {/* Validation Warnings */}
        {console.log('[BookingForm] Validation warnings received:', validationWarnings)}
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
