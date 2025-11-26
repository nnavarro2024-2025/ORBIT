"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Clock, User, Activity, Info, Globe, Monitor } from "lucide-react";
import type { ActivityLog } from "@shared/schema";

interface ActivityLogModalProps {
  log: ActivityLog | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityLogModal({ log, isOpen, onClose }: ActivityLogModalProps) {
  if (!log) return null;

  // Helper to get action badge variant
  const getActionVariant = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes("delete") || lowerAction.includes("remove") || lowerAction.includes("ban")) {
      return "destructive";
    }
    if (lowerAction.includes("create") || lowerAction.includes("add") || lowerAction.includes("approve")) {
      return "default";
    }
    if (lowerAction.includes("update") || lowerAction.includes("edit") || lowerAction.includes("modify")) {
      return "secondary";
    }
    return "outline";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Activity className="h-5 w-5" />
            Activity Log Details
          </DialogTitle>
          <DialogDescription>
            Complete information about this activity
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Timestamp Section */}
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">Timestamp</h3>
              <p className="text-base">
                {format(new Date(log.createdAt), "PPpp")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(log.createdAt), "EEEE, MMMM d, yyyy 'at' h:mm:ss a")}
              </p>
            </div>
          </div>

          <Separator />

          {/* User Section */}
          {log.userId && (
            <>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2 mt-0.5">
                  <User className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">User</h3>
                  <p className="text-base font-mono break-all">{log.userId}</p>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Action Section */}
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2 mt-0.5">
              <Activity className="h-5 w-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Action / Event</h3>
              <Badge variant={getActionVariant(log.action)} className="text-sm px-3 py-1">
                {log.action}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Description Section */}
          {log.details && (
            <>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-green-500/10 p-2 mt-0.5">
                  <Info className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Description</h3>
                  <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                    {log.details}
                  </p>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Metadata Section */}
          {(log.ipAddress || log.userAgent) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Additional Metadata</h3>
              
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                {log.ipAddress && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">IP Address</p>
                      <p className="text-sm font-mono break-all">{log.ipAddress}</p>
                    </div>
                  </div>
                )}

                {log.userAgent && (
                  <div className="flex items-start gap-3">
                    <Monitor className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">User Agent</p>
                      <p className="text-xs font-mono break-all text-muted-foreground leading-relaxed">
                        {log.userAgent}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Log ID */}
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              Log ID: <span className="font-mono">{log.id}</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ActivityLogModal;
