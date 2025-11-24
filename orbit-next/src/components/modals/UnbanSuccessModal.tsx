"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export type UnbanSuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
};

export function UnbanSuccessModal(props: UnbanSuccessModalProps) {
  const { isOpen, onClose, userEmail } = props;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">User Restored Successfully</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-gray-900">
              Access Restored!
            </h3>
            <p className="text-gray-600">
              User account has been successfully restored
            </p>
          </div>

          {/* User Email */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Restored Account:</p>
            <p className="font-medium text-gray-900 break-all">{userEmail}</p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">What's Next?</h4>
            <ul className="text-sm text-gray-700 space-y-1.5">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>User can now sign in to their account</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Full booking privileges have been restored</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>User will appear in the Booking Users tab</span>
              </li>
            </ul>
          </div>

          {/* Close Button */}
          <Button
            type="button"
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
