/**
 * Equipment Alert Parser Utilities
 * 
 * Handles parsing of equipment-related alerts and notifications.
 * Extracts structured data from various alert formats.
 */

export interface ParsedEquipmentAlert {
  visibleTitle: string;
  titleRequesterEmail: string | null;
  equipmentList: string[];
  othersText: string | null;
  cleaned: string;
  needsObj: any;
  itemsWithStatus: Array<{ label: string; status: 'prepared' | 'not_available' | 'pending' }> | null;
}

/**
 * Maps raw equipment tokens to display-friendly labels
 */
function mapToken(rawToken: string): string | null {
  const raw = String(rawToken || '').replace(/_/g, ' ').trim();
  const lower = raw.toLowerCase();
  
  // Only skip if token is exactly 'other' or 'others'
  if (lower === 'others' || lower === 'other') return null;
  if (lower === 'whiteboard') return 'Whiteboard & Markers';
  if (lower === 'projector') return 'Projector';
  if (lower === 'extension cord' || lower === 'extension_cord') return 'Extension Cord';
  if (lower === 'hdmi') return 'HDMI Cable';
  if (lower === 'extra chairs' || lower === 'extra_chairs') return 'Extra Chairs';
  
  return raw.replace(/[.,;]+$/g, '').trim();
}

/**
 * Extracts JSON blocks from text using brace matching
 */
function extractJsonAroundKey(text: string, key: string): string | null {
  const idx = text.indexOf(key);
  if (idx === -1) return null;
  
  let open = text.indexOf('{', idx);
  if (open === -1) open = text.lastIndexOf('{', idx);
  if (open === -1) return null;
  
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(open, i + 1);
      }
    }
  }
  return null;
}

/**
 * Parses quoted key-value pairs from text
 */
function parseQuotedPairs(text: string): Record<string, string> {
  const pairs: Record<string, string> = {};
  try {
    const re = /"([^\"]+)"\s*:\s*"([^\"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      try { 
        pairs[m[1]] = m[2]; 
      } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }
  return pairs;
}

/**
 * Parses inline "label: status" fragments
 */
function parseInlineLabelStatus(text: string): Record<string, string> {
  const pairs: Record<string, string> = {};
  try {
    const re = /([A-Za-z0-9 &]+?)\s*[:\-]\s*(prepared|not_available|not available|prepared|true|false|yes|no)/gi;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(text)) !== null) {
      const key = String(mm[1] || '').trim();
      const val = String(mm[2] || '').trim();
      if (key) pairs[key] = val;
    }
    
    // Also handle patterns like '• label: status'
    if (Object.keys(pairs).length === 0) {
      const bullets = (text || '').split(/\u2022|\u2023|\u25E6|\*|\n/);
      for (const part of bullets) {
        const m2 = /([A-Za-z0-9 &]+?)\s*[:\-]\s*(prepared|not_available|not available|prepared|true|false|yes|no)/i.exec(part || '');
        if (m2) pairs[String(m2[1]).trim()] = String(m2[2]).trim();
      }
    }
  } catch (e) { /* ignore */ }
  return pairs;
}

/**
 * Main function to parse equipment alerts
 */
export function parseEquipmentAlert(alert: any): ParsedEquipmentAlert {
  let raw = String(alert?.message || alert?.details || '');
  
  // Unescape common escaped JSON sequences
  try {
    raw = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  } catch (e) { /* ignore */ }
  
  const combinedMessage = String(alert?.message || '') + ' ' + String(alert?.details || '');
  let visibleTitle = String(alert?.title || '');
  let titleRequesterEmail: string | null = null;

  // Extract email from title
  try {
    const m = visibleTitle.match(/[—–-]\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*$/);
    if (m && m[1]) {
      titleRequesterEmail = m[1];
      visibleTitle = visibleTitle.replace(/[—–-]\s*[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\s*$/, '').trim();
    }
  } catch (e) {
    titleRequesterEmail = null;
  }

  let needsObj: any = null;
  
  // Try to extract structured note
  try {
    if (alert && (alert as any).structuredNote) {
      needsObj = (alert as any).structuredNote;
    }
  } catch (e) { /* ignore */ }

  try {
    // Find JSON blocks with "items" key
    let itemsBlock: string | null = null;
    try {
      itemsBlock = extractJsonAroundKey(raw, '"items"');
    } catch (e) { 
      itemsBlock = null; 
    }
    
    if (itemsBlock) {
      try {
        const parsed = JSON.parse(itemsBlock);
        needsObj = parsed;
        raw = raw.replace(itemsBlock, '');
      } catch (e) {
        needsObj = null;
      }
    }

    // Parse any JSON blocks
    if (!needsObj) {
      const jsonBlocks = Array.from(raw.matchAll(/(\{[\s\S]*?\})/g)).map(m => m[1]);
      for (const block of jsonBlocks) {
        try {
          const parsed = JSON.parse(block);
          if (parsed && (parsed.items || parsed.others || typeof parsed === 'object')) {
            needsObj = parsed;
            break;
          }
        } catch (e) { /* ignore */ }
      }

      if (jsonBlocks.length > 0) {
        for (const block of jsonBlocks) raw = raw.replace(block, '');
      }
    }

    // Try legacy 'Needs: { ... }' format
    if (!needsObj) {
      const needsMatch = raw.match(/Needs:\s*(\{[\s\S]*\})/i);
      if (needsMatch && needsMatch[1]) {
        try { 
          needsObj = JSON.parse(needsMatch[1]); 
          raw = raw.replace(needsMatch[1], ''); 
        } catch (e) { 
          needsObj = null; 
        }
      }
    }

    // Try new '[Equipment: {...}]' format
    if (!needsObj) {
      const equipMatch = raw.match(/\[Equipment:\s*(\{[\s\S]*?\})\]/i);
      if (equipMatch && equipMatch[1]) {
        try { 
          needsObj = JSON.parse(equipMatch[1]); 
          raw = raw.replace(equipMatch[0], ''); 
        } catch (e) { 
          needsObj = null; 
        }
      }
    }

    // Clean up leftover fragments
    try {
      raw = raw.replace(/"[^\"]+"\s*:\s*"[^\"]+"\s*,?/g, '');
      raw = raw.replace(/}\s*\{/g, ' ');
      raw = raw.replace(/[{}]/g, '');
    } catch (e) { /* ignore */ }
  } catch (e) { 
    needsObj = null; 
  }

  // Parse legacy free-text format
  const eqMatch = raw.match(/(?:Requested equipment|equipment request):\s*([^\[]+)/i);
  let equipmentList: string[] = [];
  let othersText: string | null = null;
  let itemsWithStatus: Array<{ label: string; status: 'prepared' | 'not_available' | 'pending' }> | null = null;

  if (needsObj) {
    // Normalize if needsObj is directly the items map
    if (!needsObj.items && typeof needsObj === 'object') {
      const maybeKeys = Object.keys(needsObj);
      const lookLikeItems = maybeKeys.length > 0 && maybeKeys.every(k => 
        typeof needsObj[k] === 'string' || typeof needsObj[k] === 'boolean'
      );
      if (lookLikeItems) {
        needsObj = { items: needsObj };
      }
    }
    
    // Handle items as array
    if (Array.isArray(needsObj.items)) {
      const mapped = needsObj.items
        .map((s: string) => {
          const rawTok = String(s || '').trim();
          if (!rawTok) return null;
          return mapToken(rawTok);
        })
        .filter(Boolean) as string[];
      equipmentList = mapped;
      othersText = needsObj.others ? String(needsObj.others).trim() : null;
    }

    // Handle items as object (with statuses)
    try {
      if (needsObj.items && typeof needsObj.items === 'object' && !Array.isArray(needsObj.items)) {
        itemsWithStatus = Object.keys(needsObj.items).map((k) => {
          const mapped = mapToken(k);
          if (!mapped) return null;
          const rawVal = (needsObj.items as any)[k];
          const val = String(rawVal || '').toLowerCase();
          const status: 'prepared' | 'not_available' | 'pending' = 
            val === 'prepared' || val === 'true' || val === 'yes' 
              ? 'prepared' 
              : (val === 'not available' || val === 'not_available' || val === 'false' || val === 'no' 
                ? 'not_available' 
                : 'pending');
          return { label: mapped, status };
        }).filter(Boolean) as Array<{ label: string; status: 'prepared' | 'not_available' | 'pending' }>;
      }
    } catch (e) { 
      itemsWithStatus = null; 
    }
    
    // Fallback to quoted pairs
    if (!itemsWithStatus) {
      const pairs = parseQuotedPairs(combinedMessage);
      const keys = Object.keys(pairs || {});
      if (keys.length > 0) {
        const mapped = keys.map(k => {
          const lab = mapToken(k);
          if (!lab) return null;
          const val = String(pairs[k] || '').toLowerCase();
          const status: 'prepared' | 'not_available' | 'pending' = 
            val === 'prepared' || val === 'true' || val === 'yes' 
              ? 'prepared' 
              : (val === 'not available' || val === 'not_available' || val === 'false' || val === 'no' 
                ? 'not_available' 
                : 'pending');
          return { label: lab, status };
        }).filter(Boolean) as Array<{ label: string; status: 'prepared' | 'not_available' | 'pending' }>;
        itemsWithStatus = mapped.length > 0 ? mapped : null;
      }
    }

    // Try inline label:status fragments
    if (!itemsWithStatus || itemsWithStatus.length === 0) {
      const pairs2 = parseInlineLabelStatus(combinedMessage);
      const keys2 = Object.keys(pairs2 || {});
      if (keys2.length > 0) {
        const mapped2 = keys2.map(k => {
          const lab = mapToken(k);
          if (!lab) return null;
          const val = String(pairs2[k] || '').toLowerCase();
          const status: 'prepared' | 'not_available' | 'pending' = 
            val === 'prepared' || val === 'true' || val === 'yes' 
              ? 'prepared' 
              : (val === 'not available' || val === 'not_available' || val === 'false' || val === 'no' 
                ? 'not_available' 
                : 'pending');
          return { label: lab, status };
        }).filter(Boolean) as Array<{ label: string; status: 'prepared' | 'not_available' | 'pending' }>;
        itemsWithStatus = mapped2.length > 0 ? mapped2 : null;
      }
    }
  } else if (eqMatch && eqMatch[1]) {
    const parts = eqMatch[1].split(/[,;]+/).map(s => String(s).trim()).filter(Boolean);
    let othersFromParts = '';
    const mapped = parts.map((p) => {
      const lower = p.toLowerCase();
      if (lower.includes('others')) {
        const trailing = p.replace(/.*?others[:\s-]*/i, '').trim();
        if (trailing && !othersFromParts) othersFromParts = trailing;
        return null;
      }
      return mapToken(p);
    }).filter(Boolean) as string[];
    equipmentList = mapped;
    
    const extrasMatch = eqMatch[1].match(/Others?:\s*(.*)$/i);
    othersText = othersFromParts || (extrasMatch && extrasMatch[1] ? String(extrasMatch[1]).trim() : null);

    // Try to parse JSON block with per-item statuses
    try {
      const jsonMatch = combinedMessage.match(/\{[^}]*"items"[^}]*:?\s*\{[^}]*\}[^}]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && parsed.items && typeof parsed.items === 'object') {
          const displayNameMap = new Map<string, string>();
          for (const item of equipmentList) {
            displayNameMap.set(item.toLowerCase(), item);
            if (item === 'Whiteboard & Markers') displayNameMap.set('whiteboard', item);
            if (item === 'Projector') displayNameMap.set('projector', item);
            if (item === 'Extension Cord') {
              displayNameMap.set('extension cord', item);
              displayNameMap.set('extension_cord', item);
            }
            if (item === 'HDMI Cable') {
              displayNameMap.set('hdmi', item);
              displayNameMap.set('hdmi cable', item);
            }
            if (item === 'Extra Chairs') {
              displayNameMap.set('extra chairs', item);
              displayNameMap.set('extra_chairs', item);
            }
          }

          itemsWithStatus = Object.keys(parsed.items).map((k) => {
            const rawVal = parsed.items[k];
            const val = String(rawVal || '').toLowerCase();
            const status: 'prepared' | 'not_available' | 'pending' = 
              val === 'prepared' || val === 'true' || val === 'yes' 
                ? 'prepared' 
                : (val === 'not available' || val === 'not_available' || val === 'false' || val === 'no' 
                  ? 'not_available' 
                  : 'pending');

            const lowerKey = k.toLowerCase();
            const displayName = displayNameMap.get(lowerKey) || mapToken(k) || String(k);

            return { label: displayName, status };
          });
        }
      }
    } catch (e) { /* ignore */ }
  }

  // Normalize visible title
  try {
    if (/equipment\s*needs?/i.test(visibleTitle) || /equipment needs submitted/i.test(visibleTitle)) {
      visibleTitle = 'Equipment or Needs Request';
    }
    const m = visibleTitle.match(/[—–-]\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*$/);
    if (m && m[1]) {
      visibleTitle = visibleTitle.replace(/[—–-]\s*[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\s*$/, '').trim();
    }
  } catch (e) { /* ignore */ }

  // Clean raw snippet
  let cleaned = raw
    .replace(/\s*\[booking:[^\]]+\]/g, '')
    .replace(/\s*\[Equipment:\s*\{[\s\S]*?\}\]/gi, '')
    .replace(/Needs:\s*\{[\s\S]*\}\s*/i, '')
    .replace(/,?\s*Others?:\s*[^,\]]+/i, '')
    .trim();

  try {
    cleaned = cleaned.replace(/"items"\s*:\s*(?:\{[\s\S]*?\}|"[^"]*"|[^\s,;]*)/gi, '');
    cleaned = cleaned.replace(/items"\s*:\s*/gi, '').replace(/"items"/gi, '').replace(/items":/gi, '');

    const jsonBlocks = Array.from((cleaned.match(/(\{[\s\S]*?\})/g) || []));
    for (const block of jsonBlocks) {
      const reDbl = new RegExp(block.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + "\\s*" + block.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'g');
      cleaned = cleaned.replace(reDbl, block);
    }

    cleaned = cleaned.replace(/}\s*\{/g, ' ').replace(/[{}]/g, '').replace(/\s{2,}/g, ' ').trim();
  } catch (e) { /* ignore */ }

  // Deduplicate repeated content
  try {
    const blocks = Array.from((cleaned.match(/(\{[\s\S]*?\})/g) || []));
    const seenBlocks = new Set<string>();
    for (const b of blocks) {
      const norm = b.replace(/\s+/g, ' ').trim();
      if (seenBlocks.has(norm)) {
        const re = new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        cleaned = cleaned.replace(re, '');
      } else {
        seenBlocks.add(norm);
      }
    }

    const bulletLists = Array.from((cleaned.match(/(?:^|\n)(?:-\s*[^\n]+(?:\n|-\s*[^\n]+)*)/g) || []));
    const seenLists = new Set<string>();
    for (const bl of bulletLists) {
      const normalized = bl.replace(/\s+/g, ' ').trim();
      if (seenLists.has(normalized)) {
        cleaned = cleaned.replace(bl, '');
      } else {
        seenLists.add(normalized);
      }
    }

    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  } catch (e) { /* ignore */ }

  // Normalize legacy booking request wording
  try {
    const lowTitle = String(visibleTitle || '').toLowerCase();
    const lowClean = String(cleaned || '').toLowerCase();
    if (/booking request|booking submitted|booking request submitted/i.test(lowTitle) || 
        /booking request|booking submitted|pending approval|requested a booking/i.test(lowClean)) {
      visibleTitle = 'Booking Scheduled';
      cleaned = cleaned
        .replace(/booking request/ig, 'booking')
        .replace(/has been submitted and is pending approval/ig, 'has been scheduled')
        .replace(/submitted for approval/ig, 'scheduled')
        .replace(/requested a booking for/ig, 'scheduled a booking for')
        .replace(/requested a booking/ig, 'scheduled a booking');
    }
  } catch (e) { /* ignore */ }

  return { 
    visibleTitle, 
    titleRequesterEmail, 
    equipmentList, 
    othersText, 
    cleaned, 
    needsObj, 
    itemsWithStatus 
  };
}
