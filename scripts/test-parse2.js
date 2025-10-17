// Clean test script to reproduce parseEquipmentAlert logic
(function(){
  const raw = `jrabang_220000001540@uic.edu.ph requested equipment: whiteboard, projector, extension cord, hdmi, extra chairs, others, "projector":"prepared","extension cord":"prepared","hdmi":"not_available","extra chairs":"not_available","TEST":"prepared"} {"items":{"whiteboard":"prepared","projector":"prepared","extension cord":"prepared","hdmi":"not available","extra chairs":"not_not_available","TEST":"prepared"}} at 10/6/2025, 4:45:07 PM`;

  const mapToken = (rawToken) => {
    const raw = String(rawToken || '').replace(/_/g, ' ').trim();
    const lower = raw.toLowerCase();
    if (lower.includes('others')) return null;
    if (lower === 'whiteboard') return 'Whiteboard & Markers';
    if (lower === 'projector') return 'Projector';
    if (lower === 'extension cord' || lower === 'extension_cord') return 'Extension Cord';
    if (lower === 'hdmi') return 'HDMI Cable';
    if (lower === 'extra chairs' || lower === 'extra_chairs') return 'Extra Chairs';
    return raw.replace(/[.,;]+$/g, '').trim();
  };

  const extractJsonAroundKey = (text, key) => {
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
        if (depth === 0) return text.slice(open, i+1);
      }
    }
    return null;
  };

  let s = String(raw);
  let needsObj = null;
  const itemsBlock = extractJsonAroundKey(s, '"items"');
  if (itemsBlock) {
    try { needsObj = JSON.parse(itemsBlock); s = s.replace(itemsBlock, ''); } catch (e) { needsObj = null; }
  }
  if (!needsObj) {
    const jsonBlocks = Array.from(s.matchAll(/(\{[\s\S]*?\})/g)).map(m=>m[1]);
    for (const b of jsonBlocks) {
      try { const p = JSON.parse(b); if (p && (p.items || p.others || typeof p === 'object')) { needsObj = p; break; } } catch(e){}
    }
    if (jsonBlocks.length>0) for (const b of jsonBlocks) s = s.replace(b,'');
  }
  s = s.replace(/"[^\"]+"\s*:\s*"[^\"]+"\s*,?/g,'');
  // Remove stray brace sequences left from partial removals and leftover braces
  s = s.replace(/}\s*\{/g, ' ');
  s = s.replace(/[{}]/g, '');

  // Normalize a direct map shape into { items: map } to mirror Header.tsx behavior
  if (!needsObj) {
    // nothing
  } else if (!needsObj.items && typeof needsObj === 'object') {
    const maybeKeys = Object.keys(needsObj || {});
    const lookLikeItems = maybeKeys.length > 0 && maybeKeys.every(k => typeof needsObj[k] === 'string' || typeof needsObj[k] === 'boolean');
    if (lookLikeItems) {
      needsObj = { items: needsObj };
    }
  }

  console.log('needsObj:', needsObj);
  let itemsWithStatus = null;
  if (needsObj && needsObj.items && typeof needsObj.items === 'object' && !Array.isArray(needsObj.items)) {
    itemsWithStatus = Object.keys(needsObj.items).map(k => {
      const rawVal = needsObj.items[k];
      const val = String(rawVal||'').toLowerCase();
      const status = val==='prepared'||val==='true'||val==='yes' ? 'prepared' : (val==='not available'||val==='not_available'||val==='false'||val==='no' ? 'not_available' : 'pending');
      return { key: k, label: mapToken(k) || k, status };
    });
  }

  console.log('itemsWithStatus:', itemsWithStatus);
  console.log('cleaned:', s);
})();
