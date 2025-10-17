// Simulate merging admin alerts into a non-admin user's visible alerts
(function(){
  const ownerEmail = 'jrabang_220000001540@uic.edu.ph';

  // userAlertsFiltered: no personal notifications
  const userAlertsFiltered = [];

  // ownerAdminAlerts: sample admin alerts
  const ownerAdminAlerts = [
    {
      id: 'a1',
      title: 'Equipment update',
      message: `An admin updated items for ${ownerEmail}: {"items":{"whiteboard":"prepared","hdmi":"not available"}}`,
      details: '',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'a2',
      title: 'System notice',
      message: 'General notice to admins only',
      details: '',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'a3',
      title: `Booking — ${ownerEmail}`,
      message: 'Booking updated with equipment status',
      details: '{"items":{"projector":"prepared"}}',
      createdAt: new Date().toISOString(),
    }
  ];

  // Simulate parseEquipmentAlert minimal behavior to extract titleRequesterEmail
  function extractTitleRequesterEmail(alert) {
    try {
      const visibleTitle = String(alert.title || '');
      const m = visibleTitle.match(/[—–-]\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*$/);
      if (m && m[1]) return m[1];
    } catch (e) {}
    return null;
  }

  // Merge logic as in Header.tsx
  const alertsData = userAlertsFiltered.slice();
  const existingIds = new Set(alertsData.map(a => a.id));
  const owner = String(ownerEmail || '').toLowerCase();

  const relevant = ownerAdminAlerts.filter(a => {
    try {
      const hay = String(a.message || a.details || a.title || '').toLowerCase();
      if (owner && hay.includes(owner)) return true;
      const parsedEmail = extractTitleRequesterEmail(a);
      if (parsedEmail && String(parsedEmail).toLowerCase() === owner) return true;
    } catch (e) {}
    return false;
  });

  for (const r of relevant) if (!existingIds.has(r.id)) alertsData.push(r);

  console.log('userAlertsFiltered.length =', userAlertsFiltered.length);
  console.log('ownerAdminAlerts.length =', ownerAdminAlerts.length);
  console.log('relevant admin alerts found =', relevant.length);
  console.log('final alertsData ids =', alertsData.map(a => a.id));
})();
