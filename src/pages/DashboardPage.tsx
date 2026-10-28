import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertOctagon,
  AlertTriangle,
  Bug,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  Mail,
  RefreshCcw,
  Sparkles,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import dashboardAvatar from "../assets/images/stitch/dashboard-avatar.jpg";
import NotificationsMenu from "../components/NotificationsMenu";
import { useToast } from "../components/ToastAlert";
import { soundEngine } from "../utils/audio";

interface TaskItem {
  id: string;
  title: string;
  status: "pending" | "completed" | "dismissed";
  urgency_score: number | null;
  importance_score: number | null;
  native_url: string | null;
  category?: string | null;
}

interface DashboardSummary {
  sessionWins: {
    completedTasks: number;
  };
  workloadBalance: {
    completed: { total: number; high: number; medium: number; low: number };
    pending: { total: number; high: number; medium: number; low: number };
  };
  incomingUrgency: {
    dueIn1Hour: number;
    dueIn5Hours: number;
    dueToday: number;
    dueTomorrow: number;
  };
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [gmailSyncing, setGmailSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [tasksResponse, summaryResponse] = await Promise.all([
        fetch("/api/tasks", { credentials: "include" }),
        fetch("/api/dashboard/summary", { credentials: "include" }),
      ]);

      if (!tasksResponse.ok || !summaryResponse.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const tasksPayload = (await tasksResponse.json()) as {
        tasks: TaskItem[];
      };
      const summaryPayload = (await summaryResponse.json()) as DashboardSummary;

      setTasks(tasksPayload.tasks ?? []);
      setSummary(summaryPayload);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const inboxResponse = await fetch("/api/inbox", {
        credentials: "include",
      });
      if (!inboxResponse.ok) {
        throw new Error("Failed to fetch inbox");
      }

      const inboxPayload = (await inboxResponse.json()) as { items: any[] };
      const items = inboxPayload.items ?? [];

      if (items.length > 0) {
        const analyzeResponse = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ items }),
        });

        if (!analyzeResponse.ok) {
          throw new Error("Analysis failed");
        }

        const analyzeData = await analyzeResponse.json();
        const top = analyzeData.result?.topPriorities?.[0];
        if (top) {
          const score = Math.round((top.urgencyScore ?? 0) * 100);
          if (score > 70) {
            showToast({
              title: top.title,
              description: top.reason || top.suggestedAction,
              urgencyScore: score,
              category: top.category || "Email Action",
              isP0: score >= 85,
              nativeUrl: top.nativeUrl,
              onDone: () => handleCompleteTask(top.id),
            });
          }
        }
      }

      await loadDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to refresh analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  /**
   * Live Gmail Sync / Test Simulation.
   * Pulls real emails OR injects realistic high-priority client emails without breaking
   * if Google Cloud verification is pending.
   */
  const handleLiveGmailSync = async (forceSimulate = false) => {
    setGmailSyncing(true);
    setError(null);

    try {
      const endpoint = forceSimulate
        ? "/api/integrations/gmail/simulate"
        : "/api/integrations/gmail/sync";

      const syncRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!syncRes.ok) {
        throw new Error("Gmail sync request failed");
      }

      const syncPayload = (await syncRes.json()) as {
        success: boolean;
        mode: "live" | "simulation";
        items: any[];
        message: string;
      };

      // Ingest directly into the aggregation and prioritization pipeline
      if (syncPayload.items && syncPayload.items.length > 0) {
        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ items: syncPayload.items }),
        });

        if (analyzeRes.ok) {
          const analyzeData = await analyzeRes.json();
          const topList = analyzeData.result?.topPriorities || [];
          const topItem = topList[0];

          if (topItem) {
            const score = Math.round((topItem.urgencyScore ?? 0) * 100);
            showToast({
              title: topItem.title,
              description: topItem.reason || topItem.suggestedAction,
              urgencyScore: score,
              category: topItem.category || "Blocker",
              isP0: score >= 85,
              nativeUrl: topItem.nativeUrl,
              onDone: () => handleCompleteTask(topItem.id),
            });
          }
        }
      }

      await loadDashboard();
    } catch (err: any) {
      setError(err.message || "Gmail sync encountered an issue");
    } finally {
      setGmailSyncing(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    // Optimistic local update
    const completedTask = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    soundEngine.playSuccessChime();

    if (completedTask) {
      showToast({
        title: "Task Marked Done",
        description: completedTask.title,
        urgencyScore: 10,
        category: "Action",
        duration: 3500,
      });
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "completed" }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      // Refresh dashboard statistics
      const summaryResponse = await fetch("/api/dashboard/summary", {
        credentials: "include",
      });
      if (summaryResponse.ok) {
        const summaryPayload = (await summaryResponse.json()) as DashboardSummary;
        setSummary(summaryPayload);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update task");
      await loadDashboard();
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const completionPercent = useMemo(() => {
    if (!summary) return 0;
    const total =
      summary.workloadBalance.pending.total +
      summary.workloadBalance.completed.total;
    if (total === 0) return 0;
    return Math.round((summary.workloadBalance.completed.total / total) * 100);
  }, [summary]);

  const completionWidthClass = useMemo(() => {
    if (completionPercent >= 90) return "w-full";
    if (completionPercent >= 75) return "w-4/5";
    if (completionPercent >= 60) return "w-3/5";
    if (completionPercent >= 50) return "w-1/2";
    if (completionPercent >= 40) return "w-2/5";
    if (completionPercent >= 25) return "w-1/4";
    if (completionPercent > 0) return "w-1/5";
    return "w-0";
  }, [completionPercent]);

  const getCategoryBadge = (category?: string | null) => {
    switch (category) {
      case "Email Action":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200/90 px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-2xs">
            <Mail className="h-3.5 w-3.5 text-indigo-600" />
            Email Action
          </span>
        );
      case "Meeting":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 border border-sky-200/90 px-2.5 py-1 text-xs font-semibold text-sky-700 shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-sky-600" />
            Meeting
          </span>
        );
      case "Bug":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200/90 px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-2xs">
            <Bug className="h-3.5 w-3.5 text-amber-600" />
            Bug
          </span>
        );
      case "Blocker":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200/90 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-2xs">
            <AlertOctagon className="h-3.5 w-3.5 text-rose-600" />
            Blocker
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden min-h-screen w-64 flex-col bg-slate-900 px-5 py-6 text-slate-200 lg:flex shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-md">
                FF
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">FocusFlow</h1>
            </div>
            <p className="mt-1.5 text-[11px] uppercase tracking-[0.25em] text-slate-400 font-medium">
              Executive Priority Hub
            </p>
          </div>

          <nav className="mt-10 space-y-2 text-sm">
            <button className="flex w-full items-center gap-3 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-md">
              <LayoutDashboard className="h-4 w-4" />
              Priority Hub
            </button>
            <button
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800/80 transition cursor-pointer"
              onClick={() => navigate("/integrations")}
            >
              <Zap className="h-4 w-4" />
              Integrations Hub
            </button>
            <button
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800/80 transition cursor-pointer"
              onClick={() => navigate("/profile")}
            >
              <User className="h-4 w-4" />
              User Profile
            </button>
          </nav>

          <div className="mt-auto rounded-2xl bg-slate-800/60 border border-slate-700/60 p-4 text-xs">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              AI Prioritization
            </p>
            <p className="mt-1 text-slate-400 leading-relaxed">
              Gemini model scores incoming signals by urgency & business impact.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Top Header */}
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3 text-slate-700">
                <button
                  type="button"
                  id="refresh-analysis-btn"
                  disabled={analyzing}
                  className="rounded-full bg-slate-100 p-2.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer disabled:opacity-50"
                  onClick={handleAnalyze}
                  title="Re-run AI Analysis on all connected signals"
                >
                  <RefreshCcw className={`h-4 w-4 ${analyzing ? "animate-spin text-blue-600" : ""}`} />
                </button>
                <div>
                  <span className="text-sm font-bold text-slate-900">Priority Hub</span>
                  <span className="hidden sm:inline-block ml-2 text-xs text-slate-500 font-medium">
                    {analyzing ? "Analyzing signals..." : "Real-time AI Prioritization"}
                  </span>
                </div>
              </div>

              {/* Action Buttons & Notification Bell */}
              <div className="flex items-center gap-3">
                {/* Live Gmail Sync / Test Simulation Button */}
                <button
                  type="button"
                  id="live-gmail-sync-btn"
                  disabled={gmailSyncing}
                  onClick={() => handleLiveGmailSync(false)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-60"
                  title="Pull real Gmail or inject realistic high-priority client emails"
                >
                  <Mail className={`h-4 w-4 ${gmailSyncing ? "animate-bounce" : ""}`} />
                  <span className="hidden sm:inline">
                    {gmailSyncing ? "Syncing Gmail..." : "Live Gmail Sync / Simulation"}
                  </span>
                  <span className="sm:hidden">{gmailSyncing ? "Syncing..." : "Gmail Sync"}</span>
                </button>

                {/* Interactive Notification Bell */}
                <NotificationsMenu onTaskCompleted={handleCompleteTask} />

                {/* Avatar */}
                <button
                  type="button"
                  className="rounded-full ring-2 ring-slate-200 hover:ring-blue-500 transition cursor-pointer"
                  onClick={() => navigate("/profile")}
                >
                  <img
                    src={dashboardAvatar}
                    alt="User profile"
                    className="h-9 w-9 rounded-full object-cover"
                  />
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-6 py-8">
            {/* Header Hero */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  Focus Queue
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  High-leverage tasks ranked dynamically by Urgency & Business Impact.
                </p>
              </div>

              {/* Quick simulation injector */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLiveGmailSync(true)}
                  disabled={gmailSyncing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 shadow-2xs transition cursor-pointer disabled:opacity-50"
                  title="Simulate immediate high-priority client email stream"
                >
                  <Zap className="h-3.5 w-3.5 text-rose-600" />
                  Simulate Urgent Stream
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-xs font-bold text-rose-700 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
              {/* Prioritized Task List */}
              <section className="space-y-4">
                {loading ? (
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
                    <RefreshCcw className="mx-auto h-8 w-8 animate-spin text-blue-600 mb-3" />
                    Loading prioritized tasks...
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                    <h3 className="text-base font-bold text-slate-900">Queue is Clear!</h3>
                    <p className="mt-1 text-slate-500 text-xs">
                      All high-priority tasks have been completed.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleLiveGmailSync(true)}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
                    >
                      <Mail className="h-4 w-4" />
                      Inject Realistic Client Emails
                    </button>
                  </div>
                ) : (
                  tasks.slice(0, 8).map((task, index) => {
                    const urgency = Math.round((task.urgency_score ?? 0) * 100);
                    const importance = Math.round((task.importance_score ?? 0) * 100);
                    const isP0 = urgency >= 85;
                    const isUrgent = urgency >= 70;

                    return (
                      <div
                        key={task.id}
                        className={`group relative rounded-3xl border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
                          isP0
                            ? "border-rose-300 ring-1 ring-rose-400/40 glow-red"
                            : isUrgent
                              ? "border-amber-300/80 glow-amber"
                              : "border-slate-200/80"
                        }`}
                      >
                        {/* Top Header Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-bold text-white shadow-xs">
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            {getCategoryBadge(task.category)}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Glowing Urgency Tag */}
                            {isP0 ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-sm animate-pulse">
                                <AlertOctagon className="h-3.5 w-3.5" />
                                P0 Blocker ({urgency}/100)
                              </span>
                            ) : isUrgent ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Urgent ({urgency}/100)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                Priority ({urgency}/100)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="mt-3.5 text-xl font-bold text-slate-900 leading-snug">
                          {task.title}
                        </h3>

                        {/* Metrics Bar */}
                        <div className="mt-3.5 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50/90 border border-slate-100 p-3 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 font-medium">
                            <span className="text-slate-400">Importance:</span>
                            <span className="font-bold text-slate-800">{importance}/100</span>
                          </div>
                          <span className="text-slate-300">•</span>
                          <div className="flex items-center gap-1.5 font-medium">
                            <span className="text-slate-400">Status:</span>
                            <span className="font-semibold text-blue-600 capitalize">
                              {task.status}
                            </span>
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
                          <div>
                            {task.native_url && (
                              <a
                                href={task.native_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View Source Signal
                              </a>
                            )}
                          </div>

                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:shadow cursor-pointer"
                            onClick={() => handleCompleteTask(task.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Done
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>

              {/* Aside Widgets */}
              <aside className="space-y-6">
                {/* Session Wins Widget */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Session Wins
                    </h4>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      {completionPercent}% DAILY GOAL
                    </span>
                  </div>

                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-extrabold text-slate-900">
                        {summary?.sessionWins.completedTasks ?? 0}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">Tasks Completed</p>
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      {summary?.workloadBalance.pending.total ?? 0} Pending Today
                    </p>
                  </div>

                  <div className="mt-4 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-2 rounded-full bg-emerald-500 transition-all duration-500 ${completionWidthClass}`}
                    />
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Completed High Priority:
                      </span>
                      <span className="font-bold text-slate-900">
                        {summary?.workloadBalance.completed.high ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Completed Medium:
                      </span>
                      <span className="font-bold text-slate-900">
                        {summary?.workloadBalance.completed.medium ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workload Balance Widget */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900">Workload Balance</h4>
                  <div className="mt-4 grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3">
                      <p className="text-rose-600 font-medium">High</p>
                      <p className="text-lg font-bold text-rose-900">
                        {summary?.workloadBalance.pending.high ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
                      <p className="text-amber-600 font-medium">Medium</p>
                      <p className="text-lg font-bold text-amber-900">
                        {summary?.workloadBalance.pending.medium ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                      <p className="text-slate-500 font-medium">Low</p>
                      <p className="text-lg font-bold text-slate-900">
                        {summary?.workloadBalance.pending.low ?? 0}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-xs text-slate-500 font-medium">
                    Active pending total: {summary?.workloadBalance.pending.total ?? 0}
                  </p>
                </div>

                {/* Incoming Urgency Stream Widget */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Inbox className="h-4 w-4 text-blue-600" />
                      Incoming Stream
                    </h4>
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping"></span>
                  </div>

                  <div className="mt-4 grid gap-2.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                      <span className="font-medium">Due in 1 hour</span>
                      <span className="font-bold text-rose-600">
                        {summary?.incomingUrgency.dueIn1Hour ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                      <span className="font-medium">Due in 5 hours</span>
                      <span className="font-bold text-amber-600">
                        {summary?.incomingUrgency.dueIn5Hours ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                      <span className="font-medium">Due today</span>
                      <span className="font-bold text-slate-800">
                        {summary?.incomingUrgency.dueToday ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                      <span className="font-medium">Due tomorrow</span>
                      <span className="font-bold text-slate-800">
                        {summary?.incomingUrgency.dueTomorrow ?? 0}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-blue-600 transition cursor-pointer"
                    onClick={() => navigate("/integrations")}
                  >
                    Manage Integrations Hub
                  </button>
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
