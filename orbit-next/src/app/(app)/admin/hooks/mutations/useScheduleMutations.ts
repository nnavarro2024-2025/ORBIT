import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/ui";
import type { ReportSchedule } from "@shared/schema";

export function useScheduleMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createScheduleMutation = useMutation({
    mutationFn: async (payload: Partial<ReportSchedule>) => {
      const res = await apiRequest('POST', '/api/admin/report-schedules', payload);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create schedule');
      }
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: 'Schedule created', description: 'Report schedule saved successfully.' });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/report-schedules'] });
    },
    onError: (err: any) => {
      const message = err?.message || 'Failed to create schedule';
      toast({ title: 'Create failed', description: message, variant: 'destructive' });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ReportSchedule> }) => {
      const res = await apiRequest('PUT', `/api/admin/report-schedules/${id}`, payload);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update schedule');
      }
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: 'Schedule updated', description: 'Changes saved successfully.' });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/report-schedules'] });
    },
    onError: (err: any) => {
      const message = err?.message || 'Failed to update schedule';
      toast({ title: 'Update failed', description: message, variant: 'destructive' });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/report-schedules/${id}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to delete schedule');
      }
    },
    onSuccess: async () => {
      toast({ title: 'Schedule deleted', description: 'Report schedule removed.' });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/report-schedules'] });
    },
    onError: (err: any) => {
      const message = err?.message || 'Failed to delete schedule';
      toast({ title: 'Delete failed', description: message, variant: 'destructive' });
    },
  });

  const toggleScheduleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest('PUT', `/api/admin/report-schedules/${id}`, { isActive });
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/report-schedules'] });
      toast({
        title: `Schedule ${variables.isActive ? 'activated' : 'paused'}`,
        description: `Report will ${variables.isActive ? 'resume running' : 'no longer run automatically'}.`,
      });
    },
    onError: (err: any) => {
      const message = err?.message || 'Failed to update schedule status';
      toast({ title: 'Update failed', description: message, variant: 'destructive' });
    },
  });

  return {
    createScheduleMutation,
    updateScheduleMutation,
    deleteScheduleMutation,
    toggleScheduleActiveMutation,
  };
}
