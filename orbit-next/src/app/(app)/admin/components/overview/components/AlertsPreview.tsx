import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SystemAlert } from "@shared/schema";
import type { AlertsPreviewProps } from "../../admin/types";
import { EmptyState } from "./EmptyState";
import { getEquipmentStatusColor, parseEquipmentFromAlertMessage } from "./helpers";

export function AlertsPreview({ alerts, alertsPreviewTab, setAlertsPreviewTab, formatDateTime, formatAlertMessage, safeJsonParse, onNavigateToSecurity }: AlertsPreviewProps) {
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAlertClick = (alert: SystemAlert) => {
    setSelectedAlert(alert);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAlert(null);
  };

  const bookingAlerts = alerts?.filter(a => {
    if (a.type === 'booking') return true;
    const t = (a.title || '').toLowerCase();
    const m = (a.message || '').toLowerCase();
    return t.includes('booking') || m.includes('booking');
  }).slice(0, 5) || [];

  const userAlerts = alerts?.filter(a => {
    const t = (a.title || '').toLowerCase();
    const m = (a.message || '').toLowerCase();
    return t.includes('user') || m.includes('banned') || m.includes('unbanned') || t.includes('suspension') || t.includes('equipment') || t.includes('needs') || m.includes('equipment') || m.includes('needs');
  }).slice(0, 5) || [];

  const renderAlert = (alert: SystemAlert) => {
    const { baseMessage, equipment } = parseEquipmentFromAlertMessage(alert.message);
    const fm = formatAlertMessage(baseMessage);
    const isEquipmentRelated = /equipment|needs/i.test(String(alert.title || '') + ' ' + String(alert.message || ''));
    const hasDateLike = /\d{1,2}\/\d{1,2}\/\d{4}/.test(fm) || /\bfrom\b[\s\S]*\bto\b/i.test(fm) || /\bat\s*\d{1,2}:\d{2}/i.test(fm);
    const shouldAppendTime = isEquipmentRelated && !hasDateLike && !equipment;
    const fmWithTime = shouldAppendTime ? `${fm} at ${formatDateTime(alert.createdAt)}` : fm;

    return (
      <div key={alert.id} onClick={() => handleAlertClick(alert)} className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer">
        <div className="flex flex-col gap-2 md:hidden">
          <h4 className="font-medium text-gray-900 text-sm break-words">{alert.title}</h4>
          <div className="text-xs text-gray-500">{formatDateTime(alert.createdAt)}</div>
          <p className="text-xs text-gray-600 break-words">{fmWithTime}</p>
          {equipment && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(equipment).map(([key, value]: [string, any]) => {
                const displayKey = key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                return (
                  <span key={key} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEquipmentStatusColor(String(value))}`}>
                    {displayKey}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden md:flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <h4 className="font-medium text-gray-900 text-sm">{alert.title}</h4>
            <p className="text-xs text-gray-600 break-words">{fmWithTime}</p>
            {equipment && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(equipment).map(([key, value]: [string, any]) => {
                  const displayKey = key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  return (
                    <span key={key} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEquipmentStatusColor(String(value))}`}>
                      {displayKey}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">{formatDateTime(alert.createdAt)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Recent System Alerts</h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Booking and user management alerts</p>
        </div>
        <div className="bg-pink-100 text-pink-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center self-start">{alerts?.length || 0} alerts</div>
      </div>

      <div className="mb-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button onClick={() => setAlertsPreviewTab('booking')} className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium ${alertsPreviewTab === 'booking' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Booking Alerts</button>
          <button onClick={() => setAlertsPreviewTab('users')} className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium ${alertsPreviewTab === 'users' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'}`}>User Management Alerts</button>
        </div>
      </div>

      <div>
        {alertsPreviewTab === 'booking' ? (
          <div className="space-y-2">{(bookingAlerts.length > 0) ? bookingAlerts.map(renderAlert) : (<EmptyState Icon={AlertCircle} message="No booking alerts" />)}</div>
        ) : (
          <div className="space-y-2">{(userAlerts.length > 0) ? userAlerts.map(renderAlert) : (<EmptyState Icon={AlertCircle} message="No user management alerts" />)}</div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200 flex justify-end">
        <button onClick={() => onNavigateToSecurity(alertsPreviewTab)} className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors duration-150">View All</button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Alert Details</DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Title</h4>
                <p className="text-base font-semibold text-gray-900">{selectedAlert.title}</p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Severity</h4>
                <Badge
                  className={`${
                    selectedAlert.severity === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : selectedAlert.severity === 'warning'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {selectedAlert.severity}
                </Badge>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Timestamp</h4>
                <p className="text-sm text-gray-900">{formatDateTime(selectedAlert.createdAt)}</p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Message</h4>
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                  {formatAlertMessage(selectedAlert.message)}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
