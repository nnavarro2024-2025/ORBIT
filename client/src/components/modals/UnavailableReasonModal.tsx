import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface UnavailableReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: any | null;
  onConfirm: (reason?: string) => void;
}

export default function UnavailableReasonModal({ isOpen, onClose, facility, onConfirm }: UnavailableReasonModalProps) {
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    if (facility) {
      const defaultMsg = facility.name
        ? `${facility.name} is temporarily unavailable due to maintenance. We apologize for the inconvenience.`
        : 'This room is temporarily unavailable. Please contact staff for more information.';
      setReason(defaultMsg);
    } else {
      setReason("");
    }
  }, [facility]);

  const handleConfirm = () => {
    const trimmed = reason?.trim();
    onConfirm(trimmed && trimmed.length > 0 ? trimmed : undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Provide a reason for making facility unavailable</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-12 items-start gap-4">
            <Label className="col-span-12">Reason (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason((e.target as HTMLTextAreaElement).value)} className="col-span-12" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
