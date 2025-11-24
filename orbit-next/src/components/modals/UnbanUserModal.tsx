"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, UserCheck, X } from "lucide-react";

export type UnbanUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; email: string } | null;
  onUnbanUser: (userId: string) => void;
  isLoading?: boolean;
};

export function UnbanUserModal(props: UnbanUserModalProps) {
  const { isOpen, onClose, user, onUnbanUser, isLoading } = props;

  if (!user) return null;

  const handleUnban = () => {
    onUnbanUser(user.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserCheck className="h-5 w-5 text-green-600" />
            Restore User Access
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Confirm that you want to restore access for this user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                <UserCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-gray-900 text-sm mb-1">User Account</h4>
                <p className="text-sm text-gray-700 break-all">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Warning Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">What will happen:</h4>
            <ul className="text-sm text-gray-700 space-y-1.5">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span>User status will be changed to <strong>active</strong></span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span>User will be able to sign in immediately</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span>User can create new bookings</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span>Full system access will be restored</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUnban}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              {isLoading ? "Restoring..." : "Restore Access"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
