/**
 * Text Sanitization Utilities
 * 
 * Functions for cleaning and sanitizing display text,
 * removing JSON blocks, emails, and duplicate content.
 */

/**
 * Aggressively sanitize a message string for display.
 * Removes embedded JSON blocks, escaped JSON, stray tokens, and duplicate lists.
 */
export function sanitizeDisplayText(input: string, keepEmails: boolean = false): string {
  try {
    let s = String(input || '');
    
    // Unescape common sequences
    s = s.replace(/\\n/g, '\n').replace(/\\"/g, '"');

    // Remove JSON blocks
    const jsonBlocks = Array.from((s.match(/(\{[\s\S]*?\})/g) || []));
    for (const b of jsonBlocks) {
      s = s.replace(b, '');
    }

    // Remove email addresses unless keepEmails is true
    if (!keepEmails) {
      s = s.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g, '').trim();
    }

    // Remove explicit "items" tokens
    s = s.replace(/"items"\s*:\s*/gi, '')
      .replace(/items"\s*:\s*/gi, '')
      .replace(/"items"/gi, '')
      .replace(/items":/gi, '');

    // Dedupe repeated inline dash lists
    s = s.replace(/(\s-\s[^\n]+)(?:\s-\s[^\n]+){1,}/g, (m) => {
      const parts = m.split(/\s-\s/).map(p => p.trim()).filter(Boolean);
      return ' ' + parts.join(', ');
    });

    // Remove duplicated adjacent sequences
    s = s.replace(/(\b[^\n]{5,200})\s+\1/g, '$1');

    // Strip leftover braces and quotes
    s = s.replace(/[{}\[\]"]/g, '');
    
    // Collapse whitespace
    s = s.replace(/\s{2,}/g, ' ').trim();
    
    // Remove trailing separators
    s = s.replace(/[-,:;\s]+$/g, '').trim();
    
    // Truncate to reasonable length
    if (s.length > 300) s = s.slice(0, 300) + '...';
    
    return s;
  } catch (e) {
    return String(input || '').slice(0, 300);
  }
}

/**
 * Get user initials from first and last name
 */
export function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.[0] || "";
  const last = lastName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "U";
}
