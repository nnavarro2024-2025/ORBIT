"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, MapPin } from "lucide-react";

type TimeApiResponse = {
  epochMs: number;
  timezone: string;
  source: "google-date-header" | "server-fallback";
};

const TIMEZONE = "Asia/Manila";

export function PhilippineTimeCard() {
  const [timeOffsetMs, setTimeOffsetMs] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const [sourceLabel, setSourceLabel] = useState("Syncing time...");

  useEffect(() => {
    let mounted = true;

    const syncTime = async () => {
      try {
        const response = await fetch("/api/time/philippines", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch time: ${response.status}`);
        }

        const payload = (await response.json()) as TimeApiResponse;
        const serverEpochMs = Number(payload.epochMs);

        if (mounted && Number.isFinite(serverEpochMs)) {
          setTimeOffsetMs(serverEpochMs - Date.now());
          setSourceLabel(
            payload.source === "google-date-header"
              ? "Source: Google network time"
              : "Source: Server time fallback",
          );
        }
      } catch (_) {
        if (mounted) {
          setSourceLabel("Source: Local clock fallback");
          setTimeOffsetMs(0);
        }
      }
    };

    syncTime();
    const syncIntervalId = window.setInterval(syncTime, 60_000);

    return () => {
      mounted = false;
      window.clearInterval(syncIntervalId);
    };
  }, []);

  useEffect(() => {
    const tickId = window.setInterval(() => {
      setTick(Date.now());
    }, 1_000);

    return () => window.clearInterval(tickId);
  }, []);

  const nowMs = tick + timeOffsetMs;
  const manilaDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: TIMEZONE,
      }).format(nowMs),
    [nowMs],
  );

  const manilaTime = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: TIMEZONE,
      }).format(nowMs),
    [nowMs],
  );

  return (
    <div className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 shadow-sm p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Official Dashboard Time</p>
          <p className="mt-1 text-lg sm:text-xl font-bold text-gray-900">{manilaTime}</p>
          <p className="text-sm text-gray-600">{manilaDate}</p>
        </div>

        <div className="flex flex-col gap-1 text-xs sm:text-sm text-gray-600">
          <div className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-600" />
            Philippines ({TIMEZONE})
          </div>
          <div className="inline-flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-emerald-600" />
            {sourceLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
