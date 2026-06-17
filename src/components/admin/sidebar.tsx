"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Activity,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Map,
  ShoppingCart,
  FileText,
  Ticket,
  BarChart,
  Trophy,
  MessageCircle,
} from "lucide-react";

const navItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Inventory",
    href: "/admin/inventory",
    icon: Package,
  },
  {
    name: "Services",
    href: "/admin/services",
    icon: Activity,
  },
  {
    name: "Floor Map",
    href: "/admin/floor-map",
    icon: Map,
  },
  {
    name: "POS System",
    href: "/admin/pos",
    icon: ShoppingCart,
  },
  {
    name: "Championships",
    href: "/admin/championships",
    icon: Trophy,
  },
  {
    name: "Memberships",
    href: "/admin/memberships",
    icon: Users,
  },
  {
    name: "Transactions",
    href: "/admin/transactions",
    icon: CreditCard,
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: BarChart,
  },
  {
    name: "Settlement",
    href: "/admin/settlement",
    icon: FileText,
  },
  {
    name: "Coupons",
    href: "/admin/coupons",
    icon: Ticket,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
  {
    name: "WhatsApp",
    href: "/admin/whatsapp",
    icon: MessageCircle,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-sidebar-foreground">
          RR Downtown
        </h1>
        <p className="text-sm text-sidebar-foreground/60 mt-1">Admin Panel</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}