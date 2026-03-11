'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  CheckSquare,
  ChevronLeft,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Circulars", url: "/circulars", icon: FileText },
  { title: "Compliance Chat", url: "/chat", icon: MessageSquare },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  // { title: "Alerts", url: "/chat", icon: Bell },
  // { title: "Settings", url: "/chat", icon: Settings },
];

const recentCirculars = [
  { id: 1, title: "Digital Lending Guidelines Update", ref: "RBI/2024-25/48" },
  { id: 2, title: "KYC Master Direction Amendment", ref: "RBI/2024-25/52" },
  { id: 3, title: "Cybersecurity Framework for Banks", ref: "RBI/2024-25/55" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const userEmail = user?.email || "Not signed in";
  const userRole = user?.role || "Compliance User";
  const userInitial = useMemo(
    () => (userEmail && userEmail !== "Not signed in" ? userEmail.slice(0, 1).toUpperCase() : "U"),
    [userEmail]
  );

  return (
    <aside
      className={
        "sticky top-0 h-screen bg-pampas border-r border-border-subtle flex flex-col transition-all duration-150 flex-shrink-0 " +
        (collapsed ? "w-16" : "w-[260px]")
      }
    >
      <div className="flex items-center gap-2 px-5 py-5 border-b border-border-subtle">
        <Image src="/logo14.png" alt="RegIntel logo" width={28} height={28} className="rounded-sm flex-shrink-0" />
        {!collapsed && (
          <Link href="/">
            <span className="text-lg font-semibold text-foreground tracking-tight">
              RegIntel
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-cloudy hover:text-foreground transition-colors duration-150"
        >
          <ChevronLeft
            className={
              "h-4 w-4 transition-transform duration-150 " +
              (collapsed ? "rotate-180" : "")
            }
          />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.url;
          return (
            <Link
              key={item.title}
              href={item.url}
              className={
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 " +
                (active
                  ? "bg-background text-foreground font-medium border-l-2 border-crail"
                  : "text-cloudy hover:text-foreground hover:bg-background")
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 py-4 border-t border-border-subtle">
          <p className="text-xs font-medium text-cloudy uppercase tracking-wide mb-3">
            Recent
          </p>
          <div className="space-y-2">
            {recentCirculars.map((c) => (
              <Link
                key={c.id}
                href="/chat"
                className="block text-xs text-foreground hover:text-crail transition-colors duration-150 truncate"
              >
                {c.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-4 border-t border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-pampas border border-border-subtle flex items-center justify-center text-xs font-medium text-crail flex-shrink-0">
            {userInitial}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{userEmail}</p>
              <p className="text-xs text-cloudy truncate">{userRole}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
