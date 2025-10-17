import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useMemo } from 'react';

export default function SearchPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1] || '');
  const q = params.get('query') || '';

  const { data: facilities = [] as any[] } = useQuery({
    queryKey: ['/api/facilities'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/facilities');
      return await res.json();
    },
    enabled: !!q,
  });

  const { data: bookings = [] as any[] } = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/bookings/all');
      return await res.json();
    },
    enabled: !!q,
  });

  const term = q.trim().toLowerCase();
  const facilityResults = useMemo(() => {
    if (!term) return [];
    return (facilities || []).filter((f: any) => String(f.name || '').toLowerCase().includes(term));
  }, [facilities, term]);

  const bookingResults = useMemo(() => {
    if (!term) return [];
    return (bookings || []).filter((b: any) => {
      try {
        return (String(b.userEmail || '').toLowerCase().includes(term) || String(b.purpose || '').toLowerCase().includes(term));
      } catch (e) { return false; }
    });
  }, [bookings, term]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Search results for “{q}”</h2>

      <section className="mb-6">
        <h3 className="font-medium mb-2">Facilities ({facilityResults.length})</h3>
        {facilityResults.length === 0 ? <div className="text-sm text-muted-foreground">No matching facilities</div> : (
          <ul className="space-y-2">
            {facilityResults.map((f: any) => (
              <li key={f.id} className="p-3 border rounded">{f.name} — capacity: {f.capacity}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-medium mb-2">Bookings ({bookingResults.length})</h3>
        {bookingResults.length === 0 ? <div className="text-sm text-muted-foreground">No matching bookings</div> : (
          <ul className="space-y-2">
            {bookingResults.map((b: any) => (
              <li key={b.id} className="p-3 border rounded">
                <div className="font-medium">{b.userEmail || 'Unknown'}</div>
                <div className="text-sm">{b.purpose}</div>
                <div className="text-xs text-gray-600">{new Date(b.startTime).toLocaleString()} - {new Date(b.endTime).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
