import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface UserData {
  id: string;
  email: string | null;
  role: string;
  status: string;
}

interface BanUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
  onBanUser: (userId: string, reason: string, duration: string, customDate?: string) => void;
}

export default function BanUserModal({
  isOpen, 
  onClose, 
  user, 
  onBanUser 
}: BanUserModalProps) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("permanent"); // e.g., "permanent", "7days", "30days"
  const [customDate, setCustomDate] = useState("");

  const handleSubmit = () => {
    if (user) {
      if (duration === "custom") {
        onBanUser(user.id, reason, duration, customDate);
      } else {
        onBanUser(user.id, reason, duration);
      }
      // Reset form
      setReason("");
      setDuration("permanent");
      setCustomDate("");
      onClose();
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setReason("");
    setDuration("permanent");
    setCustomDate("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ban User: {user?.email}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">
              Reason
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="col-span-3"
              placeholder="Enter reason for banning the user"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">
              Duration
            </Label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="col-span-3 p-2 border rounded-md"
            >
              <option value="permanent">Permanent</option>
              <option value="7days">7 Days</option>
              <option value="30days">30 Days</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>
          {duration === "custom" && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="custom-date" className="text-right">
                End Date
              </Label>
              <Input
                id="custom-date"
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="col-span-3"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Ban User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
