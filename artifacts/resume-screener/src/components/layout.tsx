import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Files,
  Briefcase,
  PlaySquare,
  Trophy,
  History,
  GitCompare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notification-bell";

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Resumes", href: "/resumes", icon: Files },
  { name: "Jobs", href: "/jobs", icon: Briefcase },
  { name: "Analyze", href: "/analyze", icon: PlaySquare },
  { name: "Rank", href: "/rank", icon: Trophy },
  { name: "Compare", href: "/compare", icon: GitCompare },
  { name: "Results", href: "/results", icon: History },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-background dark">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 border-r border-border bg-sidebar shrink-0 flex flex-col">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2 font-serif font-bold text-lg tracking-tight">
            <div className="size-6 bg-primary text-primary-foreground flex items-center justify-center text-sm">
              <span className="font-mono">R</span>
            </div>
            RecruitIntel
          </div>
          <NotificationBell />
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="space-y-1 px-4 text-sm font-medium">
            {navigation.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn("size-4", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
