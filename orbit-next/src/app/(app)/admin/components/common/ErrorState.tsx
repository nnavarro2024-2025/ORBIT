"use client";

import { TriangleAlert } from "lucide-react";
import { User } from "@shared/schema";

type ErrorState = {
  bookings: boolean;
  alerts: boolean;
  activities: boolean;
  allBookings: boolean;
  usersData: boolean;
  facilities: boolean;
};

type Props = {
  errorState: ErrorState;
  user?: User;
};

export function ErrorState({ errorState, user }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-red-500">
      <TriangleAlert className="h-8 w-8 mb-2" />
      <h2 className="text-xl font-semibold">
        An error occurred while fetching data.
      </h2>
      <p className="text-sm text-center mt-2">
        **Your Current Role:** `{user?.role || "N/A"}`
      </p>
      <p className="text-sm text-center">
        The dashboard routes require the `admin` role. Please check your
        backend server logs or your Supabase user configuration.
      </p>
      <ul className="text-xs list-disc list-inside mt-4">
        {Object.entries(errorState)
          .filter(([_, isErr]) => isErr)
          .map(([key]) => (
            <li key={key}>Failed to load {key} data.</li>
          ))}
      </ul>
    </div>
  );
}
