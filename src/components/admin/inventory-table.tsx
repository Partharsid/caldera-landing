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
import { MoreHorizontal, Edit, Trash2, Package } from "lucide-react";
import { useInventory, useUpdateStock, useDeleteInventory, useUpdateInventory } from "@/hooks/useInventory";
import { type Inventory } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// Need to add DropdownMenu component - create placeholder if not exists
// For now, using div as placeholder

export default function InventoryTable() {
  const { data: inventory = [], isLoading, error } = useInventory();
  const updateStock = useUpdateStock();
  const deleteInventory = useDeleteInventory();
  const updateInventory = useUpdateInventory();

  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [stockUpdateId, setStockUpdateId] = useState<string | null>(null);
  const [newStockCount, setNewStockCount] = useState("");

  // Edit form state
  const [editItemName, setEditItemName] = useState("");
  const [editType, setEditType] = useState<"food" | "beverage" | "misc">("food");
  const [editPrice, setEditPrice] = useState("");
  const [editStockCount, setEditStockCount] = useState("");

  const handleEdit = (item: Inventory) => {
    setEditingItem(item);
    setEditItemName(item.item_name);
    setEditType(item.type);
    setEditPrice(item.price.toString());
    setEditStockCount(item.stock_count.toString());
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteInventory.mutate(itemToDelete);
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleQuickStockUpdate = (id: string, currentStock: number) => {
    setStockUpdateId(id);
    setNewStockCount(currentStock.toString());
  };

  const saveStockUpdate = () => {
    if (stockUpdateId && newStockCount) {
      updateStock.mutate({
        id: stockUpdateId,
        stock_count: parseInt(newStockCount, 10),
      });
      setStockUpdateId(null);
      setNewStockCount("");
    }
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    updateInventory.mutate({
      id: editingItem.id,
      updates: {
        item_name: editItemName,
        type: editType,
        price: parseFloat(editPrice),
        stock_count: parseInt(editStockCount, 10),
      },
    });
    setIsEditDialogOpen(false);
  };

  const getTypeColor = (type: Inventory["type"]) => {
    switch (type) {
      case "food":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "beverage":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "misc":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStockStatus = (count: number) => {
    if (count === 0) {
      return { text: "Out of stock", color: "text-red-500" };
    } else if (count < 10) {
      return { text: "Low stock", color: "text-amber-500" };
    } else {
      return { text: "In stock", color: "text-green-500" };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground animate-pulse" />
          <p className="mt-2 text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <p className="text-destructive">Error loading inventory: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-x-auto pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Item Name</TableHead>
              <TableHead className="whitespace-nowrap">Type</TableHead>
              <TableHead className="whitespace-nowrap">Price</TableHead>
              <TableHead className="whitespace-nowrap">Stock Count</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.map((item) => {
              const stockStatus = getStockStatus(item.stock_count);
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell>
                    <Badge className={cn("capitalize", getTypeColor(item.type))}>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>₹{item.price.toFixed(2)}</TableCell>
                  <TableCell>
                    {stockUpdateId === item.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={newStockCount}
                          onChange={(e) => setNewStockCount(e.target.value)}
                          className="h-8 w-24"
                        />
                        <Button size="sm" onClick={saveStockUpdate}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStockUpdateId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{item.stock_count}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            handleQuickStockUpdate(item.id, item.stock_count)
                          }
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn("font-medium", stockStatus.color)}>
                      {stockStatus.text}
                    </span>
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
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>
              Update the details of {editingItem?.item_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="item_name">Item Name</Label>
              <Input
                id="item_name"
                value={editItemName}
                onChange={(e) => setEditItemName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={editType} onValueChange={(value: "food" | "beverage" | "misc") => setEditType(value)}>
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
              <Label htmlFor="price">Price (₹)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stock_count">Stock Count</Label>
              <Input
                id="stock_count"
                type="number"
                value={editStockCount}
                onChange={(e) => setEditStockCount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateInventory.isPending}>
              {updateInventory.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
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