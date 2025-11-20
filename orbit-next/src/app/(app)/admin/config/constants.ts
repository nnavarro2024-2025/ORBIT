export const PIE_CHART_COLORS = ["#f472b6", "#fb7185", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#14b8a6"];
export const FACILITY_BAR_COLORS = { hours: "#10b981", bookings: "#6366f1" };
export const WEEKLY_LINE_COLORS = { total: "#6366f1", approved: "#10b981", pending: "#f59e0b" };
export const ENABLE_QUICK_ACTIONS = true;
export const DEBUG_MINIMAL_RENDER = false;
export const DEBUG_OVERVIEW_SECTIONS = {
  stats: true,
  quickActions: true,
  analytics: true,
  availability: true,
  scheduled: true,
  recent: true,
  alerts: true,
};
export const DEBUG_ANALYTICS_CHARTS = {
  department: true,
  facility: true,
  weekly: true,
};
export const ANY_ANALYTICS_ENABLED = Object.values(DEBUG_ANALYTICS_CHARTS).some(Boolean);
