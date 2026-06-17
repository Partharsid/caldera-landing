"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Coupon } from "@/lib/supabase";
import { formatPrice } from "@/lib/pricing";
import {
  getCouponsAction,
  createCouponAction,
  updateCouponAction,
  deleteCouponAction,
} from "../actions/coupons";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    discount_type: "fixed" as "fixed" | "percentage",
    discount_amount: "",
    max_uses: "",
    expires_at: undefined as Date | undefined,
  });

  const loadCoupons = async () => {
    try {
      const data = await getCouponsAction();
      setCoupons(data);
    } catch (error) {
      console.error("Failed to load coupons:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: formData.code,
        discount_type: formData.discount_type,
        discount_amount: parseFloat(formData.discount_amount),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        is_active: true,
        expires_at: formData.expires_at ? format(formData.expires_at, "yyyy-MM-dd'T'23:59:59") : null,
      };

      if (editingCoupon) {
        await updateCouponAction(editingCoupon.id, payload);
      } else {
        await createCouponAction(payload);
      }
      setIsModalOpen(false);
      loadCoupons();
    } catch (error: any) {
      alert(error.message || "Failed to save coupon");
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await updateCouponAction(coupon.id, { is_active: !coupon.is_active });
      loadCoupons();
    } catch (error) {
      console.error("Failed to toggle coupon:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await deleteCouponAction(id);
      loadCoupons();
    } catch (error) {
      console.error("Failed to delete coupon:", error);
    }
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_amount: coupon.discount_amount.toString(),
      max_uses: coupon.max_uses?.toString() || "",
      expires_at: coupon.expires_at ? new Date(coupon.expires_at) : undefined,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Coupons</h2>
          <p className="text-muted-foreground">
            Create and manage discount codes for your customers
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingCoupon(null);
            setFormData({ code: "", discount_type: "fixed", discount_amount: "", max_uses: "", expires_at: undefined });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create New Coupon"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Coupon Code</label>
                <Input
                  required
                  placeholder="e.g. SUMMER10"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount Type</label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: "fixed" | "percentage") => 
                      setFormData({ ...formData, discount_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount Amount</label>
                  <Input
                    required
                    type="number"
                    min="0"
                    step={formData.discount_type === "percentage" ? "1" : "0.01"}
                    placeholder={formData.discount_type === "percentage" ? "10" : "100"}
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Uses (Optional)</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Leave empty for unlimited"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expiry Date (Optional)</label>
                <DatePicker 
                  date={formData.expires_at} 
                  setDate={(date) => setFormData({ ...formData, expires_at: date })}
                  placeholder="No expiration"
                />
              </div>
              <Button type="submit" className="w-full">
                {editingCoupon ? "Update Coupon" : "Create Coupon"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-white dark:bg-zinc-950 overflow-x-auto pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Code</TableHead>
              <TableHead className="whitespace-nowrap">Discount</TableHead>
              <TableHead className="whitespace-nowrap">Uses</TableHead>
              <TableHead className="whitespace-nowrap">Created</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading coupons...
                </TableCell>
              </TableRow>
            ) : coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No coupons found. Create your first discount code!
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-medium">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      {coupon.code}
                    </div>
                  </TableCell>
                  <TableCell>
                    {coupon.discount_type === "fixed" 
                      ? formatPrice(coupon.discount_amount)
                      : `${coupon.discount_amount}% OFF`}
                  </TableCell>
                  <TableCell>
                    {coupon.current_uses} / {coupon.max_uses || "∞"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(coupon.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={coupon.is_active}
                      onCheckedChange={() => handleToggleActive(coupon)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(coupon)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(coupon.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
