"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRevenueTrend, type RevenueDataPoint } from "@/hooks/useRevenueTrend";
import { useAllTransactions } from "@/hooks/useTransactionsData";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Calendar,
  IndianRupee,
  BarChart as BarChartIcon,
  Banknote,
  CreditCard,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { format, subDays } from "date-fns";

// ── Date range options
const RANGES = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
] as const;

// ── IST-safe local date string
function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Stats computation
function getSummaryStats(data: RevenueDataPoint[]) {
  if (!data || data.length === 0) {
    return { totalRevenue: 0, avgDailyRevenue: 0, peakRevenue: 0, peakDate: "", transactionCount: 0 };
  }
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const avgDailyRevenue = totalRevenue / data.length;
  const peakDay = data.reduce((max, d) => (d.revenue > max.revenue ? d : max), data[0]);
  const transactionCount = data.reduce((s, d) => s + d.transactionCount, 0);
  return { totalRevenue, avgDailyRevenue, peakRevenue: peakDay.revenue, peakDate: peakDay.date, transactionCount };
}

// ── Hourly heatmap helper — uses IST hours (UTC+5:30)
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function getISTHour(iso: string): number {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS).getUTCHours();
}
function buildHourlyData(txs: any[]): { hour: string; count: number; revenue: number }[] {
  const buckets: Record<number, { count: number; revenue: number }> = {};
  txs.forEach((tx) => {
    const h = getISTHour(tx.created_at);
    if (!buckets[h]) buckets[h] = { count: 0, revenue: 0 };
    buckets[h].count += 1;
    buckets[h].revenue += Number(tx.amount);
  });
  return Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    count: buckets[h]?.count ?? 0,
    revenue: buckets[h]?.revenue ?? 0,
  }));
}

// ── Top services helper (from items_json)
function buildTopServices(txs: any[]): { name: string; revenue: number; count: number }[] {
  const map: Record<string, { revenue: number; count: number }> = {};
  txs.forEach((tx) => {
    const items = (tx.items_parsed || []) as any[];
    items.forEach((item: any) => {
      if (item.type !== "service") return;
      if (!map[item.name]) map[item.name] = { revenue: 0, count: 0 };
      map[item.name].revenue += item.price * item.quantity;
      map[item.name].count += item.quantity;
    });
  });
  return Object.entries(map)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);
}

// ── Tooltip styles
const tooltipStyle = {
  backgroundColor: "#1f2937",
  borderColor: "#374151",
  borderRadius: "0.5rem",
  color: "#f9fafb",
};

// ── Pill button
function RangePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent border-border text-muted-foreground hover:border-primary/50"
      )}
    >
      {label}
    </button>
  );
}

// ── Loading skeleton
function ChartSkeleton({ h = 80 }: { h?: number }) {
  return (
    <div className={`flex items-center justify-center`} style={{ height: h * 4 }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<number>(30);

  const { data: trendData = [], isLoading: trendLoading, error: trendError, refetch } = useRevenueTrend(days);

  // Fetch all transactions in the selected range for hourly + service breakdown
  const dateFrom = toLocalDateStr(subDays(new Date(), days));
  const dateTo = toLocalDateStr(new Date());
  const { data: allTx = [], isLoading: txLoading } = useAllTransactions({ dateFrom, dateTo, status: "paid" });

  const stats = useMemo(() => getSummaryStats(trendData), [trendData]);
  const hourlyData = useMemo(() => buildHourlyData(allTx), [allTx]);
  const topServices = useMemo(() => buildTopServices(allTx), [allTx]);

  const isLoading = trendLoading || txLoading;

  if (trendError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h2 className="text-lg font-semibold text-red-800">Error loading analytics data</h2>
        <p className="text-red-600">{(trendError as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Revenue trends and insights</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <div className="flex items-center gap-1.5 border border-border rounded-full px-1.5 py-1">
            {RANGES.map((r) => (
              <RangePill key={r.value} label={r.label} active={days === r.value} onClick={() => setDays(r.value)} />
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-full border border-border hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {stats.transactionCount} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.avgDailyRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per day over {days} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Peak Revenue Day</CardTitle>
            <BarChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.peakRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.peakDate ? format(new Date(stats.peakDate + "T12:00:00"), "MMM d, yyyy") : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Date Range</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{days} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(subDays(new Date(), days), "MMM d")} – {format(new Date(), "MMM d, yyyy")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend (line) */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <p className="text-sm text-muted-foreground">Daily revenue from paid transactions</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton />
          ) : trendData.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No transaction data for this period.</div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis
                    dataKey="date"
                    stroke="#888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => format(new Date(v + "T12:00:00"), days <= 7 ? "EEE d" : "MMM d")}
                    interval={days <= 7 ? 0 : days <= 30 ? 3 : 7}
                  />
                  <YAxis
                    stroke="#888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]}
                    labelFormatter={(l) => format(new Date(l + "T12:00:00"), "EEEE, MMMM d yyyy")}
                    contentStyle={tooltipStyle}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Breakdown (stacked bar) + Daily Txn Count */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">Daily revenue split by cash, UPI, and Razorpay</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton h={64} />
            ) : trendData.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No data.</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} barSize={days <= 7 ? 24 : days <= 30 ? 10 : 5}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => format(new Date(v + "T12:00:00"), "MMM d")}
                      interval={days <= 30 ? 4 : 8}
                    />
                    <YAxis
                      stroke="#888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v: any, name: any) => [
                        `₹${Number(v).toLocaleString("en-IN")}`,
                        name === "cashRevenue" ? "Cash" : name === "upiRevenue" ? "UPI" : "Razorpay",
                      ] as [string, string]}
                      labelFormatter={(l) => format(new Date(l + "T12:00:00"), "MMMM d, yyyy")}
                      contentStyle={tooltipStyle}
                    />
                    <Legend
                      formatter={(v) =>
                        v === "cashRevenue" ? "Cash" : v === "upiRevenue" ? "UPI" : "Razorpay"
                      }
                    />
                    <Bar dataKey="cashRevenue" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="upiRevenue" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="razorpayRevenue" stackId="a" fill="#a855f7" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Transaction Count</CardTitle>
            <p className="text-sm text-muted-foreground">Number of paid transactions per day</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton h={64} />
            ) : trendData.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No data.</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} barSize={days <= 7 ? 24 : days <= 30 ? 10 : 5}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => format(new Date(v + "T12:00:00"), "MMM d")}
                      interval={days <= 30 ? 4 : 8}
                    />
                    <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v: any) => [v, "Transactions"]}
                      labelFormatter={(l) => format(new Date(l + "T12:00:00"), "MMMM d, yyyy")}
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="transactionCount" fill="#10b981" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hourly Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Activity</CardTitle>
          <p className="text-sm text-muted-foreground">
            Transactions per hour of day (aggregated over the selected period)
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton h={48} />
          ) : allTx.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No transaction data.</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    stroke="#888"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                  />
                  <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v: any, name: any) => [
                      name === "count" ? `${v} transactions` : `₹${Number(v).toLocaleString("en-IN")}`,
                      name === "count" ? "Transactions" : "Revenue",
                    ] as [string, string]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[2, 2, 0, 0]} name="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Services + Data Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle>Top Services by Revenue</CardTitle>
            <p className="text-sm text-muted-foreground">Services generating the most revenue</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No service bookings in this period.</p>
            ) : (
              <div className="space-y-3">
                {topServices.map((svc, i) => {
                  const maxRev = topServices[0].revenue;
                  const pct = maxRev > 0 ? (svc.revenue / maxRev) * 100 : 0;
                  return (
                    <div key={svc.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                          <span className="font-medium truncate max-w-[200px]">{svc.name}</span>
                        </span>
                        <span className="font-semibold tabular-nums">{formatPrice(svc.revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">{svc.count} booking{svc.count !== 1 ? "s" : ""}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Data Summary</CardTitle>
            <p className="text-sm text-muted-foreground">Key metrics from the period</p>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex justify-between items-center py-1 border-b border-border">
                <dt className="text-sm text-muted-foreground flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-500" /> Cash
                </dt>
                <dd className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {formatPrice(trendData.reduce((s, d) => s + d.cashRevenue, 0))}
                </dd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border">
                <dt className="text-sm text-muted-foreground flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-500" /> UPI
                </dt>
                <dd className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {formatPrice(trendData.reduce((s, d) => s + d.upiRevenue, 0))}
                </dd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border">
                <dt className="text-sm text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-500" /> Razorpay
                </dt>
                <dd className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                  {formatPrice(trendData.reduce((s, d) => s + d.razorpayRevenue, 0))}
                </dd>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <dt className="text-sm text-muted-foreground">Days with revenue</dt>
                <dd className="text-sm font-medium">{trendData.filter((d) => d.revenue > 0).length} of {trendData.length}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <dt className="text-sm text-muted-foreground">Highest daily revenue</dt>
                <dd className="text-sm font-medium">{formatPrice(stats.peakRevenue)}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <dt className="text-sm text-muted-foreground">Avg transactions/day</dt>
                <dd className="text-sm font-medium">
                  {trendData.length > 0 ? (stats.transactionCount / trendData.length).toFixed(1) : "0"}
                </dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-sm text-muted-foreground">Total days analyzed</dt>
                <dd className="text-sm font-medium">{trendData.length}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}