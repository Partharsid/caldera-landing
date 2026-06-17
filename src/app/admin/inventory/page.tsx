"use client";

import { useState } from "react";
import InventoryTable from "@/components/admin/inventory-table";
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
import { Package, Plus } from "lucide-react";
import { useInventory, useCreateInventory } from "@/hooks/useInventory";

export default function InventoryPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data: inventory = [] } = useInventory();
  const createInventory = useCreateInventory();

  const lowStockCount = inventory.filter((i) => i.stock_count > 0 && i.stock_count < 10).length;
  const outOfStockCount = inventory.filter((i) => i.stock_count === 0).length;

  // Form state
  const [itemName, setItemName] = useState("");
  const [type, setType] = useState<"food" | "beverage" | "misc">("food");
  const [price, setPrice] = useState("");
  const [stockCount, setStockCount] = useState("0");

  const handleCreate = async () => {
    if (!itemName || !price) return;

    await createInventory.mutateAsync({
      item_name: itemName,
      type,
      price: parseFloat(price),
      stock_count: parseInt(stockCount, 10),
    });

    // Reset form and close dialog
    setItemName("");
    setType("food");
    setPrice("");
    setStockCount("0");
    setIsCreateDialogOpen(false);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage food, beverages, and miscellaneous items
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Item
        </Button>
      </div>

      <div className="grid gap-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>Total items: <span className="font-semibold text-foreground">{inventory.length}</span></span>
          <span className="mx-2">•</span>
          <span>Low stock: <span className="font-semibold text-amber-500">{lowStockCount} item{lowStockCount !== 1 ? "s" : ""}</span></span>
          <span className="mx-2">•</span>
          <span>Out of stock: <span className="font-semibold text-red-500">{outOfStockCount} item{outOfStockCount !== 1 ? "s" : ""}</span></span>
        </div>

        <InventoryTable />
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Inventory Item</DialogTitle>
            <DialogDescription>
              Add a new food, beverage, or miscellaneous item to your inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create_item_name">Item Name</Label>
              <Input
                id="create_item_name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create_type">Type</Label>
              <Select value={type} onValueChange={(value: "food" | "beverage" | "misc") => setType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="beverage">Beverage</SelectItem>
                  <SelectItem value="misc">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create_price">Price (₹)</Label>
              <Input
                id="create_price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create_stock_count">Initial Stock Count</Label>
              <Input
                id="create_stock_count"
                type="number"
                value={stockCount}
                onChange={(e) => setStockCount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createInventory.isPending}>
              {createInventory.isPending ? "Creating..." : "Create Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}