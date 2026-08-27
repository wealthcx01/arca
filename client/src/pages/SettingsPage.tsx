import { AlertTriangle, Check, Key, Shield, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SourceBadge } from "../components/pricing/SourceBadge";
import { SettingsSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toaster";
import { api } from "../lib/api";

interface ProviderSource {
  name: string;
  displayName: string;
  requiresKey: boolean;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  cards_synced: number;
}

interface UserKey {
  id: string;
  provider: string;
  is_active: boolean;
  daily_usage: number;
  last_used_at: string | null;
  created_at: string;
}

export function SettingsPage() {
  const { toast } = useToast();
  const [sources, setSources] = useState<ProviderSource[]>([]);
  const [keys, setKeys] = useState<UserKey[]>([]);
  const [newProvider, setNewProvider] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    Promise.all([
      api.get<{ sources: ProviderSource[] }>("/pricing/sources").then((d) => setSources(d.sources)),
      api.get<{ keys: UserKey[] }>("/pricing/keys").then((d) => setKeys(d.keys)),
    ])
      .catch((err) => toast.error(err.message || "Failed to load settings"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <SettingsSkeleton />;

  const handleAddKey = async () => {
    if (!newProvider || !newApiKey) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/pricing/keys", { provider: newProvider, api_key: newApiKey });
      setNewProvider("");
      setNewApiKey("");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (provider: string) => {
    try {
      await api.delete(`/pricing/keys/${provider}`);
      loadData();
    } catch {
      // ignore
    }
  };

  const handleToggleKey = async (provider: string) => {
    try {
      await api.put(`/pricing/keys/${provider}/toggle`, {});
      loadData();
    } catch {
      // ignore
    }
  };

  const byokProviders = sources.filter((s) => s.requiresKey);
  const freeProviders = sources.filter((s) => !s.requiresKey);
  const keyMap = new Map(keys.map((k) => [k.provider, k]));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Pricing Sources Status */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold">Pricing Sources</h2>
          <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
            Multi-source conflated pricing engine. Free sources sync every 6h, BYOK every 12h.
          </p>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {/* Free providers */}
          {freeProviders.map((source) => (
            <div key={source.name} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <SourceBadge source={source.name} size="md" />
                <div>
                  <p className="text-sm font-medium">{source.displayName}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Free &middot; {source.cards_synced} cards synced
                  </p>
                </div>
              </div>
              <StatusDot status={source.status} />
            </div>
          ))}

          {/* BYOK providers */}
          {byokProviders.map((source) => {
            const hasKey = keyMap.has(source.name);
            const key = keyMap.get(source.name);
            return (
              <div key={source.name} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <SourceBadge source={source.name} size="md" />
                  <div>
                    <p className="text-sm font-medium">{source.displayName}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {hasKey ? (
                        <>
                          <Key size={10} className="mr-0.5 inline" />
                          Key configured
                          {key && !key.is_active && " (disabled)"}
                          {key?.daily_usage ? ` · ${key.daily_usage} calls today` : ""}
                        </>
                      ) : (
                        "Requires API key"
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasKey && key && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleKey(source.name)}
                        className={`rounded px-2 py-1 text-xs ${
                          key.is_active
                            ? "bg-[color-mix(in_srgb,var(--color-positive)_15%,var(--color-card))] text-[var(--color-positive)]"
                            : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                        }`}
                      >
                        {key.is_active ? "Active" : "Disabled"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKey(source.name)}
                        className="rounded p-1 text-[var(--color-muted-foreground)] hover:bg-[color-mix(in_srgb,var(--color-negative)_10%,var(--color-card))] hover:text-[var(--color-negative)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  <StatusDot status={source.status} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add API Key */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Shield size={16} />
          <h2 className="text-sm font-semibold">Add API Key</h2>
        </div>
        <p className="mb-3 text-xs text-[var(--color-muted-foreground)]">
          Keys are encrypted with AES-256-GCM and stored securely.
        </p>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded bg-[color-mix(in_srgb,var(--color-negative)_10%,var(--color-card))] px-3 py-2 text-xs text-[var(--color-negative)]">
            <AlertTriangle size={12} /> {error}
          </div>
        )}

        <div className="space-y-2">
          <select
            value={newProvider}
            onChange={(e) => setNewProvider(e.target.value)}
            className="w-full rounded border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm"
          >
            <option value="">Select provider...</option>
            {byokProviders.map((p) => (
              <option key={p.name} value={p.name}>
                {p.displayName}
              </option>
            ))}
          </select>

          <input
            type="password"
            placeholder="Paste API key..."
            value={newApiKey}
            onChange={(e) => setNewApiKey(e.target.value)}
            className="w-full rounded border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm"
          />

          <button
            type="button"
            onClick={handleAddKey}
            disabled={!newProvider || !newApiKey || saving}
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Key"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "ok"
      ? "bg-[var(--color-positive)]"
      : status === "syncing"
        ? "bg-[var(--color-warning)] animate-pulse"
        : status === "error"
          ? "bg-[var(--color-negative)]"
          : "bg-[var(--color-muted-foreground)]";

  return <div className={`h-2 w-2 rounded-full ${color}`} title={status} />;
}
