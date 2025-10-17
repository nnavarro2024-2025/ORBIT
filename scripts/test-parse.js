// Minimal test script to exercise parseEquipmentAlertMessage logic (safe, standalone)
(function () {
  'use strict';

  const rawInput = `jrabang_220000001540@uic.edu.ph requested equipment: whiteboard, projector, extension cord, hdmi, extra chairs, others, "projector":"prepared","extension cord":"prepared","hdmi":"not_available","extra chairs":"not_available","TEST":"prepared"} {"items":{"whiteboard":"prepared","projector":"prepared","extension cord":"prepared","hdmi":"not available","extra chairs":"not available","TEST":"prepared"}} at 10/6/2025, 4:45:07 PM`;

  function parseEquipmentAlertMessage(rawMsg) {
    const raw = String(rawMsg || '');
    const visibleTitle = 'Equipment or Needs Request';

    // extract JSON blocks
    const jsonBlocks = Array.from(raw.matchAll(/(\{[\s\S]*?\})/g)).map(m => m[1]);
    let needsObj = null;
    for (const b of jsonBlocks) {
      try {
        const p = JSON.parse(b);
        if (p && (p.items || p.others || typeof p === 'object')) { needsObj = p; break; }
      } catch (e) {
        // ignore parse errors
      }
    }

    // simple equipment list extraction from free text
    const eqMatch = raw.match(/requested equipment:\s*([^,]+(,\s*[^,]+)*)/i);
    let equipmentList = [];
    if (eqMatch && eqMatch[1]) {
      equipmentList = eqMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    }

    return { visibleTitle, equipmentList, needsObj };
  }

  const result = parseEquipmentAlertMessage(rawInput);
  console.log(JSON.stringify(result, null, 2));
})();
