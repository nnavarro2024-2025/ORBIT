import React from "react";
import { AvailabilityGrid } from "@/components/common";
import type { AvailabilityPreviewProps } from "../../admin/types";

export function AvailabilityPreview({ unavailableDatesByFacility }: AvailabilityPreviewProps) {
  return (
    <div className="mb-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Availability Preview</h3>
            <p className="text-sm text-gray-600 mt-1">Quick view of today's scheduled slots</p>
          </div>
        </div>
        <div>
          <AvailabilityGrid unavailableDatesByFacility={unavailableDatesByFacility} />
        </div>
      </div>
    </div>
  );
}
