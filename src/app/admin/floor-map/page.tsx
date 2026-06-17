"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Map, Grid3x3, Clock, AlertCircle, RefreshCw, Plus, Calendar as CalendarIcon } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import FloorMapGrid from "@/components/admin/floor-map-grid";
import MasterSlotController from "@/components/admin/master-slot-controller";
import BatchSlotGenerator from "@/components/admin/batch-slot-generator";
import { useSlotsForDate } from "@/hooks/useSlots";
import { type Slot, type Service } from "@/lib/supabase";

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function FloorMapPage() {
  const [selectedDate, setSelectedDate] = useState(localToday());
  const { slots, services, isLoading, error, refetch } = useSlotsForDate(selectedDate);
  
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isControllerOpen, setIsControllerOpen] = useState(false);

  const handleSlotClick = (slot: Slot) => {
    setSelectedSlot(slot);
    setIsControllerOpen(true);
  };

  // Stats calculations
  const totalSlots = slots.length;
  const availableSlots = slots.filter(s => s.status === 'available').length;
  const occupiedSlots = slots.filter(s => s.status === 'booked').length;
  const blockedSlots = slots.filter(s => s.status === 'blocked').length;

  const getServiceTypeCount = (type: Service['type']) => {
    return services.filter(s => s.type === type).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Floor Map</h1>
          <p className="text-muted-foreground">
            Visual control panel for arcade slots
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Picker */}
          <div className="flex items-center">
            <DatePicker 
              date={selectedDate ? parseLocalDate(selectedDate) : undefined} 
              setDate={(date) => setSelectedDate(date ? format(date, "yyyy-MM-dd") : localToday())}
              placeholder="Select date"
            />
          </div>

          <BatchSlotGenerator trigger={<Button><Plus className="mr-2 h-4 w-4" />Manage Slots</Button>} />
          
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Grid3x3 className="h-8 w-8 mx-auto text-muted-foreground animate-pulse" />
            <p className="mt-2 text-muted-foreground">Loading floor map...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error loading floor map: {(error as Error).message}</p>
          <Button variant="outline" className="mt-2" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSlots}</div>
                <p className="text-xs text-muted-foreground">For selected date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Available</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{availableSlots}</div>
                <p className="text-xs text-muted-foreground">Ready for booking</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Occupied</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{occupiedSlots}</div>
                <p className="text-xs text-muted-foreground">Games in progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Blocked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{blockedSlots}</div>
                <p className="text-xs text-muted-foreground">Under maintenance</p>
              </CardContent>
            </Card>
          </div>

          {/* Service Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Service Type Distribution</CardTitle>
              <CardDescription>Breakdown of available services by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div>
                    <p className="font-medium">Courts</p>
                    <p className="text-2xl font-bold">{getServiceTypeCount('court')}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    Court
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div>
                    <p className="font-medium">Machines</p>
                    <p className="text-2xl font-bold">{getServiceTypeCount('machine')}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    Machine
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <div>
                    <p className="font-medium">Tables</p>
                    <p className="text-2xl font-bold">{getServiceTypeCount('table')}</p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                    Table
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Floor Map Grid */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Arcade Floor Map</CardTitle>
                  <CardDescription>
                    Showing slots for {selectedDate}. Click any slot to control its status.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-sm">Occupied</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">Blocked</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {slots.length > 0 ? (
                <FloorMapGrid
                  slots={slots}
                  services={services}
                  onSlotClick={handleSlotClick}
                />
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium">No Slots Found</h3>
                  <p className="text-muted-foreground mt-1">
                    There are no slots generated for {selectedDate}.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => {
                    // Quick-action to open generator could go here, but they can just click the top button.
                    document.querySelector<HTMLButtonElement>('[data-dialog-trigger]')?.click();
                  }}>
                    Open Slot Manager
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Master Slot Controller Modal */}
      {selectedSlot && (
        <MasterSlotController
          slot={selectedSlot}
          service={services.find(s => s.id === selectedSlot.service_id)}
          isOpen={isControllerOpen}
          onOpenChange={setIsControllerOpen}
          onSuccess={() => {
            setIsControllerOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}