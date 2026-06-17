"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  Wrench,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  User,
  Phone,
  Trash2,
} from "lucide-react";
import { type Slot, type Service } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useBlockSlot, useForceCancelSlot, useUpdateSlot, useDeleteSlot } from "@/hooks/useSlots";

interface MasterSlotControllerProps {
  slot: Slot;
  service?: Service;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function MasterSlotController({
  slot,
  service,
  isOpen,
  onOpenChange,
  onSuccess,
}: MasterSlotControllerProps) {
  const [action, setAction] = useState<"block" | "cancel" | "update" | "delete">("block");
  const [blockReason, setBlockReason] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [newStatus, setNewStatus] = useState<Slot['status']>(slot.status);
  const [error, setError] = useState<string | null>(null);

  const blockSlotMutation = useBlockSlot();
  const cancelSlotMutation = useForceCancelSlot();
  const updateSlotMutation = useUpdateSlot();
  const deleteSlotMutation = useDeleteSlot();

  const isPending = blockSlotMutation.isPending || cancelSlotMutation.isPending || updateSlotMutation.isPending || deleteSlotMutation.isPending;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
  };

  const getStatusColor = (status: Slot['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'booked':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'blocked':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: Slot['status']) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4" />;
      case 'booked':
        return <Clock className="h-4 w-4" />;
      case 'blocked':
        return <Wrench className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: Slot['status']) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'booked':
        return 'Occupied';
      case 'blocked':
        return 'Blocked';
      default:
        return 'Unknown';
    }
  };

  const calculateTimeRemaining = () => {
    if (slot.status !== 'booked') return null;

    const endTime = new Date(slot.end_time);
    const now = new Date();
    const diffMs = endTime.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    if (diffHours > 0) {
      return `${diffHours}h ${remainingMins}m`;
    }
    return `${diffMins} minutes`;
  };

  const handleSubmit = async () => {
    setError(null);

    try {
      if (action === "block") {
        await blockSlotMutation.mutateAsync({ id: slot.id, reason: blockReason });
      } else if (action === "cancel") {
        await cancelSlotMutation.mutateAsync({ id: slot.id, note: cancelNote });
      } else if (action === "update") {
        await updateSlotMutation.mutateAsync({
          id: slot.id,
          updates: { status: newStatus }
        });
      } else if (action === "delete") {
        await deleteSlotMutation.mutateAsync(slot.id);
      }

      onSuccess();
      onOpenChange(false);
      // Reset form
      setBlockReason("");
      setCancelNote("");
      setNewStatus(slot.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    }
  };

  const timeRemaining = calculateTimeRemaining();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Master Slot Controller</DialogTitle>
          <DialogDescription>
            Advanced control panel for managing individual service slots
          </DialogDescription>
        </DialogHeader>

        {/* Slot Overview */}
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Slot Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Slot ID:</span>
                    <code className="text-sm font-mono">{slot.id.slice(0, 8)}...</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Service:</span>
                    <span className="font-medium">{service?.name || "Unknown Service"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <Badge className="capitalize">
                      {service?.type || "unknown"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Time Slot</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(slot.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</span>
                  </div>
                  {timeRemaining && (
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg",
                      timeRemaining === 'Expired'
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                    )}>
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">{timeRemaining} remaining</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Current Status</h4>
                <div className="flex items-center gap-3 p-4 rounded-lg border">
                  <div className={cn(
                    "h-3 w-3 rounded-full",
                    slot.status === 'available' && "bg-green-500",
                    slot.status === 'booked' && "bg-red-500",
                    slot.status === 'blocked' && "bg-yellow-500"
                  )} />
                  <div className="flex-1">
                    <div className="font-medium">{getStatusText(slot.status)}</div>
                    <div className="text-sm text-muted-foreground">
                      Last updated: {new Date(slot.updated_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <Badge className={cn("gap-1", getStatusColor(slot.status))}>
                    {getStatusIcon(slot.status)}
                    {getStatusText(slot.status)}
                  </Badge>
                </div>
              </div>

              {service && (
                <div>
                  <h4 className="font-semibold mb-2">Pricing</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Base Price:
                      </span>
                      <span className="font-medium">₹{service.base_price}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Peak Price:
                      </span>
                      <span className="font-medium">₹{service.peak_price}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Selection */}
          <div>
            <h4 className="font-semibold mb-4">Control Actions</h4>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="action">Select Action</Label>
                <Select value={action} onValueChange={(value: "block" | "cancel" | "update" | "delete") => setAction(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        <span>Block/Kill Slot</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="cancel">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        <span>Force Cancel Booking</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="update">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Update Status</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="delete">
                      <div className="flex items-center gap-2 text-red-600">
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Slot Completely</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Block Action */}
              {action === "block" && (
                <div className="space-y-3 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                    <h5 className="font-semibold">Block/Kill This Slot</h5>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mark this slot as unavailable for maintenance or emergencies. This will prevent any bookings.
                  </p>
                  <div className="grid gap-2">
                    <Label htmlFor="blockReason">Reason for Blocking</Label>
                    <Textarea
                      id="blockReason"
                      placeholder="Enter reason for blocking this slot (e.g., Maintenance, Equipment Failure)"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      This action will immediately block the slot and create a note in the refund ledger if applicable.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Cancel Action */}
              {action === "cancel" && (
                <div className="space-y-3 p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
                    <h5 className="font-semibold">Force Cancel Booking</h5>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cancel an active booking and free up the slot. A refund transaction will be recorded.
                  </p>
                  <div className="grid gap-2">
                    <Label htmlFor="cancelNote">Cancellation Note (for refund ledger)</Label>
                    <Textarea
                      id="cancelNote"
                      placeholder="Enter reason for cancellation (e.g., Customer No-show, Technical Issues)"
                      value={cancelNote}
                      onChange={(e) => setCancelNote(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Alert className="bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      This will cancel the booking and mark the slot as available. A refund transaction will be created.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Update Action */}
              {action === "update" && (
                <div className="space-y-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                    <h5 className="font-semibold">Update Slot Status</h5>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Manually change the status of this slot.
                  </p>
                  <div className="grid gap-2">
                    <Label htmlFor="newStatus">New Status</Label>
                    <Select value={newStatus} onValueChange={(value: Slot['status']) => setNewStatus(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span>Available</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="booked">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            <span>Occupied/Booked</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="blocked">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                            <span>Blocked/Maintenance</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Delete Action */}
              {action === "delete" && (
                <div className="space-y-3 p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-red-600 dark:text-red-500" />
                    <h5 className="font-semibold">Delete Slot Completely</h5>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This permanently removes the slot from the database. It cannot be undone. Only do this if the slot was created by mistake.
                  </p>
                  <Alert className="bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-sm text-red-800 dark:text-red-300">
                      Warning: If this slot has active bookings or transactions linked to it, deleting it might cause data inconsistency.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className={cn(
              action === "block" && "bg-yellow-600 hover:bg-yellow-700",
              action === "cancel" && "bg-red-600 hover:bg-red-700",
              action === "update" && "bg-blue-600 hover:bg-blue-700",
              action === "delete" && "bg-red-600 hover:bg-red-700"
            )}
          >
            {isPending ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Processing...
              </>
            ) : (
              <>
                {action === "block" && <Wrench className="mr-2 h-4 w-4" />}
                {action === "cancel" && <XCircle className="mr-2 h-4 w-4" />}
                {action === "update" && <CheckCircle className="mr-2 h-4 w-4" />}
                {action === "delete" && <Trash2 className="mr-2 h-4 w-4" />}
                {action === "block" && "Block Slot"}
                {action === "cancel" && "Force Cancel"}
                {action === "update" && "Update Status"}
                {action === "delete" && "Delete Slot"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}