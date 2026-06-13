import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { playSound, type SoundType } from "@/lib/notification-sounds";

export type NotifType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (opts: { type: NotifType; title: string; message?: string; sound?: boolean }) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
}

const STORAGE_KEY = "recruitintel:notifications";
const MAX_NOTIFS = 50;

function load(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: Notification[] = JSON.parse(raw);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return parsed.filter(n => n.timestamp > oneDayAgo).slice(0, MAX_NOTIFS);
  } catch {
    return [];
  }
}

function save(notifs: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, MAX_NOTIFS)));
  } catch {}
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(load);

  useEffect(() => {
    save(notifications);
  }, [notifications]);

  const addNotification = useCallback(
    ({
      type,
      title,
      message,
      sound = true,
    }: {
      type: NotifType;
      title: string;
      message?: string;
      sound?: boolean;
    }) => {
      const notif: Notification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        title,
        message,
        timestamp: Date.now(),
        read: false,
      };
      setNotifications(prev => [notif, ...prev].slice(0, MAX_NOTIFS));
      if (sound) playSound(type as SoundType);
    },
    []
  );

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAllRead, markRead, clearAll, removeNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
