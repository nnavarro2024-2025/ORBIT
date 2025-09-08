import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Clock, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const extensionSchema = z.object({
  requestedMinutes: z.string().min(1, "Please select extension duration"),
  reason: z.string().min(1, "Please explain why you need more time"),
});

interface TimeExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

export default function TimeExtensionModal({ isOpen, onClose, sessionId }: TimeExtensionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof extensionSchema>>({
    resolver: zodResolver(extensionSchema),
    defaultValues: {
      requestedMinutes: "",
      reason: "",
    },
  });

  const createExtensionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof extensionSchema>) => {
      if (!sessionId) {
        throw new Error("No active session found");
      }
      
      const extensionData = {
        sessionId,
        requestedMinutes: parseInt(data.requestedMinutes),
        reason: data.reason,
      };
      
      const response = await apiRequest("POST", "/api/orz/time-extension", extensionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orz/sessions/active"] });
      toast({
        title: "Extension Requested",
        description: "Your time extension request has been submitted for admin approval.",
        variant: "default",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof extensionSchema>) => {
    createExtensionMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="text-center mb-6">
            <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
            <DialogTitle className="text-xl font-semibold">Request Time Extension</DialogTitle>
            <p className="text-muted-foreground mt-2">Your current session will expire soon</p>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="requestedMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extension Duration</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Extension</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please explain why you need more time"
                      className="h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center space-x-4 pt-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={createExtensionMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {createExtensionMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
