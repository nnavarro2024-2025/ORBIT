import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/components/ui/sidebar";
import { LogOut, User, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useNotifications } from "@/hooks/useNotifications";
import { SkeletonListItem } from "@/components/ui/skeleton-presets";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLegacyLocation } from "@/lib/navigation";
import ProfileModal from "./modals/ProfileModal";
import SearchBar from "@/components/ui/SearchBar";
import { useMemo, useRef, useCallback, useState, useEffect } from "react";

// Helper: parse alert for equipment-related content in a safe, testable way
function parseEquipmentAlert(alert: any) {
  let raw = String(alert?.message || alert?.details || '');
  // Unescape common escaped JSON sequences so embedded JSON like {"items":...} is parseable
  try {
    // replace escaped quotes and newlines produced by JSON.stringified logs
    raw = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  } catch (e) { }
  const combinedMessage = String(alert?.message || '') + ' ' + String(alert?.details || '');
  let visibleTitle = String(alert?.title || '');
  let titleRequesterEmail: string | null = null;

  try {
    const m = visibleTitle.match(/[—–-]\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*$/);
    if (m && m[1]) {
      titleRequesterEmail = m[1];
      visibleTitle = visibleTitle.replace(/[—–-]\s*[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\s*$/, '').trim();
    }
  } catch (e) {
    titleRequesterEmail = null;
  }

  // Try to extract any JSON blocks from the raw text and prefer them for structured 'needs'
  let needsObj: any = null;
  // If the server sanitized the message and attached a parsed object as `structuredNote`, prefer that
  try {
    if (!needsObj && alert && (alert as any).structuredNote) {
      needsObj = (alert as any).structuredNote;
    }
  } catch (e) { /* ignore */ }
  try {
    // Helper: given a raw string and a key (e.g. '"items"'), find the surrounding JSON object using brace matching
    const extractJsonAroundKey = (text: string, key: string): string | null => {
      const idx = text.indexOf(key);
      if (idx === -1) return null;
      // Prefer the first opening brace at or after the key
      let open = text.indexOf('{', idx);
      // If not found, fall back to the last opening brace before the key
      if (open === -1) open = text.lastIndexOf('{', idx);
      if (open === -1) return null;
      // find matching closing brace by scanning forward
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
    };

    // First, try to find a JSON block that explicitly contains an "items" map (most authoritative)
    let itemsBlock: string | null = null;
    try {
      itemsBlock = extractJsonAroundKey(raw, '"items"');
    } catch (e) { itemsBlock = null; }
    if (itemsBlock) {
      try {
        const parsed = JSON.parse(itemsBlock);
        needsObj = parsed;
        raw = raw.replace(itemsBlock, '');
      } catch (e) {
        // fallthrough
        needsObj = null;
      }
    }

    // If we didn't find an explicit items block, parse any JSON blocks we can
    if (!needsObj) {
      const jsonBlocks = Array.from(raw.matchAll(/(\{[\s\S]*?\})/g)).map(m => m[1]);
      for (const block of jsonBlocks) {
        try {
          const parsed = JSON.parse(block);
          if (parsed && (parsed.items || parsed.others || typeof parsed === 'object')) {
            needsObj = parsed;
            break;
          }
        } catch (e) {
          // ignore parse errors
        }
      }

      if (jsonBlocks.length > 0) {
        for (const block of jsonBlocks) raw = raw.replace(block, '');
      }
    }

    // Also try legacy 'Needs: { ... }' if nothing found yet
    if (!needsObj) {
      const needsMatch = raw.match(/Needs:\s*(\{[\s\S]*\})/i);
      if (needsMatch && needsMatch[1]) {
        try { needsObj = JSON.parse(needsMatch[1]); raw = raw.replace(needsMatch[1], ''); } catch (e) { needsObj = null; }
      }
    }

    // Try new '[Equipment: {...}]' format
    if (!needsObj) {
      const equipMatch = raw.match(/\[Equipment:\s*(\{[\s\S]*?\})\]/i);
      if (equipMatch && equipMatch[1]) {
        try { needsObj = JSON.parse(equipMatch[1]); raw = raw.replace(equipMatch[0], ''); } catch (e) { needsObj = null; }
      }
    }

    // Finally, strip any leftover quoted key:value fragments like "hdmi":"not_available" that are not in JSON blocks
    try {
      raw = raw.replace(/"[^\"]+"\s*:\s*"[^\"]+"\s*,?/g, '');
      // Remove stray brace sequences left from partial removals (e.g. '}{' or leftover braces)
      raw = raw.replace(/}\s*\{/g, ' ');
      raw = raw.replace(/[{}]/g, '');
    } catch (e) { /* ignore */ }
  } catch (e) { needsObj = null; }

  // Legacy free-text
  const eqMatch = raw.match(/(?:Requested equipment|equipment request):\s*([^\[]+)/i);
  let equipmentList: string[] = [];
  let othersText: string | null = null;
  let itemsWithStatus: Array<{ label: string, status: 'prepared' | 'not_available' | 'pending' }> | null = null;

  const mapToken = (rawToken: string) => {
    const raw = String(rawToken || '').replace(/_/g, ' ').trim();
    const lower = raw.toLowerCase();
    // Only skip if token is exactly 'other' or 'others' – do not filter
    // out unrelated tokens that merely contain that substring (prevents
    // accidental dropping of legitimate item labels).
    if (lower === 'others' || lower === 'other') return null;
    if (lower === 'whiteboard') return 'Whiteboard & Markers';
    if (lower === 'projector') return 'Projector';
    if (lower === 'extension cord' || lower === 'extension_cord') return 'Extension Cord';
    if (lower === 'hdmi') return 'HDMI Cable';
    if (lower === 'extra chairs' || lower === 'extra_chairs') return 'Extra Chairs';
    return raw.replace(/[.,;]+$/g, '').trim();
  };

  // Fallback: parse quoted key:value pairs from combined message (handles malformed or embedded fragments)
  const parseQuotedPairs = () => {
    const pairs: Record<string, string> = {};
    try {
      const re = /"([^\"]+)"\s*:\s*"([^\"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(combinedMessage)) !== null) {
        try { pairs[m[1]] = m[2]; } catch (e) { /* ignore */ }
      }
    } catch (e) { }
    return pairs;
  };

  // Heuristic: parse inline "label: status" fragments (e.g. "whiteboard: prepared • projector: not_available")
  const parseInlineLabelStatus = () => {
    const pairs: Record<string, string> = {};
    try {
      // Accept separators like bullets, commas, middots, or simple spacing
      const text = combinedMessage || raw || '';
      const re = /([A-Za-z0-9 &]+?)\s*[:\-]\s*(prepared|not_available|not available|prepared|true|false|yes|no)/gi;
      let mm: RegExpExecArray | null;
      while ((mm = re.exec(text)) !== null) {
        const key = String(mm[1] || '').trim();
        const val = String(mm[2] || '').trim();
        if (key) pairs[key] = val;
      }
      // Also handle patterns like '• label: status' or 'label: status •' by splitting on bullets
      if (Object.keys(pairs).length === 0) {
        const bullets = (text || '').split(/\u2022|\u2023|\u25E6|\*|\n/);
        for (const part of bullets) {
          const m2 = /([A-Za-z0-9 &]+?)\s*[:\-]\s*(prepared|not_available|not available|prepared|true|false|yes|no)/i.exec(part || '');
          if (m2) pairs[String(m2[1]).trim()] = String(m2[2]).trim();
        }
      }
    } catch (e) {
      // ignore
    }
    return pairs;
  };

  if (needsObj) {
    // If needsObj appears to be directly the items map (keys -> status), normalize it
    if (!needsObj.items && typeof needsObj === 'object') {
      const maybeKeys = Object.keys(needsObj);
      const lookLikeItems = maybeKeys.length > 0 && maybeKeys.every(k => typeof needsObj[k] === 'string' || typeof needsObj[k] === 'boolean');
      if (lookLikeItems) {
        needsObj = { items: needsObj };
      }
    }
    // If items is an array, map tokens to labels
    if (Array.isArray(needsObj.items)) {
      const mapped = needsObj.items.map((s: string) => {
        const rawTok = String(s || '').trim();
        if (!rawTok) return null;
        // Don't filter out items - mapToken already returns null for 'others'
        return mapToken(rawTok);
      }).filter(Boolean) as string[];
      equipmentList = mapped;
      // Get othersText from the separate 'others' field, not from items array
      othersText = needsObj.others ? String(needsObj.others).trim() : null;
    }

    // If needsObj contains an items map (per-item statuses), extract it regardless of array vs object
    try {
      // Only treat items as a key->status map when it's an object (not an array)
      if (needsObj.items && typeof needsObj.items === 'object' && !Array.isArray(needsObj.items)) {
        itemsWithStatus = Object.keys(needsObj.items).map((k) => {
          const mapped = mapToken(k);
          if (!mapped) return null; // skip 'others'
          const rawVal = (needsObj.items as any)[k];
          const val = String(rawVal || '').toLowerCase();
          const status: 'prepared' | 'not_available' | 'pending' = val === 'prepared' || val === 'true' || val === 'yes' ? 'prepared' : (val === 'not available' || val === 'not_available' || val === 'false' || val === 'no' ? 'not_available' : 'pending');
          return { label: mapped, status };
        }).filter(Boolean) as Array<{ label: string, status: 'prepared' | 'not_available' | 'pending' }>;
      }
    } catch (e) { itemsWithStatus = null; }
    // If we still didn't obtain itemsWithStatus, try the quoted-pairs fallback
    if (!itemsWithStatus) {
      const pairs = parseQuotedPairs();
      const keys = Object.keys(pairs || {});
      if (keys.length > 0) {
        const mapped = keys.map(k => {
          const lab = mapToken(k);
          if (!lab) return null; // skip 'others'
          const val = String(pairs[k] || '').toLowerCase();
          const status: 'prepared' | 'not_available' | 'pending' = val === 'prepared' || val === 'true' || val === 'yes' ? 'prepared' : (val === 'not available' || val === 'not_available' || val === 'false' || val === 'no' ? 'not_available' : 'pending');
          return { label: lab, status };
        }).filter(Boolean) as Array<{ label: string, status: 'prepared' | 'not_available' | 'pending' }>;
        itemsWithStatus = mapped.length > 0 ? mapped : null;
      }
    }

    // Additional heuristic: inline "label: status" fragments
    if (!itemsWithStatus || itemsWithStatus.length === 0) {
      const pairs2 = parseInlineLabelStatus();
      const keys2 = Object.keys(pairs2 || {});
      if (keys2.length > 0) {
        const mapped2 = keys2.map(k => {
          const lab = mapToken(k);
          if (!lab) return null; // skip 'others'
          const val = String(pairs2[k] || '').toLowerCase();
          const status: 'prepared' | 'not_available' | 'pending' = val === 'prepared' || val === 'true' || val === 'yes' ? 'prepared' : (val === 'not available' || val === 'not_available' || val === 'false' || val === 'no' ? 'not_available' : 'pending');
          return { label: lab, status };
        }).filter(Boolean) as Array<{ label: string, status: 'prepared' | 'not_available' | 'pending' }>;
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
        return null; // Don't include 'others' in the equipment list - it goes to othersText
      }
      return mapToken(p);
    }).filter(Boolean) as string[];
    equipmentList = mapped;
    // also capture 'Others: ...' trailing token if present
    const extrasMatch = eqMatch[1].match(/Others?:\s*(.*)$/i);
    othersText = othersFromParts || (extrasMatch && extrasMatch[1] ? String(extrasMatch[1]).trim() : null);

    // After extracting the equipment list, check if there's a JSON block with per-item statuses
    // Pattern: {"items": {"Whiteboard & Markers": "prepared", "Projector": "not_available", ...}}
    // or {"items": {"whiteboard": "prepared", "projector": "not_available", ...}}
    try {
      const jsonMatch = combinedMessage.match(/\{[^}]*"items"[^}]*:?\s*\{[^}]*\}[^}]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && parsed.items && typeof parsed.items === 'object') {
          // Build a map from lowercase names to display names for matching
          const displayNameMap = new Map<string, string>();
          for (const item of equipmentList) {
            displayNameMap.set(item.toLowerCase(), item);
            // Also map common variations
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
            const status: 'prepared' | 'not_available' | 'pending' = val === 'prepared' || val === 'true' || val === 'yes' ? 'prepared' : (val === 'not available' || val === 'not_available' || val === 'false' || val === 'no' ? 'not_available' : 'pending');

            // Try to match the JSON key to a display name
            const lowerKey = k.toLowerCase();
            const displayName = displayNameMap.get(lowerKey) || mapToken(k) || String(k);

            return { label: displayName, status };
          });
        }
      }
    } catch (e) {
      // JSON parsing failed, keep itemsWithStatus null
    }
  }

  // Do not inject 'and others' placeholder; we'll show "Other details" separately.

  // Normalize visible title for equipment alerts
  try {
    if (/equipment\s*needs?/i.test(visibleTitle) || /equipment needs submitted/i.test(visibleTitle)) {
      visibleTitle = 'Equipment or Needs Request';
    }
    // remove appended email from title if present
    const m = visibleTitle.match(/[—–-]\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*$/);
    if (m && m[1]) visibleTitle = visibleTitle.replace(/[—–-]\s*[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\s*$/, '').trim();
  } catch (e) { }

  // Clean raw snippet for brief display: remove booking tags, equipment JSON tags, and stray fragments
  let cleaned = raw
    .replace(/\s*\[booking:[^\]]+\]/g, '')
    .replace(/\s*\[Equipment:\s*\{[\s\S]*?\}\]/gi, '')
    .replace(/Needs:\s*\{[\s\S]*\}\s*/i, '')
    .replace(/,?\s*Others?:\s*[^,\]]+/i, '')
    .trim();
  // Remove any leftover explicit "items" tokens or malformed fragments like '"items": "items":' that
  // may appear when JSON was embedded/printed multiple times. Also dedupe repeated JSON block copies.
  try {
    // remove patterns like "items":{...} or "items":"..." or bare items": occurrences
    cleaned = cleaned.replace(/"items"\s*:\s*(?:\{[\s\S]*?\}|"[^"]*"|[^\s,;]*)/gi, '');
    // remove any leftover bare occurrences of items": or "items" tokens
    cleaned = cleaned.replace(/items"\s*:\s*/gi, '').replace(/"items"/gi, '').replace(/items":/gi, '');

    // If the same JSON block was accidentally appended twice, collapse duplicates.
    const jsonBlocks = Array.from((cleaned.match(/(\{[\s\S]*?\})/g) || []));
    for (const block of jsonBlocks) {
      // Replace occurrences of block repeated twice (optionally separated by whitespace/newline) with a single block
      const reDbl = new RegExp(block.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + "\\s*" + block.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'g');
      cleaned = cleaned.replace(reDbl, block);
    }

    // Final cleanup: remove stray braces and collapse excessive whitespace
    cleaned = cleaned.replace(/}\s*\{/g, ' ').replace(/[{}]/g, '').replace(/\s{2,}/g, ' ').trim();
  } catch (e) {
    // ignore any regex errors
  }

  // Additional deduplication heuristics: remove repeated JSON blocks or repeated item lists which
  // sometimes appear back-to-back due to logging/serialization happening twice.
  try {
    // 1) Dedupe JSON blocks by normalized content
    const blocks = Array.from((cleaned.match(/(\{[\s\S]*?\})/g) || []));
    const seenBlocks = new Set<string>();
    for (const b of blocks) {
      const norm = b.replace(/\s+/g, ' ').trim();
      if (seenBlocks.has(norm)) {
        // remove all occurrences (or subsequent ones) of this block
        const re = new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        cleaned = cleaned.replace(re, '');
      } else {
        seenBlocks.add(norm);
      }
    }

    // 2) Dedupe repeated bullet lists (blocks of lines starting with '-')
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

    // 3) Dedupe inline dash-separated token lists like ' - a - b - c' when repeated
    const inlineListMatches = Array.from((cleaned.match(/(?:[^\n]{0,100})(?:\s-\s[^\n]+){2,}/g) || []));
    for (const match of inlineListMatches) {
      const occurrences = (cleaned.match(new RegExp(match.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'g')) || []);
      if (occurrences.length > 1) {
        // remove subsequent occurrences
        let removedOnce = false;
        cleaned = cleaned.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), (m) => {
          if (!removedOnce) { removedOnce = true; return m; }
          return '';
        });
      }
    }

    // Collapse excessive whitespace again
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  } catch (e) {
    // silence
  }

  // Normalize legacy "booking request" wording so the bell shows the new flow
  try {
    const lowTitle = String(visibleTitle || '').toLowerCase();
    const lowClean = String(cleaned || '').toLowerCase();
    // If title contains legacy 'booking request' phrasing, map to 'Booking Scheduled'
    if (/booking request|booking submitted|booking request submitted/i.test(lowTitle) || /booking request|booking submitted|pending approval|requested a booking/i.test(lowClean)) {
      visibleTitle = 'Booking Scheduled';
      // Replace some common legacy phrases in the short cleaned message
      cleaned = cleaned.replace(/booking request/ig, 'booking')
        .replace(/has been submitted and is pending approval/ig, 'has been scheduled')
        .replace(/submitted for approval/ig, 'scheduled')
        .replace(/requested a booking for/ig, 'scheduled a booking for')
        .replace(/requested a booking/ig, 'scheduled a booking');
    }
  } catch (e) { }

  return { visibleTitle, titleRequesterEmail, equipmentList, othersText, cleaned, needsObj, itemsWithStatus };
}

// Helper to aggressively sanitize a message string for display in the bell.
// Removes embedded JSON blocks, escaped JSON, stray '"items"' tokens, and duplicate lists.
function sanitizeDisplayText(input: string, keepEmails: boolean = false) {
  try {
    let s = String(input || '');
    // unescape common sequences
    s = s.replace(/\\n/g, '\n').replace(/\\"/g, '"');

    // remove JSON blocks
    const jsonBlocks = Array.from((s.match(/(\{[\s\S]*?\})/g) || []));
    for (const b of jsonBlocks) {
      // remove the block entirely to avoid showing raw JSON
      s = s.replace(b, '');
    }

    // remove email addresses - owner-facing messages should not display emails
    // BUT keep emails for admin/global notifications (like "Booking Created") so admins can see who created bookings
    if (!keepEmails) {
      s = s.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g, '').trim();
    }

    // remove explicit "items" tokens and items": occurrences
    s = s.replace(/"items"\s*:\s*/gi, '').replace(/items"\s*:\s*/gi, '').replace(/"items"/gi, '').replace(/items":/gi, '');

    // dedupe repeated inline dash lists (e.g. ' - a - b - c' repeated)
    s = s.replace(/(\s-\s[^\n]+)(?:\s-\s[^\n]+){1,}/g, (m) => {
      // collapse multiple items into a single comma-separated list
      const parts = m.split(/\s-\s/).map(p => p.trim()).filter(Boolean);
      return ' ' + parts.join(', ');
    });

    // remove duplicated adjacent sequences (very conservative)
    s = s.replace(/(\b[^\n]{5,200})\s+\1/g, '$1');

    // strip leftover braces and quotes
    s = s.replace(/[{}\[\]"]/g, '');
    // collapse whitespace
    s = s.replace(/\s{2,}/g, ' ').trim();
    // remove trailing separators
    s = s.replace(/[-,:;\s]+$/g, '').trim();
    // truncate to reasonable length
    if (s.length > 300) s = s.slice(0, 300) + '...';
    return s;
  } catch (e) {
    return String(input || '').slice(0, 300);
  }
}

// Helper function outside component to avoid recreation
function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.[0] || "";
  const last = lastName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "U";
}

// Stable empty array to prevent unnecessary re-renders from useQuery defaults
const EMPTY_ARRAY: any[] = [];

export default function Header({ onMobileToggle }: { onMobileToggle?: () => void }) {
  const { user } = useAuth();
  // Sidebar control: call hook at top-level to avoid calling hooks inside handlers
  const sidebar = useSidebar();
  const { toast } = useToast();
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);
  const [, setLocation] = useLegacyLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Dropdowns rely on Radix internal state to avoid redundant state loops

  // Fetch data to allow inline searching
  const userIsAuthenticated = !!user;

  const { data: allFacilities = EMPTY_ARRAY } = useQuery({
    queryKey: ['/api/facilities'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/facilities');
      return await res.json();
    },
    staleTime: 30_000,
    enabled: userIsAuthenticated,
  });

  const { data: allBookings = EMPTY_ARRAY } = useQuery({
    queryKey: ['/api/bookings/all'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/bookings/all');
      return await res.json();
    },
    staleTime: 30_000,
    enabled: userIsAuthenticated,
  });

  // Fetch bookings that belong to the current user (may include pending requests)
  const { data: userBookings = EMPTY_ARRAY } = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/bookings');
      return await res.json();
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const facilityResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return (allFacilities || []).filter((f: any) => String(f.name || '').toLowerCase().includes(term)).slice(0, 10);
  }, [allFacilities, searchTerm]);

  const bookingResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    // Merge user bookings (may include pending/own bookings) with the public/all bookings
    const merged = [...(userBookings || []), ...(allBookings || [])];
    // Only show booking results to admins or to bookings owned by the signed-in user
    const filtered = merged.filter((b: any) => {
      try {
        const email = String(b.userEmail || b.userEmailAddress || b.user?.email || '').toLowerCase();
        const matches = (email.includes(term) || String(b.purpose || '').toLowerCase().includes(term));
        if (!matches) return false;
        const isAdmin = !!(user && user.role === 'admin');
        const isOwner = user && (email === String(user.email || '').toLowerCase() || String(b.userId || '').toLowerCase() === String(user.id || '').toLowerCase());
        return isAdmin || isOwner;
      } catch (e) { return false; }
    });

    // Ensure the signed-in user's own bookings are visible: prepend owner bookings from userBookings
    const ownerBookings = (user && Array.isArray(userBookings)) ? (userBookings.filter((b: any) => {
      try {
        const email = String(b.userEmail || b.user?.email || '').toLowerCase();
        return email === String(user.email || '').toLowerCase() || String(b.userId || '').toLowerCase() === String(user.id || '').toLowerCase();
      } catch (e) { return false; }
    })) : [];

    const combined: any[] = [];
    const seen = new Set<string | number>();
    // prepend owner bookings (only include ones that match authorization)
    for (const b of ownerBookings) {
      if (!seen.has(b.id)) { combined.push(b); seen.add(b.id); }
    }
    for (const b of filtered) {
      if (!seen.has(b.id)) { combined.push(b); seen.add(b.id); }
    }

    return combined.slice(0, 10);
  }, [allBookings, userBookings, searchTerm, user]);

  // Close results when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!searchContainerRef.current) return;
      const el = searchContainerRef.current;
      if (!el.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  const [pendingMarkIds, setPendingMarkIds] = useState<Set<string>>(new Set());
  // Hidden alerts per-user (client-side only). Persist in localStorage so hides survive reload.
  const [hiddenAlertIds, setHiddenAlertIds] = useState<Set<string>>(new Set());
  const [hiddenAlertIdsVersion, setHiddenAlertIdsVersion] = useState(0);

  // Admin alerts (notifications)
  const isAdmin = !!(user && user.role === 'admin');

  const {
    adminAlerts,
    userAlerts,
    ownerAdminAlerts,
    isLoadingAdminAlerts: adminLoading,
    isLoadingUserAlerts: userLoading,
    markAsRead,
  } = useNotifications({ enabled: !!user, isAdmin });

  const handleMarkAlertRead = useCallback(async (alertId: string) => {
    setPendingMarkIds((prev) => {
      if (!alertId || prev.has(alertId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });

    try {
      await markAsRead(alertId);
    } catch (error) {
      console.error("Failed to mark notification as read", error);
      toast({
        title: "Mark as read failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingMarkIds((prev) => {
        if (!prev.has(alertId)) return prev;
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  }, [markAsRead, toast]);

  // For non-admin users, only show alerts explicitly targeted to them (userId === user.id).
  // Global alerts (userId == null) are admin-level and should not be shown in regular users' dropdown.
  const userAlertsFiltered = useMemo(() => {
    return Array.isArray(userAlerts) && user ? userAlerts.filter((a: any) => a.userId === user.id) : [];
  }, [userAlerts, user?.id]);
  
  // Compute visible alerts in a memo so it updates when ownerAdminAlerts resolves
  const alertsData = useMemo(() => {
    // admins see adminAlerts
    if (isAdmin) return adminAlerts || [];

    // non-admin users: start with their own filtered alerts
    const base = Array.isArray(userAlertsFiltered) ? userAlertsFiltered.slice() : [];
    try {
      const ownerEmail = String(user?.email || '').toLowerCase();
      if (ownerAdminAlerts && Array.isArray(ownerAdminAlerts) && ownerAdminAlerts.length > 0 && ownerEmail) {
        const relevant = ownerAdminAlerts.filter((a: any) => {
          try {
            const hay = String(a.message || a.details || a.title || '').toLowerCase();
            if (ownerEmail && hay.includes(ownerEmail)) return true;
            const parsed = parseEquipmentAlert(a);
            if (parsed && parsed.titleRequesterEmail && String(parsed.titleRequesterEmail).toLowerCase() === ownerEmail) return true;
          } catch (e) { }
          return false;
        });
        const existingIds = new Set(base.map((x: any) => x.id));
        for (const r of relevant) if (!existingIds.has(r.id)) base.push(r);
      }
    } catch (e) {
      // swallow parsing errors and continue
    }
    // Deduplicate by title + first message line to avoid showing repeated equipment alerts
    try {
      const groups: Record<string, any> = {};
      for (const a of base) {
        try {
          const firstLine = String(a.message || a.details || '').split('\n')[0].trim();
          const key = `${a.title || ''}||${firstLine}`;
          const existing = groups[key];
          if (!existing) groups[key] = a;
          else {
            // prefer newest
            const existingTime = new Date(existing.createdAt).getTime();
            const thisTime = new Date(a.createdAt).getTime();
            if (thisTime > existingTime) groups[key] = a;
          }
        } catch (e) {
          groups[`__${a.id}`] = groups[`__${a.id}`] || a;
        }
      }
      return Object.values(groups).sort((x: any, y: any) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
    } catch (e) {
      return base;
    }
  }, [isAdmin, adminAlerts, userAlertsFiltered, ownerAdminAlerts, user?.email]);

  // Helpful debug in development: log when ownerAdminAlerts or alertsData changes
  useEffect(() => {
    try {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('[Header] ownerAdminAlerts length =', (ownerAdminAlerts || []).length, 'alertsData length =', (alertsData || []).length);
      }
    } catch (e) { }
  }, [ownerAdminAlerts, alertsData]);
  const alertsLoading = isAdmin ? adminLoading : userLoading;
  
  // Unread count should reflect only visible (non-hidden) alerts in the bell
  const unreadCount = useMemo(() => {
    if (!Array.isArray(alertsData)) return 0;
    return alertsData.filter((a: any) => !a.isRead && !hiddenAlertIds.has(a.id)).length;
  }, [alertsData, hiddenAlertIdsVersion]);

  // Memoize filtered and sorted alerts to prevent re-renders in dropdown
  const visibleAlerts = useMemo(() => {
    if (!Array.isArray(alertsData)) return [];
    return alertsData
      .filter((a: any) => !hiddenAlertIds.has(a.id))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [alertsData, hiddenAlertIdsVersion]);

  // Load persisted hidden alert IDs for the current user from localStorage
  const hiddenStorageKey = useMemo(() => user ? `orbit:hiddenAlerts:${user.id}` : null, [user?.id]);

  useEffect(() => {
    if (!hiddenStorageKey) return;

    try {
      const raw = localStorage.getItem(hiddenStorageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const nextSet = new Set<string>();
      for (const value of parsed) {
        if (typeof value === "string") {
          nextSet.add(value);
        }
      }

      setHiddenAlertIds((prev) => {
        if (prev.size === nextSet.size) {
          let identical = true;
          for (const value of nextSet) {
            if (!prev.has(value)) {
              identical = false;
              break;
            }
          }
          if (identical) {
            return prev;
          }
        }
        setHiddenAlertIdsVersion(v => v + 1);
        return nextSet;
      });
    } catch (error) {
      // ignore malformed JSON entries
    }
  }, [hiddenStorageKey]);

  const persistHiddenIds = useCallback((nextSet: Set<string>) => {
    try {
      if (!hiddenStorageKey) return;
      localStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(nextSet)));
    } catch (e) { }
  }, [hiddenStorageKey]);

  const hideAlertInBell = useCallback((id: string) => {
    setHiddenAlertIds(prev => {
      const next = new Set(prev);
      next.add(id);
      persistHiddenIds(next);
      return next;
    });
    setHiddenAlertIdsVersion(v => v + 1);
  }, [persistHiddenIds]);

  // (Intentionally removed navigateToBookingNotifications helper.)
  // Header now routes to '/notifications' for user flows and delegates
  // rewriting/flagging to `App.tsx` to preserve host base paths.

  const handleLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
      toast({
        title: "Logout Error",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      // Redirect to login page
      setLocation("/login");
    }
  }, [toast, setLocation]);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm backdrop-blur-sm">
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Persistent sidebar toggle for easy navigation (always visible) */}
          <button
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
            onClick={() => {
              try {
                if (typeof onMobileToggle === 'function') {
                  onMobileToggle();
                  return;
                }
                sidebar?.toggleSidebar?.();
              } catch (e) { /* no-op if context unavailable */ }
            }}
            className="p-2 rounded-md text-gray-700 hover:bg-gray-100 sm:hidden"
          >
            {/* simple hamburger - 3 lines visually similar to Menu icon */}
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
          </button>
          <img
            src="/orbit-logo.png"
            alt="ORBIT Logo"
            className="h-10 w-auto object-contain"
          />
          <span className="font-bold text-xl sm:text-2xl tracking-wider bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent truncate">
            ORBIT
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Search bar removed */}
          <div style={{ display: 'none' }}>
            {user ? (
              <SearchBar
                className="w-full"
                placeholder="Search facilities, bookings..."
                onSearch={(term) => {
                  try {
                    setSearchTerm(term || '');
                    setShowSearchResults(!!term);
                  } catch (e) { }
                }}
                onFocus={() => {
                  // show results when the input is focused even if empty term exists
                  try { setShowSearchResults(true); } catch (e) { }
                }}
              />
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">Sign in to search</div>
            )}

            {/* Inline results box shown under the search bar when there's a term */}
            {showSearchResults && (
              <div className="absolute left-0 mt-2 w-full bg-white border border-gray-200 rounded shadow-lg z-50">
                <div className="p-3">
                  <div className="text-sm text-gray-600">Searching for “{searchTerm}”</div>
                  {/* small meta line like screenshot */}
                  <div className="text-xs text-gray-400 mt-1">Capacity: {facilityResults[0]?.capacity ?? '-'}</div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {/* Facilities results */}
                  <div className="p-3 border-t">
                    <div className="text-xs text-gray-500 font-medium mb-2">Facilities</div>
                    {(facilityResults.length === 0) ? (
                      <div className="text-sm text-gray-500 p-2">No matching facilities</div>
                    ) : (
                      <ul className="space-y-1">
                        {facilityResults.map((f: any) => (
                          <li
                            key={f.id}
                            className="py-2 px-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              // Navigate to Booking dashboard -> Available Rooms view
                              try {
                                // signal BookingDashboard to open the Available Rooms view once
                                try { sessionStorage.setItem('openAvailableRoomsOnce', '1'); } catch (e) { }
                                setLocation('/booking#available-rooms');
                                setShowSearchResults(false);
                                try { window.dispatchEvent(new CustomEvent('openAvailableRooms')); } catch (e) { }
                              } catch (e) {
                                try { sessionStorage.setItem('openAvailableRoomsOnce', '1'); } catch (er) { }
                                window.location.href = '/booking#available-rooms';
                                try { window.dispatchEvent(new CustomEvent('openAvailableRooms')); } catch (e) { }
                              }
                            }}
                          >
                            <div className="font-medium text-sm">{f.name}</div>
                            <div className="text-xs text-gray-400">Capacity: {f.capacity}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Bookings results */}
                  <div className="p-3 border-t">
                    <div className="text-xs text-gray-500 font-medium mb-2">Bookings</div>
                    {(bookingResults.length === 0) ? (
                      <div className="text-sm text-gray-500 p-2">No matching bookings</div>
                    ) : (
                      <ul className="space-y-1">
                        {bookingResults.map((b: any) => {
                          // determine ownership
                          const emailNorm = String(b.userEmail || b.user?.email || b.userEmailAddress || '').toLowerCase();
                          const isOwner = !!(user && (emailNorm === String(user.email || '').toLowerCase() || String(b.userId || '').toLowerCase() === String(user.id || '').toLowerCase()));

                          // compute a friendly facility label for owner bookings
                          let facilityLabel = '';
                          try {
                            if (Array.isArray(b.facilities) && b.facilities.length > 0) {
                              facilityLabel = b.facilities.map((f: any) => (f?.name || String(f))).join(', ');
                            } else if (b.facilityName) {
                              facilityLabel = String(b.facilityName);
                            } else if (b.facility && b.facility.name) {
                              facilityLabel = String(b.facility.name);
                            } else if (b.facilityId) {
                              const found = (allFacilities || []).find((ff: any) => String(ff.id) === String(b.facilityId));
                              if (found) facilityLabel = String(found.name || '');
                            }
                          } catch (e) {
                            facilityLabel = '';
                          }

                          const mainLabel = (isOwner && facilityLabel) ? facilityLabel : (b.userEmail || 'Unknown');

                          return (
                            <li
                              key={b.id}
                              className="py-1 px-3 hover:bg-gray-50 cursor-pointer"
                              onClick={() => {
                                try {
                                  // signal BookingDashboard to open the specific booking once
                                  try { sessionStorage.setItem('openBookingOnce', String(b.id)); } catch (e) { }
                                  setLocation('/booking');
                                  setShowSearchResults(false);
                                  try { window.dispatchEvent(new CustomEvent('openBooking')); } catch (e) { }
                                } catch (e) {
                                  try { sessionStorage.setItem('openBookingOnce', String(b.id)); } catch (er) { }
                                  window.location.href = '/booking';
                                  try { window.dispatchEvent(new CustomEvent('openBooking')); } catch (e) { }
                                }
                              }}
                            >
                              <div className="font-medium text-xs">{mainLabel}</div>
                              <div className="text-[11px] text-gray-600">{b.purpose}</div>
                              <div className="text-[11px] text-gray-500">{new Date(b.startTime).toLocaleString()}</div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DropdownMenu 
            key="notifications-dropdown" 
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <button
                className="relative p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-200"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium leading-none text-white bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-2">
              <DropdownMenuLabel className="font-medium p-2">Notifications</DropdownMenuLabel>
              {alertsLoading ? (
                <div className="p-3 space-y-2">
                  <SkeletonListItem />
                  <SkeletonListItem />
                  <SkeletonListItem />
                </div>
              ) : visibleAlerts.length > 0 ? (
                <div className="space-y-2">
                  {visibleAlerts.map((alert: any) => {
                      const parsed = parseEquipmentAlert(alert);

                      // Resolve actor email from message/details (preferred) and avoid showing raw UUIDs.
                      let actorEmail = '';
                      try {
                        const m = String(alert.message || alert.details || '').match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})/);
                        if (m && m[1]) actorEmail = m[1];
                      } catch (e) { /* ignore */ }
                      if (!actorEmail) actorEmail = user?.email || '';

                      // Don't display emails in owner-facing messages. Determine whether the alert
                      // targets the current user (owner) and prefer owner-focused phrasing.
                      const isOwnerAlert = !!(user && String(alert.userId || '').toLowerCase() === String(user.id || '').toLowerCase());

                      // Build structured display for equipment alerts (show itemized list with status)
                      // Determine a needs status: prepared, not_available, or pending
                      const titleStr = String(alert.title || '').toLowerCase();
                      const msgStr = String(alert.message || alert.details || '').toLowerCase();
                      const needsStatus: 'prepared' | 'not_available' | 'pending' = /prepared/.test(titleStr) || msgStr.includes('status: prepared')
                        ? 'prepared'
                        : (/not available/.test(titleStr) || msgStr.includes('status: not available') ? 'not_available' : 'pending');

                      // Compose a concise lead-in (who / what / when)
                      const when = alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '';
                      const leadIn = (() => {
                        // For admin users viewing UPDATES (not initial requests), show who updated what
                        if (isAdmin && titleStr.includes('equipment or needs request')) {
                          // This is an UPDATED notification (admin updated equipment status)
                          try {
                            const msgText = String(alert.message || '');
                            const updateMatch = msgText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})\s+updated\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})'s\s+equipment\s+request/i);
                            if (updateMatch && updateMatch[1] && updateMatch[2]) {
                              const adminEmail = updateMatch[1];
                              const userEmail = updateMatch[2];
                              if (parsed.itemsWithStatus && parsed.itemsWithStatus.length > 0) {
                                const allPrepared = parsed.itemsWithStatus.every((it: any) => it.status === 'prepared');
                                const allNotAvailable = parsed.itemsWithStatus.every((it: any) => it.status === 'not_available');
                                if (allPrepared) return `${adminEmail} marked ${userEmail}'s equipment as prepared`;
                                if (allNotAvailable) return `${adminEmail} marked ${userEmail}'s equipment as not available`;
                                return `${adminEmail} updated ${userEmail}'s equipment request`;
                              }
                              return `${adminEmail} updated ${userEmail}'s equipment request`;
                            }
                          } catch (e) { }
                        }

                        // For admin users viewing INITIAL requests, show the full message from backend
                        if (isAdmin && parsed.cleaned && parsed.cleaned.length > 0) {
                          // Admin view: show the detailed message with emails
                          return sanitizeDisplayText(parsed.cleaned, true).slice(0, 200);
                        }

                        // For equipment updates, extract the admin email from the message and show it
                        // Message format: "admin@email.com updated user@email.com's equipment request: ..."
                        // Check BOTH alert.message AND parsed.cleaned for the pattern
                        try {
                          const msgText = String(alert.message || '');
                          const cleanedText = String(parsed.cleaned || '');
                          const combinedText = msgText + ' ' + cleanedText;

                          const updateMatch = combinedText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})\s+updated\s+(?:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})'s\s+)?equipment\s+request/i);
                          if (updateMatch && updateMatch[1]) {
                            const adminEmail = updateMatch[1];
                            if (parsed.itemsWithStatus && parsed.itemsWithStatus.length > 0) {
                              const allPrepared = parsed.itemsWithStatus.every((it: any) => it.status === 'prepared');
                              const allNotAvailable = parsed.itemsWithStatus.every((it: any) => it.status === 'not_available');
                              if (allPrepared) return `${adminEmail} marked your equipment as prepared`;
                              if (allNotAvailable) return `${adminEmail} marked your equipment as not available`;
                              return `${adminEmail} updated your equipment request`;
                            }
                            return `${adminEmail} updated your equipment request`;
                          }
                        } catch (e) { }

                        // Prefer structured parsed results to avoid raw duplicated fragments.
                        // Use owner-focused phrasing when this alert is for the signed-in user.
                        // Check if this is an INITIAL submission vs an admin UPDATE
                        const msgLower = String(alert.message || '').toLowerCase();
                        const isInitialSubmission = msgLower.includes('submitted') && !msgLower.includes('updated');

                        const actorLabel = isOwnerAlert ? 'An admin' : 'An admin';
                        try {
                          // For INITIAL submissions (user created booking), show "You submitted..." message
                          if (isInitialSubmission && isOwnerAlert) {
                            // Extract facility and time from message
                            const facilityMatch = String(alert.message || '').match(/equipment request for\s+([^on]+?)\s+on\s+(.+?)\./i);
                            if (facilityMatch && facilityMatch[1] && facilityMatch[2]) {
                              return `You submitted an equipment request for ${facilityMatch[1].trim()} on ${facilityMatch[2].trim()}`;
                            }
                            return `You submitted an equipment request`;
                          }

                          // For UPDATES (admin marked equipment), show status
                          if (parsed.itemsWithStatus && parsed.itemsWithStatus.length > 0 && !isInitialSubmission) {
                            const allPrepared = parsed.itemsWithStatus.every((it: any) => it.status === 'prepared');
                            const allNotAvailable = parsed.itemsWithStatus.every((it: any) => it.status === 'not_available');
                            if (allPrepared) return `${actorLabel} marked requested equipment as prepared`;
                            if (allNotAvailable) return `${actorLabel} marked requested equipment as not available`;
                            // mixed status
                            return `${actorLabel} updated the equipment request`;
                          }

                          if (parsed.equipmentList && parsed.equipmentList.length > 0) {
                            if (isOwnerAlert && isInitialSubmission) return `You requested equipment: ${parsed.equipmentList.join(', ')}`;
                            if (isOwnerAlert) return `Your equipment request: ${parsed.equipmentList.join(', ')}`;
                            return `Equipment requested: ${parsed.equipmentList.join(', ')}`;
                          }
                        } catch (e) { }

                        // Fallbacks: prefer a short cleaned message, otherwise sanitized raw message slice
                        // For admin users, keep emails in the message so they can see who created bookings
                        if (parsed.cleaned && parsed.cleaned.length > 0) return sanitizeDisplayText(parsed.cleaned, isAdmin).slice(0, 200);
                        return sanitizeDisplayText(String(alert.message || alert.details || ''), isAdmin).slice(0, 200);
                      })();

                      // Build items display if we have parsed items or can infer them from bookings
                      let itemsDisplay: any = null;
                      try {
                        // If no structured per-item statuses, attempt to infer from related booking adminResponse
                        let inferredItemsWithStatus: typeof parsed.itemsWithStatus | null = null;
                        if ((!parsed.itemsWithStatus || parsed.itemsWithStatus.length === 0) && parsed.equipmentList && parsed.equipmentList.length > 0) {
                          try {
                            const mergedBookings = [...(userBookings || []), ...(allBookings || [])];
                            const matchEmail = parsed.titleRequesterEmail || actorEmail || '';
                            
                            // Also try to extract email from the alert message
                            const msgLower = String(alert.message || '').toLowerCase();
                            const emailMatch = alert.message?.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})/);
                            const extractedEmail = emailMatch ? emailMatch[1] : null;
                            
                            const candidates = mergedBookings.filter((b: any) => {
                              try {
                                const ownerEmail = String(b.userEmail || b.user?.email || '').toLowerCase();
                                const matchTarget = (matchEmail || extractedEmail || '').toLowerCase();
                                if (matchTarget && ownerEmail && ownerEmail === matchTarget) return true;
                                return false;
                              } catch (e) { return false; }
                            });

                            let chosen: any = null;
                            if (candidates.length === 1) chosen = candidates[0];
                            else if (candidates.length > 1) {
                              const msg = String(alert.message || alert.details || '');
                              const best = candidates.find((b: any) => {
                                try {
                                  const fac = allFacilities.find((f: any) => f.id === b.facilityId);
                                  if (!fac) return false;
                                  return msg.includes(String(fac.name || ''));
                                } catch (e) { return false; }
                              });
                              chosen = best || candidates[0];
                            }

                            if (chosen) {
                              const adminResp = String(chosen.adminResponse || '');
                              let structuredFromBooking: any = null;
                              try {
                                // Match the JSON block after "Needs: Status —"
                                const jsonMatch = adminResp.match(/[—\-]\s*(\{[\s\S]*\})\s*$/);
                                if (jsonMatch && jsonMatch[1]) {
                                  structuredFromBooking = JSON.parse(jsonMatch[1]);
                                }
                              } catch (e) { structuredFromBooking = null; }

                              if (structuredFromBooking && structuredFromBooking.items && typeof structuredFromBooking.items === 'object') {
                                // Map the keys from adminResponse to the parsed equipment list items
                                inferredItemsWithStatus = parsed.equipmentList.map((label: string) => {
                                  // Find matching key in structuredFromBooking.items (case-insensitive, handle underscores vs spaces)
                                  const matchingKey = Object.keys(structuredFromBooking.items).find((k) =>
                                    k.toLowerCase() === label.toLowerCase() ||
                                    k.replace(/_/g, ' ').toLowerCase() === label.replace(/_/g, ' ').toLowerCase()
                                  );
                                  
                                  if (matchingKey) {
                                    const rawVal = structuredFromBooking.items[matchingKey];
                                    const val = String(rawVal || '').toLowerCase();
                                    const status: 'prepared' | 'not_available' | 'pending' = 
                                      val === 'prepared' || val === 'true' || val === 'yes' ? 'prepared' : 
                                      (val === 'not available' || val === 'not_available' || val === 'false' || val === 'no' ? 'not_available' : 
                                      'pending');
                                    return { label, status };
                                  }
                                  return { label, status: 'pending' as const };
                                });
                              } else if (/Needs:\s*Prepared/i.test(adminResp)) {
                                inferredItemsWithStatus = parsed.equipmentList.map((lab: any) => ({ label: lab, status: 'prepared' }));
                              } else if (/Needs:\s*Not Available/i.test(adminResp) || /Not Available/i.test(adminResp)) {
                                inferredItemsWithStatus = parsed.equipmentList.map((lab: any) => ({ label: lab, status: 'not_available' }));
                              }
                            }
                          } catch (e) {
                            inferredItemsWithStatus = null;
                          }
                        }

                        const useItems = (parsed.itemsWithStatus && parsed.itemsWithStatus.length > 0) ? parsed.itemsWithStatus : (inferredItemsWithStatus && inferredItemsWithStatus.length > 0 ? inferredItemsWithStatus : null);
                        if (useItems && useItems.length > 0) {
                          const items = useItems.slice();
                          itemsDisplay = (
                            <ul className="mt-2 text-xs text-gray-700 space-y-1">
                              {items.map((it, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <label className="flex items-center gap-2">
                                    {it.status === 'not_available' ? (
                                      <div
                                        aria-hidden
                                        className="w-4 h-4 flex items-center justify-center text-red-600 font-bold bg-red-50 border border-red-200 rounded"
                                      >
                                        X
                                      </div>
                                    ) : it.status === 'prepared' ? (
                                      <span role="img" aria-label="prepared" className="w-4 h-4 flex items-center justify-center bg-green-50 text-green-600 rounded border border-green-200">
                                        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                                          <path d="M7.629 13.314l-3.247-3.247 1.06-1.06 2.187 2.187L14.56 4.66l1.06 1.06z" />
                                        </svg>
                                      </span>
                                    ) : (
                                      <input
                                        type="checkbox"
                                        disabled
                                        checked={false}
                                        className={`w-4 h-4 rounded focus:ring-0 accent-gray-400`}
                                        readOnly
                                        aria-checked={false}
                                      />
                                    )}
                                    <span className={`break-words ${it.status === 'not_available' ? 'text-red-700' : ''}`}>{it.label}</span>
                                  </label>
                                </li>
                              ))}
                              {parsed.othersText ? (
                                <li className="flex items-center gap-2">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      disabled
                                      checked={false}
                                      className="w-4 h-4 rounded focus:ring-0 accent-gray-400"
                                      readOnly
                                      aria-checked={false}
                                    />
                                    <span className="text-xs text-gray-600">Others: {parsed.othersText}</span>
                                  </label>
                                </li>
                              ) : null}
                            </ul>
                          );
                        } else if (parsed.equipmentList && parsed.equipmentList.length > 0) {
                          const items = parsed.equipmentList.slice();
                          // Attempt one more fallback: parse inline 'label: status' fragments directly from the alert text
                          let inlineItemsWithStatus: Array<{ label: string; status: 'prepared' | 'not_available' | 'pending' }> | null = null;
                          try {
                            const text = String(alert.message || alert.details || '');
                            const re = /([A-Za-z0-9 &]+?)\s*[:\-]\s*(prepared|not_available|not available|true|false|yes|no)\b/gi;
                            const found: Array<{ label: string, status: string }> = [];
                            let mm: RegExpExecArray | null;
                            while ((mm = re.exec(text)) !== null) {
                              const key = String(mm[1] || '').trim();
                              const val = String(mm[2] || '').trim().toLowerCase();
                              found.push({ label: key, status: val });
                            }
                            if (found.length > 0) {
                              // local token mapper (mirror of parseEquipmentAlert.mapToken)
                              const mapTokenLocal = (rawToken: string) => {
                                const raw = String(rawToken || '').replace(/_/g, ' ').trim();
                                const lower = raw.toLowerCase();
                                if (lower === 'others' || lower === 'other') return null;
                                if (lower === 'whiteboard') return 'Whiteboard & Markers';
                                if (lower === 'projector') return 'Projector';
                                if (lower === 'extension cord' || lower === 'extension_cord') return 'Extension Cord';
                                if (lower === 'hdmi') return 'HDMI Cable';
                                if (lower === 'extra chairs' || lower === 'extra_chairs') return 'Extra Chairs';
                                return raw.replace(/[.,;]+$/g, '').trim();
                              };
                              inlineItemsWithStatus = found.map(f => ({ label: mapTokenLocal(f.label) || f.label, status: (f.status === 'prepared' || f.status === 'true' || f.status === 'yes') ? 'prepared' : (f.status === 'not_available' || f.status === 'not available' || f.status === 'false' || f.status === 'no') ? 'not_available' : 'pending' }));
                            }
                          } catch (e) { inlineItemsWithStatus = null; }

                          if (inlineItemsWithStatus && inlineItemsWithStatus.length > 0) {
                            // render per-item statuses found inline. Also remove those fragments from
                            // the 'other details' text so they don't duplicate below.
                            const items2 = inlineItemsWithStatus.slice();
                            let displayOthers = parsed.othersText || '';
                            try {
                              // remove sequences like 'label: status' or '• label: status' from others text
                              displayOthers = String(displayOthers).replace(/\b[A-Za-z0-9 &]+?\s*[:\-]\s*(?:prepared|not_available|not available|true|false|yes|no)\b/gi, '').replace(/\u2022/g, '').replace(/\s{2,}/g, ' ').trim();
                              if (displayOthers === '') displayOthers = null as any;
                            } catch (e) { displayOthers = parsed.othersText || ''; }

                            itemsDisplay = (
                              <ul className="mt-2 text-xs text-gray-700 space-y-1">
                                {items2.map((it, idx) => (
                                  <li key={idx} className="flex items-center gap-2">
                                    <label className="flex items-center gap-2">
                                      {it.status === 'not_available' ? (
                                        <div aria-hidden className="w-4 h-4 flex items-center justify-center text-red-600 font-bold bg-red-50 border border-red-200 rounded">X</div>
                                      ) : it.status === 'prepared' ? (
                                        <span role="img" aria-label="prepared" className="w-4 h-4 flex items-center justify-center bg-green-50 text-green-600 rounded border border-green-200"><svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M7.629 13.314l-3.247-3.247 1.06-1.06 2.187 2.187L14.56 4.66l1.06 1.06z" /></svg></span>
                                      ) : (
                                        <input type="checkbox" disabled checked={false} className={`w-4 h-4 rounded focus:ring-0 accent-gray-400`} readOnly />
                                      )}
                                      <span className="break-words">{it.label}</span>
                                    </label>
                                  </li>
                                ))}
                                {displayOthers ? (<li className="flex items-center gap-2"><label className="flex items-center gap-2"><input type="checkbox" disabled checked={false} className="w-4 h-4 rounded focus:ring-0 accent-gray-400" readOnly aria-checked={false} /><span className="text-xs text-gray-600">Others: {displayOthers}</span></label></li>) : null}
                              </ul>
                            );
                          } else {
                            // If we couldn't infer individual statuses, fall back to a single status indicator
                            itemsDisplay = (
                              <ul className="mt-2 text-xs text-gray-700 space-y-1">
                                {items.map((it: string, idx: number) => (
                                  <li key={idx} className="flex items-center gap-2">
                                    <label className="flex items-center gap-2">
                                      {needsStatus === 'not_available' ? (
                                        <div aria-hidden className="w-4 h-4 flex items-center justify-center text-red-600 font-bold bg-red-50 border border-red-200 rounded">X</div>
                                      ) : needsStatus === 'prepared' ? (
                                        <span role="img" aria-label="prepared" className="w-4 h-4 flex items-center justify-center bg-green-50 text-green-600 rounded border border-green-200"><svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M7.629 13.314l-3.247-3.247 1.06-1.06 2.187 2.187L14.56 4.66l1.06 1.06z" /></svg></span>
                                      ) : (
                                        <input type="checkbox" disabled checked={false} className={`w-4 h-4 rounded focus:ring-0 accent-gray-400`} readOnly />
                                      )}
                                      <span className="break-words">{it}</span>
                                    </label>
                                  </li>
                                ))}
                                {parsed.othersText ? (<li className="flex items-center gap-2"><label className="flex items-center gap-2"><input type="checkbox" disabled checked={false} className="w-4 h-4 rounded focus:ring-0 accent-gray-400" readOnly aria-checked={false} /><span className="text-xs text-gray-600">Others: {parsed.othersText}</span></label></li>) : null}
                              </ul>
                            );
                          }
                        }
                      } catch (e) { itemsDisplay = null; }

                      // show 'READ' prefix when read
                      const readPrefix = alert.isRead ? 'READ: ' : '';
                      // Only append the createdAt timestamp for equipment-related alerts (where items are shown).
                      const shouldAppendWhen = Boolean((parsed.itemsWithStatus && parsed.itemsWithStatus.length > 0) || (parsed.equipmentList && parsed.equipmentList.length > 0));
                      // final smallMessage to display above the items list
                      // Keep emails in admin notifications
                      const fallbackShort = sanitizeDisplayText(parsed.cleaned || String(alert.message || alert.details || ''), isAdmin);
                      const smallMessage = `${readPrefix}${leadIn}${shouldAppendWhen && when ? ` at ${when}` : ''}${(!leadIn || leadIn.length === 0) ? ` ${fallbackShort}` : ''}`.trim();

                      // Keep timestamps in the notifications dropdown (they are appended inline above).

                      return (
                        <div key={alert.id} className={`p-2 rounded-md ${alert.isRead ? 'opacity-70' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 pr-4">
                              <div className="flex items-start justify-between">
                                <div className="font-medium text-sm text-gray-900">{parsed.visibleTitle}</div>
                                <div className="ml-4 flex items-center gap-2">
                                  {!alert.isRead && (
                                    <button
                                      onClick={() => { void handleMarkAlertRead(alert.id); }}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded disabled:opacity-60"
                                      disabled={pendingMarkIds.has(alert.id)}
                                    >
                                      {pendingMarkIds.has(alert.id) ? 'Marking...' : 'Mark Read'}
                                    </button>
                                  )}
                                  {/* Dismiss/hide from bell only (client-side). Does not delete or mark as read server-side. */}
                                  <button
                                    onClick={() => hideAlertInBell(alert.id)}
                                    aria-label="Dismiss notification"
                                    title="Remove from bell"
                                    className="inline-flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-800 rounded"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>

                              <div className="text-xs text-gray-600 mt-1 break-words">
                                <div>{smallMessage}</div>
                                {itemsDisplay}
                              </div>

                              {/* 'View other' removed by user request */}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {/* If some alerts are hidden, offer a small control to restore them */}
                  {/* hidden alerts are persisted per-user in localStorage; dismissed items are removed from bell UI */}

                  {alertsData.length > 5 && (
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          try {
                            if (isAdmin) {
                              // Admin: same behavior as before
                              setLocation('/admin/alerts');
                              return;
                            }

                            // Mirror admin flow: navigate to the canonical /notifications route
                            // and let App.tsx perform the base-preserving rewrite and set the
                            // one-time flag. This avoids duplicating rewrite logic here.
                            try { setLocation('/notifications'); return; } catch (_) { }
                            try { window.location.href = '/notifications'; return; } catch (_) { }
                          } catch (e) {
                            // Fallbacks
                            if (isAdmin) {
                              try { window.location.replace('/admin/alerts'); } catch (_) { setLocation('/admin/alerts'); }
                            } else {
                              try { window.location.replace('/booking#activity-logs:notifications'); } catch (_) { setLocation('/booking#activity-logs:notifications'); }
                            }
                          }
                        }}
                        className="w-full text-left text-sm text-pink-600 hover:text-pink-700 px-2 py-2 rounded"
                      >
                        View all notifications
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4">
                  <div className="text-sm text-gray-700">No notifications</div>
                  <div className="text-xs text-gray-500 mt-2">Check the Notification Logs for older items.</div>
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        try {
                          if (isAdmin) {
                            setLocation('/admin/alerts');
                            return;
                          }
                          // Navigate to Activity Logs → Notification Logs tab in booking dashboard
                          // Update hash first, then trigger hashchange event manually if already on the page
                          const newHash = '#activity-logs:notifications';
                          const currentPath = window.location.pathname;
                          
                          if (currentPath.includes('/booking')) {
                            // Already on booking page - update hash and dispatch event
                            window.location.hash = newHash;
                            window.dispatchEvent(new HashChangeEvent('hashchange'));
                          } else {
                            // Navigate to booking page with hash
                            try { setLocation('/booking' + newHash); return; } catch (_) { }
                            try { window.location.href = '/booking' + newHash; return; } catch (_) { }
                          }
                        } catch (e) {
                          // Fallback
                          if (isAdmin) {
                            try { window.location.replace('/admin/alerts'); } catch (_) { setLocation('/admin/alerts'); }
                          } else {
                            try { window.location.replace('/booking#activity-logs:notifications'); } catch (_) { setLocation('/booking#activity-logs:notifications'); }
                          }
                        }
                      }}
                      className="text-sm text-pink-600 hover:text-pink-700"
                    >
                      View Notification Logs
                    </button>
                  </div>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {user && (
            <DropdownMenu 
              key="user-profile-dropdown" 
              modal={false}
            >
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <Avatar className="h-9 w-9 border-2 border-gray-200">
                    {user.profileImageUrl ? (
                      <AvatarImage src={user.profileImageUrl} alt="User Avatar" />
                    ) : (
                      <AvatarFallback className="bg-pink-500 text-white font-semibold">
                        {getInitials(user.firstName, user.lastName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="text-sm text-gray-600">Signed in as</div>
                  <div className="font-semibold text-gray-900 truncate">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}
                  </div>
                  {user.firstName && user.lastName && (
                    <div className="text-sm text-gray-500 truncate">
                      {user.email}
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsProfileSidebarOpen(true)}
                  className="cursor-pointer p-3 rounded-lg hover:bg-pink-50 hover:text-pink-700"
                >
                  <User className="mr-3 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 p-3 rounded-lg"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <ProfileModal
        isOpen={isProfileSidebarOpen}
        onClose={() => setIsProfileSidebarOpen(false)}
      />
    </header>
  );
}