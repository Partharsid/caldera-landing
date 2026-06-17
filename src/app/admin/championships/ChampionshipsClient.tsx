"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Plus, Calendar, Users, IndianRupee, Search } from "lucide-react";
import { useChampionships, useCreateChampionship, useUpdateChampionship, useDeleteChampionship } from "@/hooks/useChampionships";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
  open: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  completed: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  round_robin: "Round Robin",
  league: "League",
};

const EMPTY_FORM = {
  name: "",
  description: "",
  sport_type: "",
  service_id: "",
  registration_fee: "",
  prize_pool: "",
  first_prize: "",
  second_prize: "",
  third_prize: "",
  max_participants: "16",
  min_team_size: "1",
  max_team_size: "1",
  format: "single_elimination" as const,
  rules: "",
  start_date: "",
  end_date: "",
  registration_deadline: "",
};

export default function ChampionshipsClient() {
  const { data: championships = [], isLoading, error } = useChampionships();
  const createChampionship = useCreateChampionship();
  const updateChampionship = useUpdateChampionship();
  const deleteChampionship = useDeleteChampionship();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = championships.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalOpen = championships.filter((c) => c.status === "open").length;
  const totalActive = championships.filter((c) => c.status === "in_progress").length;
  const totalRevenue = championships.reduce((s, c) => s + c.current_participants * c.registration_fee, 0);

  const handleCreate = async () => {
    if (!form.name || !form.sport_type || !form.start_date || !form.registration_fee) return;
    await createChampionship.mutateAsync({
      name: form.name,
      description: form.description || undefined,
      sport_type: form.sport_type,
      service_id: form.service_id || undefined,
      registration_fee: parseFloat(form.registration_fee),
      prize_pool: parseFloat(form.prize_pool) || 0,
      first_prize: parseFloat(form.first_prize) || 0,
      second_prize: parseFloat(form.second_prize) || 0,
      third_prize: form.third_prize ? parseFloat(form.third_prize) : undefined,
      max_participants: parseInt(form.max_participants),
      min_team_size: parseInt(form.min_team_size) || 1,
      max_team_size: parseInt(form.max_team_size) || 1,
      format: form.format,
      rules: form.rules || undefined,
      start_date: form.start_date,
      end_date: form.end_date || undefined,
      registration_deadline: form.registration_deadline || undefined,
    });
    setForm(EMPTY_FORM);
    setIsCreateOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteChampionship.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Championships</h1>
          <p className="text-muted-foreground">Create and manage tournaments, leagues, and competitions</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Championship
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-500" />
              <div className="text-2xl font-bold">{totalOpen}</div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Open for Registration</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div className="text-2xl font-bold">{totalActive}</div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-purple-500" />
              <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Total Registration Revenue</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Championships</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search championships..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
              Error: {(error as Error).message}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No championships yet</p>
              <p className="text-sm mt-1">Create your first championship to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((champ) => (
                <Link key={champ.id} href={`/admin/championships/${champ.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{champ.name}</h3>
                        <Badge className={cn("text-xs", STATUS_COLORS[champ.status])}>
                          {champ.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {FORMAT_LABELS[champ.format]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground flex-wrap">
                        <span>{champ.sport_type}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(champ.start_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {champ.current_participants}/{champ.max_participants}
                        </span>
                        {champ.registration_fee > 0 && (
                          <span className="flex items-center gap-1">
                            <IndianRupee className="h-3.5 w-3.5" />
                            {formatPrice(champ.registration_fee)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {champ.prize_pool > 0 && (
                        <span className="text-sm font-semibold text-primary">
                          ₹{champ.prize_pool.toLocaleString("en-IN")} pool
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Championship</DialogTitle>
            <DialogDescription>Set up a tournament, league, or competition for your arcade.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Championship Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Summer Pickleball Cup" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Sport / Game Type</Label>
                <Input value={form.sport_type} onChange={(e) => setForm({ ...form, sport_type: e.target.value })} placeholder="e.g. Pickleball, Table Tennis" />
              </div>
              <div className="grid gap-2">
                <Label>Format</Label>
                <Select value={form.format} onValueChange={(v: any) => setForm({ ...form, format: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_elimination">Single Elimination</SelectItem>
                    <SelectItem value="double_elimination">Double Elimination</SelectItem>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="league">League</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the championship..." rows={2} />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Registration Deadline</Label>
                <Input type="date" value={form.registration_deadline} onChange={(e) => setForm({ ...form, registration_deadline: e.target.value })} />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Registration Fee (₹)</Label>
                <Input type="number" min="0" step="0.01" value={form.registration_fee} onChange={(e) => setForm({ ...form, registration_fee: e.target.value })} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>Max Participants</Label>
                <Input type="number" min="2" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Prize Pool (₹)</Label>
                <Input type="number" min="0" value={form.prize_pool} onChange={(e) => setForm({ ...form, prize_pool: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>1st Prize (₹)</Label>
                <Input type="number" min="0" value={form.first_prize} onChange={(e) => setForm({ ...form, first_prize: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>2nd Prize (₹)</Label>
                <Input type="number" min="0" value={form.second_prize} onChange={(e) => setForm({ ...form, second_prize: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>3rd Prize (₹)</Label>
                <Input type="number" min="0" value={form.third_prize} onChange={(e) => setForm({ ...form, third_prize: e.target.value })} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Min Team Size</Label>
                <Input type="number" min="1" value={form.min_team_size} onChange={(e) => setForm({ ...form, min_team_size: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Max Team Size</Label>
                <Input type="number" min="1" value={form.max_team_size} onChange={(e) => setForm({ ...form, max_team_size: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Rules & Additional Info</Label>
              <Textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} placeholder="Tournament rules, guidelines..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createChampionship.isPending || !form.name || !form.sport_type || !form.start_date}>
              {createChampionship.isPending ? "Creating..." : "Create Championship"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Championship</DialogTitle>
            <DialogDescription>This will permanently delete this championship and all associated data. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}