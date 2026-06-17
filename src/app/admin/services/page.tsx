"use client";

import { useState } from "react";
import ServicesTable from "@/components/admin/services-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Activity, Plus } from "lucide-react";
import { useServices, useCreateService } from "@/hooks/useServices";
import BatchSlotGenerator from "@/components/admin/batch-slot-generator";
import ImageUpload from "@/components/admin/image-upload";

export default function ServicesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data: services = [] } = useServices();
  const createService = useCreateService();

  const activeCount = services.filter((s) => s.is_active).length;
  const inactiveCount = services.filter((s) => !s.is_active).length;

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"court" | "machine" | "table">("court");
  const [basePrice, setBasePrice] = useState("");
  const [peakPrice, setPeakPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  const handleCreate = async () => {
    if (!name || !basePrice || !peakPrice) return;

    await createService.mutateAsync({
      name,
      type,
      base_price: parseFloat(basePrice),
      peak_price: parseFloat(peakPrice),
      is_active: isActive,
      image_url: imageUrl || undefined,
    });

    // Reset form and close dialog
    setName("");
    setType("court");
    setBasePrice("");
    setPeakPrice("");
    setImageUrl("");
    setIsActive(true);
    setIsCreateDialogOpen(false);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services Management</h1>
          <p className="text-muted-foreground">
            Manage courts, machines, tables and their pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BatchSlotGenerator
            trigger={
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Generate Slots
              </Button>
            }
          />
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Service
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>Total services: <span className="font-semibold text-foreground">{services.length}</span></span>
          <span className="mx-2">•</span>
          <span>Active: <span className="font-semibold text-green-500">{activeCount} service{activeCount !== 1 ? "s" : ""}</span></span>
          <span className="mx-2">•</span>
          <span>Inactive: <span className="font-semibold text-red-500">{inactiveCount} service{inactiveCount !== 1 ? "s" : ""}</span></span>
        </div>

        <ServicesTable />
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Service</DialogTitle>
            <DialogDescription>
              Add a new court, machine, or table service with pricing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create_name">Service Name</Label>
              <Input
                id="create_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter service name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create_type">Type</Label>
              <Select value={type} onValueChange={(value: "court" | "machine" | "table") => setType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="court">Court</SelectItem>
                  <SelectItem value="machine">Machine</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create_base_price">Base Price (₹)</Label>
              <Input
                id="create_base_price"
                type="number"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create_peak_price">Peak Price (₹)</Label>
              <Input
                id="create_peak_price"
                type="number"
                step="0.01"
                value={peakPrice}
                onChange={(e) => setPeakPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label>Service Image</Label>
              <ImageUpload
                value={imageUrl}
                onChange={(url) => setImageUrl(url)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="create_is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="create_is_active">Active Service</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createService.isPending}>
              {createService.isPending ? "Creating..." : "Create Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}