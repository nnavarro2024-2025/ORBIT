import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export function useUserMutations() {
  const queryClient = useQueryClient();

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason, duration, customDate }: any) => {
      const payload: any = { reason, duration };
      if (duration === 'custom' && customDate) payload.customDate = customDate;
      const res = await apiRequest('POST', `/api/admin/users/${userId}/ban`, payload);
      return res.json?.();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
      ]);
      // Force refetch to update UI immediately
      await queryClient.refetchQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async ({ userId }: any) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/unban`);
      return res.json?.();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
      ]);
      // Force refetch to update UI immediately
      await queryClient.refetchQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  return {
    banUserMutation,
    unbanUserMutation,
  };
}
