import React from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Files,
  Briefcase,
  PlaySquare,
  Trophy,
  History,
  GitCompare,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/hooks/use-auth";

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
  const { user, signOut } = useAuth();

  return (
    <div className="app-layout">
      <motion.aside
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="app-sidebar glass-panel"
      >
        <div className="app-sidebar__header">
          <div className="brand-mark">
            <img src="/logo.svg?v=2" alt="RecruitIntel logo" />
          </div>
          <div>
            <div className="text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground/80">
              AI Hiring OS
            </div>
            <div className="font-serif text-lg font-semibold tracking-tight text-foreground">
              RecruitIntel
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-foreground"
              onClick={() => void signOut()}
              title={`Sign out ${user?.email ?? ""}`}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="app-sidebar__nav">
          <nav className="nav-stack">
            {navigation.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "nav-item",
                    isActive && "nav-item--active",
                  )}
                >
                  <item.icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </motion.aside>

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
        className="app-main"
      >
        <div className="content-surface">
          <div className="content-surface__inner">{children}</div>
        </div>
      </motion.main>
    </div>
  );
}
