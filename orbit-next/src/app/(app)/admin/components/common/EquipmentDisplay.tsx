'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { FacilityBooking } from '@/shared/schema';
import { safeJsonParse } from '@admin';

interface EquipmentDisplayProps {
  booking: FacilityBooking | any;
  bookingItemStatus: Record<string, Record<string, 'prepared' | 'not_available'>>;
}

export function EquipmentDisplay({ booking, bookingItemStatus }: EquipmentDisplayProps) {
  const [openOthers, setOpenOthers] = useState<Record<string, boolean>>({});

  try {
    const eq = booking.equipment || null;
    if (!eq) return null;

    const rawItems = Array.isArray(eq.items) 
      ? eq.items.map((s: string) => String(s).replace(/_/g, ' ')).filter(Boolean) 
      : [];
    const othersText = eq.others && String(eq.others).trim() ? String(eq.others).trim() : null;
    
    const allItems = rawItems.filter((s: string) => !/^others[:\s]*$/i.test(String(s).trim()));
    if (allItems.length === 0 && !othersText) return null;

    const displayItems = allItems.slice(0, 6);
    const hasMore = allItems.length > 6;

    let bookingStatuses = bookingItemStatus[String(booking.id)] || {};
    
    if (Object.keys(bookingStatuses).length === 0 && booking?.adminResponse) {
      try {
        const resp = String(booking.adminResponse);
        const m1 = resp.match(/Needs:\s*(\{[\s\S]*\})/i);
        const m2 = resp.match(/[—\-]\s*(\{[\s\S]*\})\s*$/);
        const jsonTxt = (m1 && m1[1]) ? m1[1] : (m2 && m2[1]) ? m2[1] : null;
        if (jsonTxt) {
          const parsed: any = safeJsonParse(jsonTxt);
          if (parsed && parsed.items && typeof parsed.items === 'object' && !Array.isArray(parsed.items)) {
            const tempStatuses: Record<string, 'prepared' | 'not_available'> = {};
            for (const [k, v] of Object.entries(parsed.items)) {
              const matchingItem = allItems.find((item: string) => 
                item.toLowerCase() === String(k).toLowerCase() || 
                item.replace(/_/g, ' ').toLowerCase() === String(k).replace(/_/g, ' ').toLowerCase()
              );
              if (matchingItem) {
                const val = (String(v).toLowerCase().includes('prepared')) 
                  ? 'prepared' 
                  : (String(v).toLowerCase().includes('not') ? 'not_available' : undefined);
                if (val) tempStatuses[matchingItem] = val;
              }
            }
            bookingStatuses = tempStatuses;
          }
        }
      } catch (e) {
      }
    }
    
    const coloredSpan = (it: string) => {
      const s = bookingStatuses[it];
      if (s === 'prepared') return <span className="text-green-600 font-medium">{it}</span>;
      if (s === 'not_available') return <span className="text-red-600 font-medium">{it}</span>;
      return <span>{it}</span>;
    };

    return (
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-xs font-medium text-gray-700">Equipment:</div>
          {othersText && (() => {
            const id = String(booking.id || Math.random());
            const isOpen = !!openOthers[id];
            return (
              <Popover open={isOpen} onOpenChange={(v) => setOpenOthers(prev => ({ ...prev, [id]: v }))}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button 
                          onClick={() => setOpenOthers(prev => ({ ...prev, [id]: !prev[id] }))} 
                          className="text-xs text-blue-600 hover:underline cursor-pointer" 
                          aria-expanded={isOpen}
                        >
                          view other
                        </button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="top" 
                      align="start" 
                      className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden"
                    >
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <p className="font-semibold text-sm text-gray-800 text-left">Other equipment</p>
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-gray-900 leading-5 break-words text-left">{othersText}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <PopoverContent 
                  side="top" 
                  align="start" 
                  className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left"
                >
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="font-semibold text-sm text-gray-800 text-left">Other equipment</p>
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-gray-900 leading-5 break-words text-left">{othersText}</p>
                  </div>
                </PopoverContent>
              </Popover>
            );
          })()}
        </div>
        {displayItems.length > 0 && (
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
              {displayItems.map((it: string, idx: number) => (
                <div key={idx} className="truncate">{coloredSpan(it)}</div>
              ))}
            </div>
            {hasMore && (
              <div className="mt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-xs text-blue-600 hover:underline">
                      +{allItems.length - displayItems.length} more
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-56 p-2 z-50">
                    <div className="text-sm">
                      {allItems.slice(displayItems.length).map((it: string, idx: number) => (
                        <div key={idx} className="py-1">{coloredSpan(it)}</div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        )}
      </div>
    );
  } catch (e) {
    return null;
  }
}
