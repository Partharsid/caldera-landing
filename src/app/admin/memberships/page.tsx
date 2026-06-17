"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemberships, useCreateMembership, useUpdateMembership, useDeleteMembership, useToggleMembership } from "@/hooks/useMemberships";
import { type Membership } from "@/lib/supabase";
import { formatPrice } from "@/lib/pricing";
import { Plus, Pencil, Trash2, Users, CheckCircle2, XCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY_FORM = { user_phone: "", pass_name: "", hours_remaining: "", is_active: true };

export default function MembershipsPage() {
  const { data: memberships = [], isLoading, error } = useMemberships();
  const createMembership = useCreateMembership();
  const updateMembership = useUpdateMembership();
  const deleteMembership = useDeleteMembership();
  const toggleMembership = useToggleMembership();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Membership | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Membership | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const totalActive = memberships.filter((m) => m.is_active).length;
  const totalHours = memberships.reduce((s, m) => s + Number(m.hours_remaining), 0);

  /* ── Create ── */
  const handleCreate = async () => {
    if (!form.user_phone || !form.pass_name || form.hours_remaining === "") return;
    await createMembership.mutateAsync({
      user_phone: form.user_phone,
      pass_name: form.pass_name,
      hours_remaining: parseFloat(form.hours_remaining),
      is_active: form.is_active,
    });
    setForm(EMPTY_FORM);
    setCreateOpen(false);
  };

  /* ── Edit ── */
  const openEdit = (m: Membership) => {
    setEditTarget(m);
    setEditForm({ user_phone: m.user_phone, pass_name: m.pass_name, hours_remaining: String(m.hours_remaining), is_active: m.is_active });
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    await updateMembership.mutateAsync({
      id: editTarget.id,
      updates: { user_phone: editForm.user_phone, pass_name: editForm.pass_name, hours_remaining: parseFloat(editForm.hours_remaining), is_active: editForm.is_active },
    });
    setEditTarget(null);
  };

  /* ── Toggle active ── */
  const handleToggle = (m: Membership) => {
    toggleMembership.mutate({ id: m.id, is_active: !m.is_active });
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMembership.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Memberships</h1>
          <p className="text-muted-foreground">Manage member passes and hour balances</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Add Membership
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><div className="text-2xl font-bold">{memberships.length}</div></div>
          <p className="text-sm text-muted-foreground">Total Memberships</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /><div className="text-2xl font-bold">{totalActive}</div></div>
          <p className="text-sm text-muted-foreground">Active Passes</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">{totalHours.toFixed(1)} hrs</div>
          <p className="text-sm text-muted-foreground">Total Hours Remaining</p>
        </CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
          <CardDescription>{memberships.length} membership{memberships.length !== 1 ? "s" : ""} registered</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">Error: {(error as Error).message}</div>
          ) : memberships.length === 0 ? (
            <div className="text-center py-16"><Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No memberships yet. Add the first one.</p></div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Phone</TableHead>
                    <TableHead className="whitespace-nowrap">Pass Name</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Hours Left</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Created</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-medium">{m.user_phone}</span></div>
                      </TableCell>
                      <TableCell>{m.pass_name}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-semibold tabular-nums", Number(m.hours_remaining) <= 1 ? "text-red-500" : Number(m.hours_remaining) <= 5 ? "text-amber-500" : "text-green-600")}>
                          {Number(m.hours_remaining).toFixed(1)} hrs
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch id={`toggle-${m.id}`} checked={m.is_active} onCheckedChange={() => handleToggle(m)} disabled={toggleMembership.isPending} />
                          <Badge variant={m.is_active ? "default" : "secondary"} className={cn("text-xs", m.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : "")}>
                            {m.is_active ? <><CheckCircle2 className="h-3 w-3 mr-1" />Active</> : <><XCircle className="h-3 w-3 mr-1" />Inactive</>}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(m)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Membership</DialogTitle>
            <DialogDescription>Assign a pass to a member phone number.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create_phone">Phone Number</Label>
              <Input id="create_phone" placeholder="+91 XXXXXXXXXX" value={form.user_phone} onChange={(e) => setForm((f) => ({ ...f, user_phone: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create_pass">Pass Name</Label>
              <Input id="create_pass" placeholder="e.g. Monthly 20hr Pass" value={form.pass_name} onChange={(e) => setForm((f) => ({ ...f, pass_name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create_hours">Hours Remaining</Label>
              <Input id="create_hours" type="number" step="0.5" min="0" placeholder="20" value={form.hours_remaining} onChange={(e) => setForm((f) => ({ ...f, hours_remaining: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="create_active" checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label htmlFor="create_active">Active immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMembership.isPending}>{createMembership.isPending ? "Creating…" : "Create Membership"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Membership</DialogTitle>
            <DialogDescription>Update the member&apos;s pass details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_phone">Phone Number</Label>
              <Input id="edit_phone" value={editForm.user_phone} onChange={(e) => setEditForm((f) => ({ ...f, user_phone: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_pass">Pass Name</Label>
              <Input id="edit_pass" value={editForm.pass_name} onChange={(e) => setEditForm((f) => ({ ...f, pass_name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_hours">Hours Remaining</Label>
              <Input id="edit_hours" type="number" step="0.5" min="0" value={editForm.hours_remaining} onChange={(e) => setEditForm((f) => ({ ...f, hours_remaining: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="edit_active" checked={editForm.is_active} onCheckedChange={(v) => setEditForm((f) => ({ ...f, is_active: v }))} />
              <Label htmlFor="edit_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMembership.isPending}>{updateMembership.isPending ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Membership</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the membership for <strong>{deleteTarget?.user_phone}</strong> ({deleteTarget?.pass_name})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMembership.isPending}>{deleteMembership.isPending ? "Deleting…" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
