"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Edit, Trash2, Activity, DollarSign } from "lucide-react";
import { useServices, useUpdateServicePrices, useDeleteService, useUpdateService } from "@/hooks/useServices";
import { type Service } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import ImageUpload from "@/components/admin/image-upload";

// Need Switch component - create placeholder if not exists

export default function ServicesTable() {
  const { data: services = [], isLoading, error } = useServices();
  const updatePrices = useUpdateServicePrices();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  const [priceUpdateId, setPriceUpdateId] = useState<string | null>(null);
  const [basePrice, setBasePrice] = useState("");
  const [peakPrice, setPeakPrice] = useState("");

  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"court" | "machine" | "table">("court");
  const [editBasePrice, setEditBasePrice] = useState("");
  const [editPeakPrice, setEditPeakPrice] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setEditName(service.name);
    setEditType(service.type);
    setEditBasePrice(service.base_price.toString());
    setEditPeakPrice(service.peak_price.toString());
    setEditImageUrl(service.image_url || "");
    setEditIsActive(service.is_active);
    setIsEditDialogOpen(true);
  };

  const handlePriceToggle = (service: Service) => {
    setPriceUpdateId(service.id);
    setBasePrice(service.base_price.toString());
    setPeakPrice(service.peak_price.toString());
    setIsPriceDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setServiceToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (serviceToDelete) {
      deleteService.mutate(serviceToDelete);
      setIsDeleteDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  const savePriceUpdate = () => {
    if (priceUpdateId && basePrice && peakPrice) {
      updatePrices.mutate({
        id: priceUpdateId,
        base_price: parseFloat(basePrice),
        peak_price: parseFloat(peakPrice),
      });
      setIsPriceDialogOpen(false);
      setPriceUpdateId(null);
      setBasePrice("");
      setPeakPrice("");
    }
  };

  const saveEditUpdate = () => {
    if (editingService) {
      updateService.mutate({
        id: editingService.id,
        updates: {
          name: editName,
          type: editType,
          base_price: parseFloat(editBasePrice),
          peak_price: parseFloat(editPeakPrice),
          image_url: editImageUrl || undefined,
          is_active: editIsActive,
        },
      });
      setIsEditDialogOpen(false);
      setEditingService(null);
    }
  };

  const toggleActiveStatus = (service: Service) => {
    updateService.mutate({
      id: service.id,
      updates: { is_active: !service.is_active },
    });
  };

  const getTypeColor = (type: Service["type"]) => {
    switch (type) {
      case "court":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "machine":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "table":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 mx-auto text-muted-foreground animate-pulse" />
          <p className="mt-2 text-muted-foreground">Loading services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <p className="text-destructive">Error loading services: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-x-auto pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Service Name</TableHead>
              <TableHead className="whitespace-nowrap">Type</TableHead>
              <TableHead className="whitespace-nowrap">Base Price</TableHead>
              <TableHead className="whitespace-nowrap">Peak Price</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell>
                  <Badge className={cn("capitalize", getTypeColor(service.type))}>
                    {service.type}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(service.base_price)}</TableCell>
                <TableCell>{formatCurrency(service.peak_price)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={service.is_active}
                      onCheckedChange={() => toggleActiveStatus(service)}
                    />
                    <span
                      className={cn(
                        "font-medium",
                        service.is_active
                          ? "text-green-500"
                          : "text-red-500"
                      )}
                    >
                      {service.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEdit(service)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePriceToggle(service)}>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Update Prices
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(service.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update the details of {editingService?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter service name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={editType} onValueChange={(val: "court"|"machine"|"table") => setEditType(val)}>
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
              <Label htmlFor="base_price">Base Price (₹)</Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                value={editBasePrice}
                onChange={(e) => setEditBasePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="peak_price">Peak Price (₹)</Label>
              <Input
                id="peak_price"
                type="number"
                step="0.01"
                value={editPeakPrice}
                onChange={(e) => setEditPeakPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label>Service Image</Label>
              <ImageUpload
                value={editImageUrl}
                onChange={(url) => setEditImageUrl(url)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={editIsActive}
                onCheckedChange={setEditIsActive}
              />
              <Label htmlFor="is_active">Active Service</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Toggle Dialog */}
      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Service Prices</DialogTitle>
            <DialogDescription>
              Adjust base and peak pricing for this service.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="base_price_edit">Base Price (₹)</Label>
              <Input
                id="base_price_edit"
                type="number"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="peak_price_edit">Peak Price (₹)</Label>
              <Input
                id="peak_price_edit"
                type="number"
                step="0.01"
                value={peakPrice}
                onChange={(e) => setPeakPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {basePrice && peakPrice && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">Price Difference</p>
                <p className="text-lg font-bold">
                  ₹{(parseFloat(peakPrice) - parseFloat(basePrice)).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Peak price is{" "}
                  {parseFloat(basePrice) > 0
                    ? `${(
                        ((parseFloat(peakPrice) - parseFloat(basePrice)) /
                          parseFloat(basePrice)) *
                        100
                      ).toFixed(1)}%`
                    : "0%"}{" "}
                  higher than base price
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPriceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePriceUpdate}>Update Prices</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this service? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}