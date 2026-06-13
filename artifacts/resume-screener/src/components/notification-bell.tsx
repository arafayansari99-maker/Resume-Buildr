import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, CheckCheck, Trash2, X, CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";
import { useNotifications, type Notification, type NotifType } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Icon & colour per type ──────────────────────────────────────────────────

function typeIcon(type: NotifType) {
  switch (type) {
    case "success": return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
    case "error":   return <XCircle      className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
    case "warning": return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />;
    case "info":    return <Info          className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />;
  }
}

function typeBorder(type: NotifType) {
  switch (type) {
    case "success": return "border-l-emerald-500/60";
    case "error":   return "border-l-destructive/60";
    case "warning": return "border-l-amber-400/60";
    case "info":    return "border-l-blue-400/60";
  }
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

// ── Single notification row ─────────────────────────────────────────────────

function NotifRow({ notif }: { notif: Notification }) {
  const { markRead, removeNotification } = useNotifications();

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 border-l-2 transition-colors",
        typeBorder(notif.type),
        !notif.read ? "bg-primary/5" : "bg-transparent"
      )}
      onClick={() => markRead(notif.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && markRead(notif.id)}
    >
      {typeIcon(notif.type)}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-snug", !notif.read ? "font-semibold" : "font-medium text-muted-foreground")}>
          {notif.title}
        </p>
        {notif.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-wide">{relativeTime(notif.timestamp)}</p>
      </div>
      <button
        className="opacity-0 group-hover/row:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        onClick={e => { e.stopPropagation(); removeNotification(notif.id); }}
        aria-label="Remove"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Bell button + panel ─────────────────────────────────────────────────────

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const prevUnread = useRef(unreadCount);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 800);
      return () => clearTimeout(t);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(v => !v);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={cn(
          "relative flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all",
          open && "bg-sidebar-accent text-foreground"
        )}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        {unreadCount > 0
          ? <BellRing className={cn("h-5 w-5", pulse && "animate-bounce")} />
          : <Bell className="h-5 w-5" />
        }
        {unreadCount > 0 && (
          <span className={cn(
            "absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-0.5 tabular-nums leading-none",
            pulse && "animate-ping-once"
          )}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-10 z-50 w-80 bg-popover border border-border rounded-lg shadow-xl overflow-hidden flex flex-col"
          style={{ maxHeight: "min(480px, 80vh)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-primary/20 text-primary rounded-full px-2 py-0.5 font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={markAllRead} title="Mark all read">
                  <CheckCheck className="h-3.5 w-3.5" />
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearAll} title="Clear all">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <Bell className="h-8 w-8 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 overflow-auto">
              <div className="divide-y divide-border/40">
                {notifications.map(n => (
                  <div key={n.id} className="group/row">
                    <NotifRow notif={n} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
