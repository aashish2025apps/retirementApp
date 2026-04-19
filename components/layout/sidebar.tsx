"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  User,
  Briefcase,
  PiggyBank,
  CreditCard,
  GraduationCap,
  Heart,
  Shield,
  Target,
  SlidersHorizontal,
  BarChart3,
  RefreshCcw,
  GitCompare,
  FolderOpen,
  Settings,
  TrendingUp,
  Banknote,
} from "lucide-react";

const navGroups = [
  {
    label: "PLANNING",
    items: [
      { href: "/dashboard/profile", icon: User, label: "Profile" },
      { href: "/dashboard/income", icon: Briefcase, label: "Income" },
      { href: "/dashboard/assets", icon: PiggyBank, label: "Assets" },
      { href: "/dashboard/debts", icon: CreditCard, label: "Debts" },
      { href: "/dashboard/education", icon: GraduationCap, label: "Education" },
      { href: "/dashboard/healthcare", icon: Heart, label: "Healthcare" },
      { href: "/dashboard/social-security", icon: Shield, label: "Social Security" },
      { href: "/dashboard/windfalls", icon: Banknote, label: "Future Income" },
      { href: "/dashboard/goals", icon: Target, label: "Goals" },
      { href: "/dashboard/assumptions", icon: SlidersHorizontal, label: "Assumptions" },
    ],
  },
  {
    label: "ANALYSIS",
    items: [
      { href: "/dashboard/results", icon: BarChart3, label: "Results" },
      { href: "/dashboard/roth", icon: RefreshCcw, label: "Roth Planner" },
      { href: "/dashboard/scenarios", icon: GitCompare, label: "Scenarios" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { href: "/dashboard/saved-plans", icon: FolderOpen, label: "Saved Plans" },
      { href: "/dashboard/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm">
          <TrendingUp className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold tracking-tight text-sidebar-foreground">RetireWise</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "mx-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                    active
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
