"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAllTransactions, type TransactionFilters } from "@/hooks/useTransactionsData";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Banknote,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowUpDown,
  IndianRupee,
  ShoppingCart,
  Search,
  X,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

const PAGE_SIZE = 50;
const IST = "Asia/Kolkata";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: IST,
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: IST,
  });
}

function parseLocalDate(dateStr: string) {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getServiceNames(tx: any): string {
  if (!tx.items_parsed || !Array.isArray(tx.items_parsed)) return "—";
  const svc = tx.items_parsed.filter((i: any) => i.type === "service");
  if (svc.length === 0) return "—";
  const names = Array.from(new Set(svc.map((i: any) => i.name as string)));
  return (names as string[]).join(", ");
}

function MethodBadge({ method }: { method: string }) {
  const cls =
    method === "cash"
      ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
      : method === "razorpay"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300"
      : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
  return <Badge className={cn("capitalize text-xs", cls)}>{method}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "paid"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
      : status === "refunded"
      ? "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300"
      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
  return <Badge className={cn("capitalize text-xs", cls)}>{status}</Badge>;
}

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({
    paymentMethod: "all",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [page, setPage] = useState(0);
  const [sortDesc, setSortDesc] = useState(true);

  const activeFilters: TransactionFilters = {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    paymentMethod: filters.paymentMethod !== "all" ? filters.paymentMethod : undefined,
    status: filters.status !== "all" ? filters.status : undefined,
  };

  const { data: transactions = [], isLoading, error, refetch } = useAllTransactions(activeFilters);

  const sorted = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortDesc ? -diff : diff;
      }),
    [transactions, sortDesc]
  );

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handle = (key: keyof TransactionFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({ paymentMethod: "all", status: "all", dateFrom: "", dateTo: "" });
    setPage(0);
  };

  const hasActiveFilters =
    filters.dateFrom || filters.dateTo || filters.paymentMethod !== "all" || filters.status !== "all";

  // Summary stats
  const totalAmount = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const cashTotal = transactions.filter((t) => t.payment_method === "cash").reduce((s, t) => s + Number(t.amount), 0);
  const onlineTotal = transactions.filter((t) => t.payment_method !== "cash").reduce((s, t) => s + Number(t.amount), 0);
  const cashCount = transactions.filter((t) => t.payment_method === "cash").length;
  const onlineCount = transactions.filter((t) => t.payment_method !== "cash").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Full historical record of all payments</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">{transactions.length} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cash</CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{formatPrice(cashTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">{cashCount} transactions (in hand)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Online / Bank</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatPrice(onlineTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">{onlineCount} transactions (UPI + Razorpay)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 text-xs">Active</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 flex flex-col">
              <Label>Date From</Label>
              <DatePicker
                date={parseLocalDate(filters.dateFrom || "")}
                setDate={(d) => handle("dateFrom", d ? format(d, "yyyy-MM-dd") : "")}
                placeholder="Start date"
              />
            </div>
            <div className="space-y-1.5 flex flex-col">
              <Label>Date To</Label>
              <DatePicker
                date={parseLocalDate(filters.dateTo || "")}
                setDate={(d) => handle("dateTo", d ? format(d, "yyyy-MM-dd") : "")}
                placeholder="End date"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={filters.paymentMethod ?? "all"} onValueChange={(v) => handle("paymentMethod", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={filters.status ?? "all"} onValueChange={(v) => handle("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3.5 w-3.5" />
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Transactions{" "}
            <span className="text-sm font-normal text-muted-foreground">({sorted.length} records)</span>
          </CardTitle>
          <CardDescription>
            {sorted.length === 0
              ? "No results"
              : `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, sorted.length)} of ${sorted.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              Error: {(error as Error).message}
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No transactions match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 font-medium"
                        onClick={() => setSortDesc((d) => !d)}
                      >
                        Date / Time <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Service Booked</TableHead>
                    <TableHead>Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm font-medium">{fmtDate(tx.created_at)}</div>
                        <div className="text-xs text-muted-foreground">{fmtTime(tx.created_at)}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {tx.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{tx.customer_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {tx.customer_phone || <span className="italic">Walk-in</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(Number(tx.amount))}
                      </TableCell>
                      <TableCell>
                        <MethodBadge method={tx.payment_method} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate" title={getServiceNames(tx)}>
                        {getServiceNames(tx)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(tx as any).items_parsed?.length ?? 0} item
                        {(tx as any).items_parsed?.length !== 1 ? "s" : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
