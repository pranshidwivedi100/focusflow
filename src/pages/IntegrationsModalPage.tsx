import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Mail, MessageCircle, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationsMenu from "../components/NotificationsMenu";
import integrationsAvatar from "../assets/images/stitch/integrations-avatar.jpg";
import { useToast } from "../components/ToastAlert";

interface IntegrationItem {
  provider: string;
  connected: boolean;
}

const IntegrationsModalPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [gmailSyncing, setGmailSyncing] = useState(false);

  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        const response = await fetch("/api/integrations", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to load integrations");
        }
        const payload = (await response.json()) as {
          integrations: IntegrationItem[];
        };
        setIntegrations(payload.integrations ?? []);
      } catch (err: any) {
        setError(err.message || "Failed to load integrations");
      }
    };

    loadIntegrations();
  }, []);

  const providers = useMemo(
    () => new Set(integrations.map((integration) => integration.provider)),
    [integrations],
  );

  const items = [
    {
      name: "Google (Gmail & Calendar)",
      provider: "google",
      connected: providers.has("google"),
      description: "Client communications, alerts & calendar events",
      icon: Mail,
    },
    {
      name: "Slack",
      provider: "slack",
      connected: providers.has("slack"),
      description: "Critical mentions, incident alerts & team threads",
      icon: MessageCircle,
    },
    {
      name: "Jira",
      provider: "jira",
      connected: providers.has("jira"),
      description: "P0 blockers, sprint tasks & project issues",
      icon: CheckCircle2,
    },
  ];

  const handleConnect = async (provider: string) => {
    setActionLoading(provider);
    setError(null);
    try {
      const response = await fetch(`/api/integrations/${provider}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (response.ok) {
        setIntegrations((prev) => {
          const filtered = prev.filter((item) => item.provider !== provider);
          return [...filtered, { provider, connected: true }];
        });
        showToast({
          title: `${provider.toUpperCase()} Integration Connected`,
          description: "Signals from this provider will be ingested into your priority queue.",
          urgencyScore: 10,
          category: "Integration",
          duration: 4000,
        });
      } else {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to connect integration");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect integration");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    setActionLoading(provider);
    setError(null);
    try {
      const response = await fetch(`/api/integrations/${provider}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        setIntegrations((prev) =>
          prev.filter((item) => item.provider !== provider),
        );
      } else {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to disconnect integration");
      }
    } catch (err: any) {
      setError(err.message || "Failed to disconnect integration");
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Live Gmail Sync / Test Simulation
   */
  const handleGmailSync = async (forceSimulate = false) => {
    setGmailSyncing(true);
    setError(null);
    try {
      const endpoint = forceSimulate
        ? "/api/integrations/gmail/simulate"
        : "/api/integrations/gmail/sync";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Gmail sync failed");
      }

      const data = (await res.json()) as {
        success: boolean;
        mode: "live" | "simulation";
        items: any[];
        message: string;
      };

      // Mark google as connected
      setIntegrations((prev) => {
        const filtered = prev.filter((i) => i.provider !== "google");
        return [...filtered, { provider: "google", connected: true }];
      });

      showToast({
        title: data.mode === "live" ? "Gmail Live Ingestion Active" : "Gmail Simulation Active",
        description: data.message,
        urgencyScore: 92,
        category: "Email Action",
        isP0: true,
      });
    } catch (err: any) {
      setError(err.message || "Failed to sync Gmail");
    } finally {
      setGmailSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <aside className="hidden min-h-screen w-64 flex-col border-r border-slate-200/80 bg-white px-6 py-8 md:flex">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-md">
                FF
              </div>
              <h1 className="text-lg font-bold text-slate-900">FocusFlow</h1>
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400 font-medium">
              Kinetic Precision
            </p>
          </div>
          <nav className="mt-10 space-y-2 text-sm text-slate-600">
            <button
              className="w-full text-left rounded-xl px-4 py-3 hover:bg-slate-50 font-medium transition cursor-pointer"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>
            <div className="rounded-xl bg-blue-600 px-4 py-3 text-white font-bold shadow-sm">
              Integrations Hub
            </div>
            <button
              className="w-full text-left rounded-xl px-4 py-3 hover:bg-slate-50 font-medium transition cursor-pointer"
              onClick={() => navigate("/profile")}
            >
              Profile Settings
            </button>
          </nav>
        </aside>

        <main className="flex-1 px-6 py-10">
          <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Integrations Hub
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Manage your live email and notification signal connections.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationsMenu />
              <img
                src={integrationsAvatar}
                alt="User profile"
                className="h-10 w-10 rounded-full border border-slate-200 object-cover ring-2 ring-slate-100"
              />
            </div>
          </header>

          {error && (
            <div className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-xs font-bold text-rose-700 hover:underline">
                Dismiss
              </button>
            </div>
          )}

          <div className="mt-8 max-w-2xl space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 p-4 text-xs text-blue-900">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Resilient Ingestion:</strong> Connect live accounts or trigger simulations for instant test triage.
                </span>
              </div>
            </div>

            {items.map((item) => (
              <div
                key={item.provider}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs transition hover:shadow-sm gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                    <item.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900">
                        {item.name}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          item.connected
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.connected ? "Active" : "Offline"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.provider === "google" && (
                    <button
                      type="button"
                      disabled={gmailSyncing}
                      onClick={() => handleGmailSync(false)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                      title="Pull real emails or inject realistic urgent client stream"
                    >
                      <Zap className={`h-3.5 w-3.5 ${gmailSyncing ? "animate-spin" : ""}`} />
                      {gmailSyncing ? "Syncing..." : "Live Gmail Sync / Simulation"}
                    </button>
                  )}

                  {item.connected ? (
                    <button
                      type="button"
                      disabled={actionLoading === item.provider}
                      className="rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-bold text-rose-600 shadow-2xs transition hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                      onClick={() => handleDisconnect(item.provider)}
                    >
                      {actionLoading === item.provider ? "Saving..." : "Disconnect"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading === item.provider}
                      className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                      onClick={() => handleConnect(item.provider)}
                    >
                      {actionLoading === item.provider ? "Connecting..." : "Connect"}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-4">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 py-3 text-sm font-bold text-white shadow-md transition cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default IntegrationsModalPage;
