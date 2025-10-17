import 'dotenv/config';
import { storage } from '../server/storage';

function extractJsonObjectsSafe(text: string) {
  const blocks: any[] = [];
  try {
    const re = /\{[\s\S]*?\}/g;
    const matches = Array.from(String(text || '').matchAll(re)).map(m => m[0]);
    for (const block of matches) {
      try {
        const parsed = JSON.parse(block);
        blocks.push(parsed);
      } catch (e) {
        // attempt to sanitize by replacing single quotes and trailing commas
        try {
          const cleaned = block.replace(/([\n\r])/g, ' ').replace(/\s+/g, ' ').replace(/([\w\"]):\s*'([^']*)'/g, '"$1":"$2"').replace(/,\s*}/g, '}');
          const parsed2 = JSON.parse(cleaned);
          blocks.push(parsed2);
        } catch (e2) {
          // skip unparsable blocks but record raw
          blocks.push({ _raw: block });
        }
      }
    }
  } catch (e) {
    return [];
  }
  return blocks;
}

function humanSummaryFromStructured(note: any) {
  try {
    if (!note) return null;
    const parts: string[] = [];
    if (note.items) {
      if (Array.isArray(note.items)) parts.push(note.items.join(', '));
      else if (typeof note.items === 'object') parts.push(Object.entries(note.items).map(([k, v]) => `${k}: ${v}`).join('\n'));
    }
    if (note.others) parts.push(`Other details: ${note.others}`);
    return parts.join('\n\n');
  } catch (e) { return null; }
}

async function run() {
  try {
    console.log('Loading alerts...');
    const alerts = await storage.getSystemAlerts();
    console.log('Total alerts:', alerts.length);
    for (const a of alerts) {
      try {
        const objs = extractJsonObjectsSafe(a.message || '');
        if (!objs || objs.length === 0) continue;
        const humans = objs.map(o => humanSummaryFromStructured(o)).filter(Boolean);
        const msg = String(a.message || '').replace(/(\{[\s\S]*?\})/g, '').trim();
        const appended = '\n\n' + humans.join('\n\n');
        const structured = objs[0] || null;
        console.log('Alert', a.id, '-> structuredPresent=', Boolean(structured), 'humanSummary=', humans.slice(0,2));
      } catch (e) {
        console.error('Failed to process alert', a.id, e && e.stack ? e.stack : e);
      }
    }
    console.log('Done.');
  } catch (e) {
    console.error('Top-level error:', e && e.stack ? e.stack : e);
    process.exit(1);
  }
}

run();
