"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, Package, Plus, Minus, Coffee, Pizza, Box } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { type InventoryItem } from "@/hooks/useCart";

interface InventorySelectorProps {
  onAddInventory: (inventory: InventoryItem, quantity: number) => void;
}

export default function InventorySelector({ onAddInventory }: InventorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { data: inventory = [], isLoading } = useInventory();

  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = searchQuery === "" ||
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedType === "all" || item.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [inventory, searchQuery, selectedType]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "food":
        return <Pizza className="h-4 w-4" />;
      case "beverage":
        return <Coffee className="h-4 w-4" />;
      case "misc":
        return <Box className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "food":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "beverage":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "misc":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const handleQuantityChange = (id: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      const newQuantity = Math.max(0, current + delta);
      return { ...prev, [id]: newQuantity };
    });
  };

  const handleAddToCart = (item: any) => {
    const quantity = quantities[item.id] || 1;
    if (quantity > 0) {
      onAddInventory({
        id: item.id,
        name: item.item_name,
        price: item.price,
        type: item.type,
        stock_count: item.stock_count
      }, quantity);
      setQuantities(prev => ({ ...prev, [item.id]: 0 }));
    }
  };

  const inventoryTypes = Array.from(new Set(inventory.map(item => item.type)));

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search food & beverages..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              variant={selectedType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("all")}
            >
              <Filter className="h-3 w-3 mr-1" />
              All
            </Button>
            {inventoryTypes.map(type => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type)}
                className="capitalize"
              >
                {type === "misc" ? "Miscellaneous" : type}s
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Items Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedType !== "all"
                ? "No items match your filters"
                : "Inventory is empty"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => {
              const quantity = quantities[item.id] || 0;
              const isLowStock = item.stock_count < 10;
              const isOutOfStock = item.stock_count === 0;

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "hover:border-primary hover:shadow-md transition-all overflow-hidden",
                    isOutOfStock && "opacity-60"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold truncate">{item.item_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={cn("gap-1", getTypeColor(item.type))}>
                              {getTypeIcon(item.type)}
                              <span className="capitalize">
                                {item.type === "misc" ? "Misc" : item.type}
                              </span>
                            </Badge>
                            {isLowStock && !isOutOfStock && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                Low Stock
                              </Badge>
                            )}
                            {isOutOfStock && (
                              <Badge variant="destructive">Out of Stock</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {formatPrice(item.price)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Stock: {item.stock_count}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Selector */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Quantity:</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleQuantityChange(item.id, -1)}
                              disabled={quantity <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleQuantityChange(item.id, 1)}
                              disabled={isOutOfStock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Add to Cart Button */}
                        <Button
                          variant={quantity > 0 ? "default" : "outline"}
                          size="sm"
                          className="w-full"
                          onClick={() => handleAddToCart(item)}
                          disabled={isOutOfStock || quantity === 0}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {quantity > 0 ? `Add ${quantity} to Cart` : "Add to Cart"}
                          {quantity > 0 && (
                            <span className="ml-2 text-xs">
                              ({formatPrice(item.price * quantity)})
                            </span>
                          )}
                        </Button>

                        {/* Quick Add Buttons */}
                        <div className="grid grid-cols-3 gap-1">
                          {[1, 2, 5].map(num => (
                            <Button
                              key={num}
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => {
                                const newQuantity = (quantities[item.id] || 0) + num;
                                setQuantities(prev => ({ ...prev, [item.id]: newQuantity }));
                              }}
                              disabled={isOutOfStock}
                            >
                              +{num}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}