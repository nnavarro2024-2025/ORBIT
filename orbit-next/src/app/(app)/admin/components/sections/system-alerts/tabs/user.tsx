import React, { useState } from 'react';
type SystemAlert = any;
import { Button } from '../../../../../../../components/ui/button';
import { Users, UserCheck, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../../../../components/ui/dialog';
import { Badge } from '../../../../../../../components/ui/badge';
import { Separator } from '../../../../../../../components/ui/separator';

export const SYSTEM_ALERTS_TAB_USERS = 'users' as const;

const ALERTS_PER_PAGE = 10;

const getEquipmentStatusColor = (status: string) => {
  const normalized = status.toLowerCase().replace(/_/g, " ");
  if (normalized === "prepared" || normalized === "available") {
    return "bg-green-100 text-green-800";
  }
  if (normalized === "not available") {
    return "bg-red-100 text-red-800";
  }
  if (normalized === "requested" || normalized === "pending") {
    return "bg-yellow-100 text-yellow-800";
  }
  return "bg-gray-100 text-gray-800";
};

type Setter<T> = (value: T | ((prev: T) => T)) => void;

export type UserTabProps = {
  userAlertsSorted: SystemAlert[];
  userAlertsPage: number;
  onUserAlertsPageChange: Setter<number>;
  formatDateTime: (value: any) => string;
  formatAlertMessage: (message: string | null) => string;
  safeJsonParse: (input: unknown) => any;
  onMarkAlertRead: (alert: SystemAlert) => void;
  isMarkingAlert?: boolean;
  normalizedSearch: string;
  userAlertsCount: number;
};

export function UserTab({
  userAlertsSorted,
  userAlertsPage,
  onUserAlertsPageChange,
  formatDateTime,
  formatAlertMessage,
  safeJsonParse,
  onMarkAlertRead,
  isMarkingAlert = false,
  normalizedSearch,
  userAlertsCount,
}: UserTabProps) {
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

  const userTotalPages = Math.ceil(userAlertsSorted.length / ALERTS_PER_PAGE) || 1;
  const userStartIndex = userAlertsPage * ALERTS_PER_PAGE;
  const userPageItems = userAlertsSorted.slice(userStartIndex, userStartIndex + ALERTS_PER_PAGE);

  const handleMarkAlertRead = (alert: SystemAlert) => {
    if (!alert.isRead) {
      onMarkAlertRead(alert);
    }
  };

  const renderEquipmentChips = (equipment: Record<string, any> | null | undefined) => {
    if (!equipment || Object.keys(equipment).length === 0) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Object.entries(equipment).map(([key, value]) => {
          if (key === 'others' && value) {
            return (
              <span
                key={key}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
              >
                Other: {value}
              </span>
            );
          }
          const displayKey = key
            .split("_")
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(" ");
          return (
            <span
              key={key}
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEquipmentStatusColor(String(value))}`}
            >
              {displayKey}: {String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase()}
            </span>
          );
        })}
      </div>
    );
  };

  const parseEquipmentFromMessage = (message: string) => {
    const equipmentMarker = message.indexOf("[Equipment:");
    if (equipmentMarker === -1) {
      return { baseMessage: message, equipment: null };
    }

    try {
      const baseMessage = message.substring(0, equipmentMarker).trim();
      const jsonStart = message.indexOf("{", equipmentMarker);
      if (jsonStart === -1) {
        return { baseMessage, equipment: null };
      }

      let depth = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < message.length; i += 1) {
        if (message[i] === "{") depth += 1;
        if (message[i] === "}") {
          depth -= 1;
          if (depth === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }

      if (jsonEnd !== -1) {
        const jsonStr = message.substring(jsonStart, jsonEnd);
        const equipmentData = safeJsonParse(jsonStr);
        
        // Handle new format with items array
        if (equipmentData?.items && Array.isArray(equipmentData.items)) {
          const equipmentObj: Record<string, string> = {};
          equipmentData.items.forEach((item: any) => {
            if (typeof item === 'string') {
              equipmentObj[item.replace(/\s+/g, '_').toLowerCase()] = 'requested';
            } else if (item?.name) {
              equipmentObj[item.name.replace(/\s+/g, '_').toLowerCase()] = item.status || 'requested';
            }
          });
          if (equipmentData.others) {
            equipmentObj['others'] = equipmentData.others;
          }
          return { baseMessage, equipment: equipmentObj };
        }
        
        // Handle legacy format
        return { baseMessage, equipment: equipmentData || {} };
      }

      return { baseMessage, equipment: null };
    } catch (_error) {
      const baseMessage = message.substring(0, equipmentMarker).trim();
      return { baseMessage, equipment: null };
    }
  };

  const renderUserAlert = (alert: SystemAlert) => {
    const { baseMessage, equipment } = parseEquipmentFromMessage(String(alert.message || ""));
    const formattedMessage = formatAlertMessage(baseMessage);
    const isEquipmentRelated = /equipment|needs/i.test(
      `${alert.title || ""} ${alert.message || ""}`,
    );
    const formattedMessageWithTime =
      isEquipmentRelated && !equipment
        ? `${formattedMessage} at ${formatDateTime(alert.createdAt)}`
        : formattedMessage;

    const isUnbanActivity =
      (alert.title || "").toLowerCase().includes("unbanned") ||
      (alert.message || "").toLowerCase().includes("unbanned");
    const isBanActivity =
      (alert.title || "").toLowerCase().includes("banned") && !isUnbanActivity;

    return (
      <div
        key={alert.id}
        onClick={() => handleAlertClick(alert)}
        className={`bg-white rounded-lg p-3 border transition-colors duration-200 cursor-pointer ${
          isBanActivity
            ? "border-red-200 hover:border-red-300 hover:shadow-sm"
            : isUnbanActivity
            ? "border-green-200 hover:border-green-300 hover:shadow-sm"
            : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
        } ${alert.isRead ? "opacity-60" : ""}`}
      >
        <div className="md:hidden space-y-2">
          <div className="flex items-start gap-2">
            <div
              className={`p-1.5 rounded-lg flex-shrink-0 ${
                isBanActivity ? "bg-red-100" : isUnbanActivity ? "bg-green-100" : "bg-blue-100"
              }`}
            >
              {isBanActivity ? (
                <UserX className="h-5 w-5 text-red-600" />
              ) : isUnbanActivity ? (
                <UserCheck className="h-5 w-5 text-green-600" />
              ) : (
                <Users className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 break-words">{alert.title}</p>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-2">{formatDateTime(alert.createdAt)}</div>
            <p className="text-xs text-gray-600 break-words whitespace-pre-wrap">
              {formattedMessageWithTime}
            </p>
            {renderEquipmentChips(equipment)}

            {(isUnbanActivity || isBanActivity) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {isUnbanActivity && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <UserCheck className="h-3 w-3" />
                    User Restored
                  </div>
                )}
                {isBanActivity && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <UserX className="h-3 w-3" />
                    User Suspended
                  </div>
                )}
              </div>
            )}

            <div className="mt-2">
              {alert.isRead ? (
                <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  Read
                </span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="w-full text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAlertRead(alert);
                  }}
                  disabled={isMarkingAlert}
                >
                  Mark as Read
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-start gap-2">
          <div
            className={`p-1.5 rounded-lg flex-shrink-0 ${
              isBanActivity ? "bg-red-100" : isUnbanActivity ? "bg-green-100" : "bg-blue-100"
            }`}
          >
            {isBanActivity ? (
              <UserX className="h-5 w-5 text-red-600" />
            ) : isUnbanActivity ? (
              <UserCheck className="h-5 w-5 text-green-600" />
            ) : (
              <Users className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex items-start justify-between">
              <div className="pr-4 min-w-0 flex-1">
                <p className="font-medium text-sm text-gray-900">{alert.title}</p>
                <p className="text-xs text-gray-600 mt-1 break-words break-all whitespace-pre-wrap max-w-full">
                  {formattedMessageWithTime}
                </p>
                {renderEquipmentChips(equipment)}
                {(isUnbanActivity || isBanActivity) && (
                  <div className="mt-2 flex flex-col md:flex-row gap-2 items-start md:items-center">
                    {isUnbanActivity && (
                      <div className="w-full md:w-auto inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <UserCheck className="h-3 w-3" />
                        User Restored
                      </div>
                    )}
                    {isBanActivity && (
                      <div className="w-full md:w-auto inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <UserX className="h-3 w-3" />
                        User Suspended
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="w-44 text-right text-xs text-gray-500 flex flex-col items-end gap-1">
                <div className="w-full">{formatDateTime(alert.createdAt)}</div>
                {alert.isRead ? (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    Read
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAlertRead(alert);
                    }}
                    disabled={isMarkingAlert}
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">User Management Activities</h3>
        <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
          {normalizedSearch ? `${userAlertsSorted.length}/${userAlertsCount}` : userAlertsCount} activities
        </span>
      </div>

      <div className="space-y-3">
        {userAlertsSorted.length > 0 && userPageItems.map(renderUserAlert)}
      </div>

      {userAlertsSorted.length === 0 && (
        <div className="text-center py-8">
          <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm">No user management activities</p>
        </div>
      )}

      {userAlertsSorted.length > ALERTS_PER_PAGE && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            Showing {userStartIndex + 1} to {Math.min(userStartIndex + ALERTS_PER_PAGE, userAlertsSorted.length)} of {userAlertsSorted.length} activities
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => onUserAlertsPageChange(Math.max(userAlertsPage - 1, 0))}
              disabled={userAlertsPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 text-xs sm:text-sm font-medium whitespace-nowrap">
              {userAlertsPage + 1} of {userTotalPages}
            </span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() =>
                onUserAlertsPageChange(
                  userAlertsSorted.length > (userAlertsPage + 1) * ALERTS_PER_PAGE
                    ? userAlertsPage + 1
                    : userAlertsPage,
                )
              }
              disabled={userAlertsSorted.length <= (userAlertsPage + 1) * ALERTS_PER_PAGE}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Management Activity Details</DialogTitle>
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
                  {formatAlertMessage(String(selectedAlert.message || ''))}
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                <Badge className={selectedAlert.isRead ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-800'}>
                  {selectedAlert.isRead ? 'Read' : 'Unread'}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
