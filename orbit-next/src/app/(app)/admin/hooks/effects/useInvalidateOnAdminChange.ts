import { useEffect, useRef } from 'react';
import type { QueryClient } from '@tanstack/react-query';

export function useInvalidateOnAdminChange(authUserId: string | null, isAdmin: boolean, queryClient: QueryClient) {
  const hasInvalidatedRef = useRef(false);

  useEffect(() => {
    if (!authUserId || !isAdmin || hasInvalidatedRef.current) return;
    hasInvalidatedRef.current = true;

    try {
      queryClient.invalidateQueries({ queryKey: ['/api/facilities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] });
    } catch {
      // no-op
    }
  }, [authUserId, isAdmin, queryClient]);
}
