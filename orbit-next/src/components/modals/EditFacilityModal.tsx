import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/ui";

interface Facility {
  id: number;
  name: string;
  description: string;
  capacity: number;
  isActive: boolean;
}

interface EditFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: Facility | null;
  onSave: () => void;
}

export default function EditFacilityModal({
  isOpen,
  onClose,
  facility,
  onSave,
}: EditFacilityModalProps) {
  const resetKey = useMemo(
    () => `${facility?.id ?? "unknown"}-${isOpen ? "open" : "closed"}`,
    [facility?.id, isOpen]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <EditFacilityModalContent
        key={resetKey}
        facility={facility}
        onClose={onClose}
        onSave={onSave}
      />
    </Dialog>
  );
}

interface EditFacilityModalContentProps {
  facility: Facility | null;
  onClose: () => void;
  onSave: () => void;
}

function EditFacilityModalContent({ facility, onClose, onSave }: EditFacilityModalContentProps) {
  const [name, setName] = useState(facility?.name ?? "");
  const [description, setDescription] = useState(facility?.description ?? "");
  const [capacity, setCapacity] = useState(facility?.capacity ?? 0);
  const [isActive, setIsActive] = useState(facility?.isActive ?? false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateFacilityMutation = useMutation({
    mutationFn: (data: Partial<Facility>) =>
      apiRequest("PUT", `/api/facilities/${facility?.id}`, data),
    onSuccess: () => {
      toast({
        title: "Facility Updated",
        description: "Facility details have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      onSave();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "An error occurred while updating the facility.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!name || !description || capacity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields and ensure capacity is greater than 0.",
        variant: "destructive",
      });
      return;
    }

    updateFacilityMutation.mutate({
      name,
      description,
      capacity,
      isActive,
    });
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Edit Facility</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">
            Description
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="capacity" className="text-right">
            Capacity
          </Label>
          <Input
            id="capacity"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="isActive" className="text-right">
            Active
          </Label>
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={setIsActive}
            className="col-span-3"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </DialogFooter>
    </DialogContent>
  );
}