import React from "react";
import { BarChart3, Download, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { QuickActionsBarProps } from "../../admin/types";

export function QuickActionsBar({ isExportingPdf, handleExportPdf, generateBookingWeeklyReport, facilityFilter, setFacilityFilter, facilitySort, setFacilitySort, facilityOptions }: QuickActionsBarProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[3fr_minmax(0,1fr)] gap-3 sm:gap-4 md:gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Quick Actions</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Generate reports and manage system</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button size="default" className="bg-pink-600 hover:bg-pink-700 text-white shadow-sm text-sm" onClick={() => generateBookingWeeklyReport?.()} aria-label="Generate weekly booking report">
              <BarChart3 className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button size="default" variant="outline" className="text-sm" onClick={handleExportPdf} disabled={isExportingPdf} aria-label="Export PDF overview">
              {isExportingPdf ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" />
                  Generating PDF…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export PDF
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Facility Filters</h3>
          <button onClick={() => { setFacilityFilter('all'); setFacilitySort('desc'); }} className="text-xs font-medium text-pink-600 hover:text-pink-700">Reset</button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">Filter</span>
            <Select value={facilityFilter} onValueChange={setFacilityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All facilities</SelectItem>
                {facilityOptions.map(option => (<SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">Sort</span>
            <button onClick={() => setFacilitySort(prev => (prev === 'asc' ? 'desc' : 'asc'))} className="inline-flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted" aria-label="Toggle facility sort order">
              <span>{facilitySort === 'asc' ? 'A → Z' : 'Z → A'}</span>
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
