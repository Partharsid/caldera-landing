import { type Service } from "./supabase";

/**
 * Calculate the current price for a service based on time of day and day of week
 * Peak pricing applies:
 * - Between 4:00 PM (16:00) and 11:00 PM (23:00) on any day
 * - All day on Saturday and Sunday
 */
export function calculateCurrentPrice(service: Service): number {
  const now = new Date();
  return calculatePriceForDateTime(service, now);
}

/**
 * Calculate price for a service at a specific date and time.
 */
export function calculatePriceForDateTime(service: Service, dateTime: Date): number {
  const hours = dateTime.getHours();
  const dayOfWeek = dateTime.getDay(); // 0 = Sunday, 6 = Saturday

  const isPeakHours = hours >= 16 && hours < 23; // 4 PM to 11 PM
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

  return (isPeakHours || isWeekend) ? service.peak_price : service.base_price;
}

/**
 * Format price for display
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get current time information for display
 */
export function getCurrentTimeInfo(): {
  isPeakHours: boolean;
  isWeekend: boolean;
  currentTime: string;
  pricingMode: "peak" | "base";
} {
  const now = new Date();
  const hours = now.getHours();
  const dayOfWeek = now.getDay();

  const isPeakHours = hours >= 16 && hours < 23;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isPeakPricing = isPeakHours || isWeekend;

  const currentTime = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return {
    isPeakHours,
    isWeekend,
    currentTime,
    pricingMode: isPeakPricing ? "peak" : "base"
  };
}

/**
 * Calculate cart totals
 */
export interface CartItem {
  type: "service" | "inventory";
  id: string;
  name: string;
  quantity: number;
  price: number;
  metadata?: {
    service?: Service;
    slot?: {
      start_time: string;
      end_time: string;
    };
    inventory?: {
      type: string;
      stock_count: number;
    };
    custom?: boolean;
  };
}

export function calculateCartTotals(items: CartItem[]): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = 0; // GST removed as per user request
  const total = subtotal;

  return {
    subtotal,
    tax,
    total
  };
}