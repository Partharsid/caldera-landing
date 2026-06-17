"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  IndianRupee,
  CreditCard,
  Banknote,
  Package,
  BarChart3,
  FileText,
  TrendingUp,
  Users,
  Smartphone,
  Calendar as CalendarIcon,
  Download,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { useSettlementReport } from "@/hooks/useTransactionsData";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const IST = "Asia/Kolkata";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: IST,
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: IST,
  });
}

// ── Build hourly activity data (0–23)
function buildHourlyData(hourlyTransactions: Record<number, number>) {
  return Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    count: hourlyTransactions[h] ?? 0,
  }));
}

// ── Build cumulative revenue throughout the day
function buildCumulativeData(transactions: any[]) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  let cumulative = 0;
  return sorted.map((tx) => {
    cumulative += Number(tx.amount);
    return {
      time: fmtTime(tx.created_at),
      cumulative,
      amount: Number(tx.amount),
    };
  });
}

// ── Get readable items summary from a transaction
function getItemsSummary(tx: any): string {
  const items = tx.items_parsed || [];
  if (items.length === 0) return "—";
  return items
    .map((item: any) => {
      const qty = item.quantity > 1 ? ` ×${item.quantity}` : "";
      return `${item.name}${qty}`;
    })
    .join(", ");
}

const tooltipStyle = {
  backgroundColor: "#1f2937",
  borderColor: "#374151",
  borderRadius: "0.5rem",
  color: "#f9fafb",
};

export default function SettlementPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const {
    transactions,
    isLoading,
    error,
    totals,
    paymentSplit,
    onlineTotal,
    categoryBreakdown,
    hourlyTransactions,
  } = useSettlementReport(selectedDate);

  const formatDateLabel = (date: Date) =>
    date.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: IST,
    });

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const handleExportPDF = () => window.print();

  const gross = totals.revenue;
  const cashPct = gross > 0 ? (paymentSplit.cash / gross) * 100 : 0;
  const upiPct = gross > 0 ? (paymentSplit.upi / gross) * 100 : 0;
  const razorpayPct = gross > 0 ? (paymentSplit.razorpay / gross) * 100 : 0;
  const onlinePct = gross > 0 ? (onlineTotal / gross) * 100 : 0;
  const servicesPct = gross > 0 ? (categoryBreakdown.services / gross) * 100 : 0;
  const inventoryPct = gross > 0 ? (categoryBreakdown.inventory / gross) * 100 : 0;

  const hourlyData = useMemo(() => buildHourlyData(hourlyTransactions), [hourlyTransactions]);
  const cumulativeData = useMemo(() => buildCumulativeData(transactions), [transactions]);

  const peakHour = useMemo(() => {
    const entries = Object.entries(hourlyTransactions);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  }, [hourlyTransactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading settlement report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <p className="text-destructive">Error loading settlement data: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; color: black !important; }
          .print-hide, nav, button, [role="banner"] { display: none !important; }
          .admin-sidebar { display: none !important; }
          .card { border: 1px solid #e5e7eb !important; box-shadow: none !important; break-inside: avoid; }
          table { font-size: 11px; }
          h1 { font-size: 20px !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Settlement Report</h1>
          <p className="text-muted-foreground">Comprehensive overview of daily transactions and revenue</p>
        </div>
        <div className="flex items-center gap-3 print-hide">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Badge variant="outline" className="gap-2">
            <CalendarIcon className="h-3 w-3" />
            {formatDateLabel(selectedDate)}
          </Badge>
        </div>
      </div>

      {/* Date Navigation */}
      <Card className="print-hide">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Select Date:</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => shiftDay(-1)}>
                ← Previous
              </Button>
              <DatePicker date={selectedDate} setDate={(d) => d && setSelectedDate(d)} />
              <Button variant="outline" size="sm" onClick={() => shiftDay(1)}>
                Next →
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                Today
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IndianRupee className="h-4 w-4" /> Gross Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(gross)}</div>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-green-600">Cash (in hand):</span>
                <span>{formatPrice(paymentSplit.cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Online (in bank):</span>
                <span>{formatPrice(onlineTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Avg. Transaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totals.avgTransactionValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per customer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.transactionCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Today&apos;s count</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Peak Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            {peakHour ? (
              <>
                <div className="text-2xl font-bold">{String(peakHour[0]).padStart(2, "0")}:00</div>
                <p className="text-xs text-muted-foreground mt-1">{peakHour[1]} transactions</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">--:--</div>
                <p className="text-xs text-muted-foreground mt-1">No transactions</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Split + Category Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Split</CardTitle>
            <CardDescription>Breakdown of gross revenue by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {/* Cash */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Cash</span>
                    <span className="text-xs text-muted-foreground">(in hand)</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatPrice(paymentSplit.cash)}</div>
                    <div className="text-sm text-muted-foreground">{cashPct.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${cashPct}%` }} />
                </div>
              </div>

              {/* UPI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">UPI</span>
                    <span className="text-xs text-muted-foreground">(in bank)</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatPrice(paymentSplit.upi)}</div>
                    <div className="text-sm text-muted-foreground">{upiPct.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${upiPct}%` }} />
                </div>
              </div>

              {/* Razorpay */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Razorpay</span>
                    <span className="text-xs text-muted-foreground">(in bank)</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatPrice(paymentSplit.razorpay)}</div>
                    <div className="text-sm text-muted-foreground">{razorpayPct.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${razorpayPct}%` }} />
                </div>
              </div>

              <Separator />

              {/* Audit row */}
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between font-medium">
                  <span>Cash (in hand)</span>
                  <span className="text-green-700 dark:text-green-400">{formatPrice(paymentSplit.cash)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Online / Bank (UPI + Razorpay)</span>
                  <span className="text-blue-700 dark:text-blue-400">{formatPrice(onlineTotal)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between font-bold">
                  <span>= Gross Revenue</span>
                  <span>{formatPrice(gross)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="space-y-0.5">
                  <div className="text-muted-foreground text-xs">Cash txns</div>
                  <div className="font-semibold">{transactions.filter((t) => t.payment_method === "cash").length}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-muted-foreground text-xs">UPI txns</div>
                  <div className="font-semibold">{transactions.filter((t) => t.payment_method === "upi").length}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-muted-foreground text-xs">Razorpay txns</div>
                  <div className="font-semibold">{transactions.filter((t) => t.payment_method === "razorpay").length}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
            <CardDescription>Services vs Food &amp; Beverages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Services</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatPrice(categoryBreakdown.services)}</div>
                    <div className="text-sm text-muted-foreground">{servicesPct.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${servicesPct}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">Food &amp; Beverages</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatPrice(categoryBreakdown.inventory)}</div>
                    <div className="text-sm text-muted-foreground">{inventoryPct.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${inventoryPct}%` }} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Revenue Share</span>
                  <span className="font-semibold">{servicesPct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">F&amp;B Revenue Share</span>
                  <span className="font-semibold">{inventoryPct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Online Revenue %</span>
                  <span className="font-semibold text-blue-600">{onlinePct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Activity Chart */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hourly Activity</CardTitle>
            <CardDescription>Number of transactions per hour of day</CardDescription>
          </CardHeader>
          <CardContent>
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
                    interval={1}
                  />
                  <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    formatter={(v: any) => [`${v} transactions`, "Transactions"]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cumulative Revenue Chart */}
      {cumulativeData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Revenue</CardTitle>
            <CardDescription>Running total of revenue built up through the day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="time" stroke="#888" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis
                    stroke="#888"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Cumulative"]}
                    contentStyle={tooltipStyle}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>All transactions for {formatDateLabel(selectedDate)}</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
              <h3 className="mt-4 text-lg font-semibold">No Transactions</h3>
              <p className="text-muted-foreground">No transactions recorded for {formatDateLabel(selectedDate)}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Time</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">ID</th>
                    <th className="text-right py-3 px-4 font-medium whitespace-nowrap">Amount</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Method</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Status</th>
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Customer</th>
                    <th className="text-left py-3 px-4 font-medium">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">{fmtDateTime(tx.created_at)}</td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {tx.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">{formatPrice(Number(tx.amount))}</td>
                      <td className="py-3 px-4">
                        <Badge
                          className={cn(
                            "capitalize text-xs",
                            tx.payment_method === "cash"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                              : tx.payment_method === "razorpay"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                          )}
                        >
                          {tx.payment_method}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={cn(
                            "capitalize text-xs",
                            tx.status === "paid"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                              : "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300"
                          )}
                        >
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {tx.customer_name || tx.customer_phone || "Walk-in"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-[240px] truncate" title={getItemsSummary(tx)}>
                        {getItemsSummary(tx)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settlement Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Settlement Summary</CardTitle>
          <CardDescription>Complete daily settlement for {formatDateLabel(selectedDate)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-medium">{formatDateLabel(selectedDate)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Report Generated</div>
              <div className="font-medium" suppressHydrationWarning>
                {new Date().toLocaleString("en-IN", { timeZone: IST })}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Complete
              </Badge>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Total Settlement Value</div>
              <div className="text-3xl font-bold">{formatPrice(gross)}</div>
              <div className="text-sm text-muted-foreground">
                Cash: {formatPrice(paymentSplit.cash)} · Online: {formatPrice(onlineTotal)}
              </div>
            </div>
            <Button onClick={handleExportPDF} size="lg" className="print-hide">
              <Download className="mr-2 h-4 w-4" />
              Download Report (PDF)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}