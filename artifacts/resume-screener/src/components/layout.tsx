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
    <div className="app-layout">
      <motion.aside
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="app-sidebar glass-panel"
      >
        <div className="app-sidebar__header">
          <div className="brand-mark">
            <span className="font-mono">R</span>
          </div>
          <div>
            <div className="text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground/80">
              AI Hiring OS
            </div>
            <div className="font-serif text-lg font-semibold tracking-tight text-foreground">
              RecruitIntel
            </div>
          </div>
          <NotificationBell />
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
