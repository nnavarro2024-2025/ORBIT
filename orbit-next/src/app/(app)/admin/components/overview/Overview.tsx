"use client";

import type {
  StatsCardsProps,
  QuickActionsBarProps,
  AnalyticsChartsProps,
  AvailabilityPreviewProps,
  BookingPreviewsProps,
  AlertsPreviewProps,
  ActivityPreviewProps,
} from "../admin/types";

// Export all components from their respective files
export {
  StatsCards,
  QuickActionsBar,
  AnalyticsCharts,
  AvailabilityPreview,
  BookingPreviews,
  AlertsPreview,
  ActivityPreview,
} from "./components";

// Re-export prop interfaces for external consumers
export type {
  StatsCardsProps,
  QuickActionsBarProps,
  AnalyticsChartsProps,
  AvailabilityPreviewProps,
  BookingPreviewsProps,
  AlertsPreviewProps,
  ActivityPreviewProps,
};
