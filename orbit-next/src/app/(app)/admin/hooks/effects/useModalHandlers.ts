"use client";

import { useCallback } from "react";
import { useToast } from "@/hooks/ui";
import { getDateRange } from "@admin";

type UseModalHandlersProps = {
  facilityForUnavailable: any;
  setFacilityForUnavailable: (facility: any) => void;
  setIsUnavailableModalOpen: (open: boolean) => void;
  setUnavailableDatesByFacility: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  toggleFacilityAvailabilityMutation: any;
  adminBookingsData: any[];
  getFacilityName: (id: any) => string;
  getUserEmail: (id: any) => string;
  isExportingPdf: boolean;
  setIsExportingPdf: (value: boolean) => void;
};

export function useModalHandlers({
  facilityForUnavailable,
  setFacilityForUnavailable,
  setIsUnavailableModalOpen,
  setUnavailableDatesByFacility,
  toggleFacilityAvailabilityMutation,
  adminBookingsData,
  getFacilityName,
  getUserEmail,
  isExportingPdf,
  setIsExportingPdf,
}: UseModalHandlersProps) {
  const { toast } = useToast();
  const { apiRequest } = require("@/lib/api");

  const handleUnavailableConfirm = useCallback((reason?: string, startDate?: string, endDate?: string) => {
    console.log('[AdminDashboard] handleUnavailableConfirm', { reason, startDate, endDate });
    if (!facilityForUnavailable) return;
    let fullReason = reason || '';
    if (startDate && endDate) {
      const dateInfo = startDate === endDate 
        ? `Unavailable on ${startDate}` 
        : `Unavailable from ${startDate} to ${endDate}`;
      fullReason = fullReason ? `${dateInfo}. ${fullReason}` : dateInfo;
    }
    if (startDate && endDate) {
      toggleFacilityAvailabilityMutation.mutate({
        facilityId: facilityForUnavailable.id,
        available: false,
        reason: fullReason,
        startDate,
        endDate,
      });
    } else {
      toggleFacilityAvailabilityMutation.mutate({
        facilityId: facilityForUnavailable.id,
        available: false,
        reason: fullReason,
      });
    }
    if (startDate && facilityForUnavailable.id) {
      setUnavailableDatesByFacility(prev => {
        const prevDates = prev[facilityForUnavailable.id] || [];
        const newDates = [
          ...prevDates,
          ...(startDate && endDate
            ? getDateRange(startDate, endDate)
            : startDate ? [startDate] : []),
        ];
        return { ...prev, [facilityForUnavailable.id]: Array.from(new Set(newDates)) };
      });
    }
    setFacilityForUnavailable(null);
    setIsUnavailableModalOpen(false);
  }, [facilityForUnavailable, setFacilityForUnavailable, setIsUnavailableModalOpen, setUnavailableDatesByFacility, toggleFacilityAvailabilityMutation]);

  const generateBookingWeeklyReport = useCallback(() => {
    try {
      const bk = Array.isArray(adminBookingsData) ? adminBookingsData.slice() : [];
      import('@admin/lib/reports').then(({ generateBookingWeeklyReport }) => {
        try {
          generateBookingWeeklyReport(bk as any[], getFacilityName, getUserEmail);
        } catch (innerErr) {
          try { toast({ title: 'Report Failed', description: String(innerErr), variant: 'destructive' }); } catch (_) { }
        }
      }).catch((e) => {
        try { toast({ title: 'Report Failed', description: String(e), variant: 'destructive' }); } catch (_) { }
      });
    } catch (e) {
      try { toast({ title: 'Report Failed', description: String(e), variant: 'destructive' }); } catch (_) { }
    }
  }, [adminBookingsData, getFacilityName, getUserEmail, toast]);

  const handleExportPdf = useCallback(async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const res = await apiRequest('POST', '/api/admin/reports/export', { reportType: 'booking-overview' });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orbit-booking-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      if (process.env.NODE_ENV !== 'production') {
        toast({ title: 'Export complete', description: 'PDF report downloaded successfully.' });
      }
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        toast({ title: 'Export failed', description: error?.message || 'Unable to generate PDF export.', variant: 'destructive' });
      } else {
        console.error('[AdminDashboard] Export PDF failed', error);
      }
    } finally {
      setIsExportingPdf(false);
    }
  }, [isExportingPdf, toast, apiRequest, setIsExportingPdf]);

  return {
    handleUnavailableConfirm,
    generateBookingWeeklyReport,
    handleExportPdf,
  };
}
