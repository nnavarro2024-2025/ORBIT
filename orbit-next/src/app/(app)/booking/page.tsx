"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { BookingDashboardInner } from "./components/core/BookingDashboardInner";
import { SuspenseFallback } from "./components/layout/SuspenseFallback";

export default function BookingDashboard() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <BookingDashboardInner />
    </Suspense>
  );
}
