"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar, Clock, Plus, AlertTriangle, CheckCircle, Loader2, Trash2, Calendar as CalendarIcon,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { useServices } from "@/hooks/useServices";
import { useCreateSlotsBulk, useDeleteSlotsByDate } from "@/hooks/useSlots";
import { type Service } from "@/lib/supabase";

// ── helpers ───────────────────────────────────────────────────────────────────
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Generate strictly-hourly slots (no buffer, no half-hours).
 * startHour and endHour are integers (0-24).
 * e.g. startHour=9, endHour=24  →  9→10, 10→11, …, 23→24
 * Each slot is stored as a local-time ISO string (NOT UTC-midnight).
 */
function generateHourlySlots(dateStr: string, startHour: number, endHour: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const slots: { start_time: string; end_time: string; date: string }[] = [];
  for (let h = startHour; h < endHour; h++) {
    const slotStart = new Date(y, m - 1, d, h, 0, 0, 0);
    const slotEnd   = new Date(y, m - 1, d, h + 1, 0, 0, 0);
    slots.push({
      start_time: slotStart.toISOString(),
      end_time:   slotEnd.toISOString(),
      date:        dateStr,
    });
  }
  return slots;
}

function parseHour(timeStr: string): number {
  const [h] = timeStr.split(":").map(Number);
  return h;
}

function dateRange(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const start = new Date(fy, fm - 1, fd);
  const end   = new Date(ty, tm - 1, td);
  const dates: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ── component ─────────────────────────────────────────────────────────────────
interface BatchSlotGeneratorProps {
  trigger?: React.ReactNode;
}

export default function BatchSlotGenerator({ trigger }: BatchSlotGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // CREATE tab state
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("24:00");
  const [previewSlots, setPreviewSlots] = useState<ReturnType<typeof generateHourlySlots>>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // DELETE tab state
  const [delServiceId, setDelServiceId] = useState("");
  const [delDate, setDelDate] = useState<Date | undefined>(new Date());
  const [delConfirm, setDelConfirm] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const [delSuccess, setDelSuccess] = useState<string | null>(null);

  const { data: services = [], isLoading: servicesLoading } = useServices();
  const createSlotsBulk = useCreateSlotsBulk();
  const deleteSlotsByDate = useDeleteSlotsByDate();

  const today = localToday();

  // Set defaults when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setStartDate(new Date());
    setEndDate(new Date());
    setDelDate(new Date());
  }, [isOpen]);

  // Re-generate preview whenever inputs change
  const rebuildPreview = useCallback(() => {
    if (!selectedServiceId || !startDate || !endDate) { setPreviewSlots([]); return; }
    try {
      const sh = parseHour(startTime);
      const eh = endTime === "24:00" ? 24 : parseHour(endTime);
      if (sh >= eh) throw new Error("Start time must be before end time");
      if (eh - sh > 24) throw new Error("Range too large");

      const ds = format(startDate, "yyyy-MM-dd");
      const de = format(endDate, "yyyy-MM-dd");
      const dates = dateRange(ds, de);
      if (dates.length === 0) throw new Error("End date must be on or after start date");

      const all = dates.flatMap(d => generateHourlySlots(d, sh, eh));
      setPreviewSlots(all);
      setCreateError(null);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Invalid parameters");
      setPreviewSlots([]);
    }
  }, [selectedServiceId, startDate, endDate, startTime, endTime]);

  useEffect(() => { rebuildPreview(); }, [rebuildPreview]);

  // ── create handler ────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!selectedServiceId || previewSlots.length === 0) return;
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const slotsToInsert = previewSlots.map(s => ({
        service_id: selectedServiceId,
        start_time: s.start_time,
        end_time:   s.end_time,
        status:     "available" as const,
      }));
      await createSlotsBulk.mutateAsync(slotsToInsert);
      setCreateSuccess(`✓ Created ${previewSlots.length} slots successfully`);
      setTimeout(() => { setIsOpen(false); setCreateSuccess(null); }, 2000);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create slots");
    }
  };

  // ── delete handler ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!delServiceId || !delDate || !delConfirm) return;
    setDelError(null);
    setDelSuccess(null);
    try {
      const ds = format(delDate, "yyyy-MM-dd");
      await deleteSlotsByDate.mutateAsync({ serviceId: delServiceId, dateStr: ds });
      setDelSuccess("All slots for that service/date deleted.");
      setDelConfirm(false);
      setTimeout(() => setDelSuccess(null), 3000);
    } catch (e) {
      setDelError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  const formatDate = (ds: string) => {
    const [y, m, d] = ds.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  const slotsByDay = previewSlots.reduce<Record<string, typeof previewSlots>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});

  const slotsPerDay = previewSlots.length > 0
    ? previewSlots.length / Object.keys(slotsByDay).length
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button><Plus className="mr-2 h-4 w-4" />Manage Slots</Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Slot Manager</DialogTitle>
          <DialogDescription>Create or delete hourly slots for a service</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create">
          <TabsList className="w-full">
            <TabsTrigger value="create" className="flex-1">
              <Plus className="h-4 w-4 mr-2" />Create Slots
            </TabsTrigger>
            <TabsTrigger value="delete" className="flex-1">
              <Trash2 className="h-4 w-4 mr-2" />Delete Slots
            </TabsTrigger>
          </TabsList>

          {/* ── CREATE TAB ─────────────────────────────────────────────────── */}
          <TabsContent value="create" className="space-y-5 pt-4">
            {/* Service */}
            <div className="grid gap-2">
              <Label>Service</Label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder={servicesLoading ? "Loading…" : "Select a service"} />
                </SelectTrigger>
                <SelectContent>
                  {services.filter(s => s.is_active).map((s: Service) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} <span className="text-muted-foreground ml-1 text-xs capitalize">({s.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" />Start Date</Label>
                <DatePicker 
                  date={startDate} 
                  setDate={setStartDate} 
                />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" />End Date</Label>
                <DatePicker 
                  date={endDate} 
                  setDate={setEndDate} 
                />
              </div>
            </div>

            {/* Time range — hour picker only */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2"><Clock className="h-4 w-4" />Start Hour</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const label = `${String(i).padStart(2, "0")}:00`;
                      return <SelectItem key={i} value={label}>{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-2"><Clock className="h-4 w-4" />End Hour</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const h = i + 1;
                      const label = h === 24 ? "24:00" : `${String(h).padStart(2, "0")}:00`;
                      return <SelectItem key={h} value={label}>{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted rounded px-3 py-2">
              <strong>All slots are 60 minutes, round-hour only.</strong> e.g. 09:00→24:00 = 15 slots per day (09–10, 10–11 … 23–24). No gaps, no half-hours.
            </p>

            {/* Preview */}
            {previewSlots.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Preview</h4>
                  <span className="text-sm text-muted-foreground">
                    {previewSlots.length} slots · {Object.keys(slotsByDay).length} day(s) · {slotsPerDay}/day
                  </span>
                </div>
                <div className="border rounded-lg p-4 max-h-56 overflow-y-auto space-y-3">
                  {Object.entries(slotsByDay).slice(0, 3).map(([date, daySlots]) => (
                    <div key={date}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{formatDate(date)}</p>
                      <div className="flex flex-wrap gap-2">
                        {daySlots.map((s, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded bg-muted">
                            {formatTime(s.start_time)}–{formatTime(s.end_time)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.keys(slotsByDay).length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      … and {Object.keys(slotsByDay).length - 3} more days
                    </p>
                  )}
                </div>
              </div>
            )}

            {createError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            {createSuccess && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-300">{createSuccess}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={createSlotsBulk.isPending}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!selectedServiceId || previewSlots.length === 0 || createSlotsBulk.isPending}
              >
                {createSlotsBulk.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</>
                  : <><Plus className="h-4 w-4 mr-2" />Create {previewSlots.length} Slots</>
                }
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ── DELETE TAB ─────────────────────────────────────────────────── */}
          <TabsContent value="delete" className="space-y-5 pt-4">
            <Alert className="bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 dark:text-red-300 text-sm">
                This permanently deletes <strong>all</strong> slots for the selected service and date from the database. This cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="grid gap-2">
              <Label>Service</Label>
              <Select value={delServiceId} onValueChange={v => { setDelServiceId(v); setDelConfirm(false); }}>
                <SelectTrigger>
                  <SelectValue placeholder={servicesLoading ? "Loading…" : "Select a service"} />
                </SelectTrigger>
                <SelectContent>
                  {services.filter(s => s.is_active).map((s: Service) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} <span className="text-muted-foreground ml-1 text-xs capitalize">({s.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" />Date to Delete</Label>
              <DatePicker 
                date={delDate} 
                setDate={v => { setDelDate(v); setDelConfirm(false); }} 
              />
            </div>

            {delServiceId && delDate && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <input
                  id="del-confirm"
                  type="checkbox"
                  checked={delConfirm}
                  onChange={e => setDelConfirm(e.target.checked)}
                  className="h-4 w-4 accent-red-600"
                />
                <label htmlFor="del-confirm" className="text-sm text-red-700 dark:text-red-300 cursor-pointer">
                  I understand this will delete all slots for <strong>{services.find(s => s.id === delServiceId)?.name}</strong> on <strong>{delDate ? delDate.toLocaleDateString() : ""}</strong> permanently.
                </label>
              </div>
            )}

            {delError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{delError}</AlertDescription>
              </Alert>
            )}
            {delSuccess && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-300">{delSuccess}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={deleteSlotsByDate.isPending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!delServiceId || !delDate || !delConfirm || deleteSlotsByDate.isPending}
              >
                {deleteSlotsByDate.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting…</>
                  : <><Trash2 className="h-4 w-4 mr-2" />Delete All Slots</>
                }
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}