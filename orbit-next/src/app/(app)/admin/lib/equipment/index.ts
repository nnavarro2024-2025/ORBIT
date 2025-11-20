import { safeJsonParse } from '../helpers';

export function parseEquipmentItemsFromBooking(booking: any): string[] {
  try {
    if (!booking || !booking.equipment) return [];
    let parsed: any = null;
    if (typeof booking.equipment === 'string') {
      parsed = safeJsonParse(booking.equipment);
    } else if (typeof booking.equipment === 'object') {
      parsed = booking.equipment;
    }
    if (!parsed) return [];
    const items = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed) ? parsed : []);
    const cleanedItems: string[] = [];
    for (const item of items) {
      const itemStr = String(item || '').trim();
      if (!itemStr) continue;
      const lower = itemStr.toLowerCase().replace(/_/g, ' ');
      if (lower.includes('others')) continue;
      let friendly = itemStr;
      if (lower.includes('whiteboard')) friendly = 'Whiteboard & Markers';
      else if (lower.includes('projector')) friendly = 'Projector';
      else if (lower.includes('extension') && lower.includes('cord')) friendly = 'Extension Cord';
      else if (lower.includes('hdmi')) friendly = 'HDMI Cable';
      else if (lower.includes('extra') && lower.includes('chair')) friendly = 'Extra Chairs';
      else friendly = itemStr.replace(/_/g, ' ').replace(/[.,;]+$/g, '').trim();
      if (friendly && !cleanedItems.includes(friendly)) cleanedItems.push(friendly);
    }
    const others = parsed.others ? String(parsed.others).trim() : '';
    if (others && !cleanedItems.some(item => item.toLowerCase().includes('others'))) {
      cleanedItems.push(`Others: ${others}`);
    }
    return cleanedItems;
  } catch {
    return [];
  }
}
