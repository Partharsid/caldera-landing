"use client";

import { useState, useCallback, useEffect } from "react";
import { type Service } from "@/lib/supabase";
import { type CartItem, calculateCartTotals } from "@/lib/pricing";

export interface HeldCart {
  id: string;
  timestamp: number;
  customerPhone: string;
  comment: string;
  items: CartItem[];
  itemCount: number;
  total: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  type: "food" | "beverage" | "misc";
  stock_count: number;
}

export interface ServiceSlot {
  id: string;
  service_id: string;
  service: Service;
  start_time: string;
  end_time: string;
  status: "available" | "booked" | "blocked";
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [comment, setComment] = useState("");
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);

  // Load held carts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pos_held_carts");
      if (stored) {
        setHeldCarts(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load held carts", e);
    }
  }, []);

  const addService = useCallback((service: Service, slot: ServiceSlot) => {
    setItems(prev => {
      // Check if this service slot is already in cart
      const existingIndex = prev.findIndex(
        item => item.type === "service" && item.id === slot.id
      );

      if (existingIndex >= 0) {
        // Update quantity if already exists
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      }

      // Add new service slot
      return [...prev, {
        type: "service",
        id: slot.id,
        name: service.name,
        quantity: 1,
        price: service.peak_price, // Will be recalculated at checkout
        metadata: {
          service,
          slot: {
            start_time: slot.start_time,
            end_time: slot.end_time
          }
        }
      }];
    });
  }, []);

  const addInventory = useCallback((inventory: InventoryItem, quantity: number = 1) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.type === "inventory" && item.id === inventory.id
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      }

      return [...prev, {
        type: "inventory",
        id: inventory.id,
        name: inventory.name,
        quantity,
        price: inventory.price,
        metadata: {
          inventory: {
            type: inventory.type,
            stock_count: inventory.stock_count
          }
        }
      }];
    });
  }, []);

  const addCustomItem = useCallback((name: string, price: number, quantity: number = 1) => {
    setItems(prev => {
      return [...prev, {
        type: "service", // treating custom as service for pricing calculation purposes
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name,
        quantity,
        price,
        metadata: {
          custom: true
        }
      }];
    });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomerPhone("");
    setComment("");
  }, []);

  const holdCart = useCallback(() => {
    if (items.length === 0) return;
    const { total } = calculateCartTotals(items);
    const newHeld: HeldCart = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      customerPhone,
      comment,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      total
    };
    
    setHeldCarts(prev => {
      const updated = [...prev, newHeld];
      localStorage.setItem("pos_held_carts", JSON.stringify(updated));
      return updated;
    });
    
    clearCart();
  }, [items, customerPhone, comment, clearCart]);

  const restoreCart = useCallback((heldId: string) => {
    setHeldCarts(prev => {
      const cartToRestore = prev.find(c => c.id === heldId);
      if (cartToRestore) {
        setItems(cartToRestore.items);
        setCustomerPhone(cartToRestore.customerPhone || "");
        setComment(cartToRestore.comment || "");
      }
      const updated = prev.filter(c => c.id !== heldId);
      localStorage.setItem("pos_held_carts", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const discardCart = useCallback((heldId: string) => {
    setHeldCarts(prev => {
      const updated = prev.filter(c => c.id !== heldId);
      localStorage.setItem("pos_held_carts", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const { subtotal, tax, total } = calculateCartTotals(items);

  return {
    items,
    customerPhone,
    setCustomerPhone,
    comment,
    setComment,
    addService,
    addInventory,
    updateQuantity,
    removeItem,
    clearCart,
    holdCart,
    restoreCart,
    discardCart,
    addCustomItem,
    heldCarts,
    subtotal,
    tax,
    total,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
  };
}