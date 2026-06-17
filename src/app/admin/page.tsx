"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Activity, Users, CreditCard, CalendarCheck, AlertTriangle, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useQuery } from "@tanstack/react-query";
import { supabase, type Transaction, type Inventory } from "@/lib/supabase";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";

function ChangeIndicator({ diff, baseline }: { diff: number; baseline?: number }) {
  if (baseline !== undefined) {
    if (baseline === 0) return <span className="text-blue-600 inline-flex items-center gap-0.5"><ArrowUp className="h-3 w-3" />New</span>;
    const pct = Math.round((diff / baseline) * 100);
    if (pct > 0) return <span className="text-green-600 inline-flex items-center gap-0.5"><ArrowUp className="h-3 w-3" />+{pct}%</span>;
    if (pct < 0) return <span className="text-red-600 inline-flex items-center gap-0.5"><ArrowDown className="h-3 w-3" />{pct}%</span>;
    return <span className="text-muted-foreground inline-flex items-center gap-0.5"><Minus className="h-3 w-3" />0%</span>;
  }
  if (diff > 0) return <span className="text-green-600 inline-flex items-center gap-0.5"><ArrowUp className="h-3 w-3" />+{diff}</span>;
  if (diff < 0) return <span className="text-red-600 inline-flex items-center gap-0.5"><ArrowDown className="h-3 w-3" />{diff}</span>;
  return <span className="text-muted-foreground inline-flex items-center gap-0.5"><Minus className="h-3 w-3" />0</span>;
}

export default function AdminDashboardPage() {
  const {
    todayRevenue,
    activeBookings,
    inventoryCount,
    activeServices,
    activeMemberships,
    yesterdayRevenue,
    yesterdayBookings,
    isLoading,
    error,
  } = useDashboardMetrics();

  const { data: recentTransactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["dashboard", "recent-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Transaction[];
    },
    refetchInterval: 60000,
  });

  const { data: lowStockItems = [], isLoading: stockLoading } = useQuery({
    queryKey: ["dashboard", "low-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .lt("stock_count", 10)
        .order("stock_count", { ascending: true });
      if (error) throw error;
      return data as Inventory[];
    },
  });

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h2 className="text-lg font-semibold text-red-800">Error loading dashboard data</h2>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  const bookingChange = activeBookings - yesterdayBookings;
  const revenueChange = todayRevenue - yesterdayRevenue;

  const stats = [
    {
      title: "Total Inventory Items",
      value: isLoading ? "..." : inventoryCount.toString(),
      icon: Package,
      description: "Across all categories",
    },
    {
      title: "Active Services",
      value: isLoading ? "..." : activeServices.toString(),
      icon: Activity,
      description: "Currently available",
    },
    {
      title: "Active Bookings",
      value: isLoading ? "..." : activeBookings.toString(),
      icon: CalendarCheck,
      changeEl: <ChangeIndicator diff={bookingChange} />,
      description: "vs yesterday",
    },
    {
      title: "Active Memberships",
      value: isLoading ? "..." : activeMemberships.toString(),
      icon: Users,
      description: "Active now",
    },
    {
      title: "Today's Revenue",
      value: isLoading ? "..." : formatPrice(todayRevenue),
      icon: CreditCard,
      changeEl: <ChangeIndicator diff={revenueChange} baseline={yesterdayRevenue} />,
      description: "vs yesterday",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your arcade operations efficiently
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {"changeEl" in stat ? <>{stat.changeEl} </> : null}
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent transactions. Transactions will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.customer_name || tx.customer_phone || "Walk-in"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {tx.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={cn("capitalize text-xs", tx.payment_method === "cash" ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : tx.payment_method === "razorpay" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300" : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300")}>
                        {tx.payment_method}
                      </Badge>
                      <span className="text-sm font-semibold">{formatPrice(Number(tx.amount))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Low Stock Alerts
              {lowStockItems.length > 0 && (
                <Badge variant="destructive" className="text-xs">{lowStockItems.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stockLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All inventory items are well-stocked.
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className={cn("h-4 w-4 shrink-0", item.stock_count === 0 ? "text-red-500" : "text-amber-500")} />
                      <div>
                        <p className="text-sm font-medium truncate">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                      </div>
                    </div>
                    <Badge variant={item.stock_count === 0 ? "destructive" : "outline"} className={cn("text-xs shrink-0", item.stock_count > 0 && "border-amber-500 text-amber-600")}>
                      {item.stock_count === 0 ? "Out of stock" : `${item.stock_count} left`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}