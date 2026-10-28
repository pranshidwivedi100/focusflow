import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  CheckCircle2,
  Volume2,
  VolumeX,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Mail,
  Calendar,
  Bug,
  AlertOctagon,
  Laptop,
} from "lucide-react";
import { soundEngine } from "../utils/audio";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from "../utils/browserNotifications";

interface NotificationItem {
  id: string;
  title: string;
  category: "Email Action" | "Meeting" | "Blocker" | "Bug" | string;
  urgencyScore: number;
  importanceScore: number;
  isUrgent: boolean;
  isP0: boolean;
  dueAt: string | Date | null;
  createdAt: string | Date;
  nativeUrl: string | null;
  read: boolean;
}

interface NotificationBucket {
  bucket: "due_in_1_hour" | "due_in_5_hours" | "due_today" | "due_tomorrow";
  count: number;
  tasks: Array<{ id: string; title: string; due_at: string | Date | null }>;
}

interface NotificationsPayload {
  unreadCount: number;
  unreadTotalCount: number;
  p0Count: number;
  items: NotificationItem[];
  notifications: NotificationBucket[];
}

const bucketLabels: Record<NotificationBucket["bucket"], string> = {
  due_in_1_hour: "Due in 1 hour",
  due_in_5_hours: "Due in 5 hours",
  due_today: "Due today",
  due_tomorrow: "Due tomorrow",
};

interface NotificationsMenuProps {
  onTaskCompleted?: (taskId: string) => void;
}

const NotificationsMenu: React.FC<NotificationsMenuProps> = ({ onTaskCompleted }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"urgent" | "all" | "deadlines">("urgent");

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [p0Count, setP0Count] = useState<number>(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [buckets, setBuckets] = useState<NotificationBucket[]>([]);

  const [soundOn, setSoundOn] = useState<boolean>(soundEngine.isEnabled());
  const [desktopPerm, setDesktopPerm] = useState<NotificationPermission>(
    getNotificationPermission(),
  );

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        credentials: "include",
      });
      if (!response.ok) return;

      const payload = (await response.json()) as NotificationsPayload;
      setUnreadCount(payload.unreadCount ?? 0);
      setP0Count(payload.p0Count ?? 0);
      setItems(payload.items ?? []);
      setBuckets(payload.notifications ?? []);
    } catch (err) {
      console.warn("[NotificationsMenu] Failed to fetch notifications:", err);
    }
  }, []);

  // Poll notifications periodically (every 15 seconds) so live badge updates seamlessly
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      fetchNotifications().finally(() => setLoading(false));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ all: true }),
      });
      setUnreadCount(0);
      setP0Count(0);
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch (err) {
      console.warn("[NotificationsMenu] Mark all read failed:", err);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "completed" }),
      });

      if (response.ok) {
        soundEngine.playSuccessChime();
        // Immediately remove from pending items and decrement unread badge count
        setItems((prev) => prev.filter((i) => i.id !== taskId));
        setUnreadCount((prev) => Math.max(0, prev - 1));
        if (onTaskCompleted) {
          onTaskCompleted(taskId);
        }
      }
    } catch (err) {
      console.warn("[NotificationsMenu] Complete task failed:", err);
    }
  };

  const toggleSound = () => {
    const next = soundEngine.toggle();
    setSoundOn(next);
  };

  const handleEnableDesktop = async () => {
    const granted = await requestNotificationPermission();
    setDesktopPerm(granted ? "granted" : "denied");
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Email Action":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
            <Mail className="h-3 w-3" />
            Email Action
          </span>
        );
      case "Meeting":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
            <Calendar className="h-3 w-3" />
            Meeting
          </span>
        );
      case "Bug":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <Bug className="h-3 w-3" />
            Bug
          </span>
        );
      case "Blocker":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
            <AlertOctagon className="h-3 w-3" />
            Blocker
          </span>
        );
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === "urgent") return item.isUrgent;
    return true;
  });

  return (
    <div className="relative">
      <button
        type="button"
        id="notification-bell-btn"
        onClick={toggleOpen}
        aria-label="Open notifications"
        className={`relative rounded-full border bg-white p-2.5 shadow-sm transition-all hover:bg-slate-50 cursor-pointer ${
          p0Count > 0
            ? "border-rose-400 text-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.35)]"
            : unreadCount > 0
              ? "border-amber-300 text-amber-600 shadow-sm"
              : "border-slate-200 text-slate-600"
        }`}
      >
        <Bell className={`h-4.5 w-4.5 ${unreadCount > 0 ? "animate-wiggle" : ""}`} />

        {/* Live Unread Badge */}
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-bold text-white shadow-sm ${
              p0Count > 0
                ? "bg-rose-600 ring-2 ring-white animate-pulse"
                : "bg-amber-500 ring-2 ring-white"
            }`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-center-dropdown"
          className="absolute right-0 mt-3 w-96 max-w-[calc(100vw-2rem)] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl z-50 animate-dropdown"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Alerts & Signals
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                  {unreadCount} urgent
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSound}
                title={soundOn ? "Mute alert chimes" : "Unmute alert chimes"}
                className={`rounded-lg p-1.5 text-xs transition cursor-pointer ${
                  soundOn
                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                }`}
              >
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Mark Read
              </button>
            </div>
          </div>

          {/* Desktop Permission Banner (if not yet granted) */}
          {isNotificationSupported() && desktopPerm !== "granted" && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-50/80 border border-blue-100 p-2.5 text-xs text-blue-800">
              <div className="flex items-center gap-2">
                <Laptop className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="font-medium text-[11px]">Enable desktop alerts?</span>
              </div>
              <button
                type="button"
                onClick={handleEnableDesktop}
                className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
              >
                Allow
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("urgent")}
              className={`flex-1 rounded-lg py-1.5 font-semibold transition cursor-pointer ${
                activeTab === "urgent"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Urgent / P0 ({items.filter((i) => i.isUrgent).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`flex-1 rounded-lg py-1.5 font-semibold transition cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Signals ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("deadlines")}
              className={`flex-1 rounded-lg py-1.5 font-semibold transition cursor-pointer ${
                activeTab === "deadlines"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Deadlines
            </button>
          </div>

          {/* Body Content */}
          <div className="mt-3 max-h-80 overflow-y-auto space-y-2.5 pr-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Syncing priority alerts...
              </div>
            ) : activeTab === "deadlines" ? (
              buckets.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No upcoming deadlines scheduled.
                </div>
              ) : (
                <div className="space-y-2">
                  {buckets.map((bucket) => (
                    <div
                      key={bucket.bucket}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>{bucketLabels[bucket.bucket]}</span>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px]">
                          {bucket.count}
                        </span>
                      </div>
                      {bucket.tasks.length > 0 && (
                        <ul className="mt-2 space-y-1.5">
                          {bucket.tasks.slice(0, 3).map((task) => (
                            <li
                              key={task.id}
                              className="flex items-center justify-between text-xs text-slate-600"
                            >
                              <span className="truncate max-w-[200px]">{task.title}</span>
                              <button
                                type="button"
                                onClick={() => handleCompleteTask(task.id)}
                                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                              >
                                Done
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : filteredItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                All clear! No pending urgent notifications.
              </div>
            ) : (
              filteredItems.map((item) => {
                const urgency = Math.round(item.urgencyScore * 100);
                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-2xl border p-3 transition-all ${
                      item.isP0
                        ? "border-rose-200/90 bg-rose-50/50 hover:bg-rose-50"
                        : item.isUrgent
                          ? "border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/80"
                          : "border-slate-100 bg-slate-50/80 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {getCategoryBadge(item.category)}

                        {item.isP0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs animate-pulse">
                            <ShieldAlert className="h-3 w-3" />
                            P0 ({urgency})
                          </span>
                        ) : item.isUrgent ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                            <AlertTriangle className="h-3 w-3" />
                            High ({urgency})
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1">
                        {item.nativeUrl && (
                          <a
                            href={item.nativeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded p-1 text-slate-400 hover:text-slate-700"
                            title="Open native source"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCompleteTask(item.id)}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
                      {item.title}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsMenu;
