"use client";

import { useEffect, useRef, useState } from "react";
import DealCard from "@/components/DealCard";
import SettingsModal from "@/components/SettingsModal";
import Terminal, { LogLine } from "@/components/Terminal";
import Watchlist from "@/components/Watchlist";
import type { Deal, HuntEvent, Provider, Settings } from "@/lib/types";

const SETTINGS_KEY = "sniper.settings";
const WATCHLIST_KEY = "sniper.watchlist";

const DEFAULT_SETTINGS: Settings = { provider: "groq", serperKey: "", groqKey: "", anthropicKey: "" };
const PRESETS = ["AI Agents", "Fintech", "Green Energy", "Cybersecurity", "Developer Tools", "HealthTech"];

export default function Home() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [watchlist, setWatchlist] = useState<Deal[]>([]);
  const [niche, setNiche] = useState("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ generated: number; available: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const logId = useRef(0);

  useEffect(() => {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) });
      const w = localStorage.getItem(WATCHLIST_KEY);
      if (w) setWatchlist(JSON.parse(w));
    } catch {
      /* ignore corrupted storage */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    } catch {
      /* storage unavailable */
    }
  }, [watchlist, loaded]);

  function persistSettings(next: Settings) {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }

  function addLog(level: LogLine["level"], message: string) {
    const time = new Date().toLocaleTimeString("en-GB");
    setLogs((prev) => [...prev, { id: logId.current++, level, message, time }]);
  }

  function toggleSave(deal: Deal) {
    setWatchlist((prev) =>
      prev.some((d) => d.domain === deal.domain) ? prev.filter((d) => d.domain !== deal.domain) : [...prev, deal]
    );
  }

  async function launch() {
    if (running) return;
    setRunning(true);
    setError(null);
    setDeals([]);
    setStats(null);
    setLogs([]);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-provider": settings.provider,
    };
    if (settings.serperKey) headers["x-serper-key"] = settings.serperKey;
    if (settings.groqKey) headers["x-groq-key"] = settings.groqKey;
    if (settings.anthropicKey) headers["x-anthropic-key"] = settings.anthropicKey;

    const handle = (event: HuntEvent) => {
      if (event.type === "log") addLog(event.level, event.message);
      else if (event.type === "result") {
        setDeals(event.deals);
        setStats(event.stats);
      } else if (event.type === "error") {
        addLog("error", event.message);
        setError(event.message);
      }
    };

    try {
      const res = await fetch("/api/hunt", { method: "POST", headers, body: JSON.stringify({ niche }) });
      if (!res.ok || !res.body) throw new Error(`Server returned ${res.status}. Check your Vercel deployment logs.`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) handle(JSON.parse(line) as HuntEvent);
        }
      }
      if (buffer.trim()) handle(JSON.parse(buffer) as HuntEvent);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      addLog("error", message);
      setError(message);
    } finally {
      setRunning(false);
    }
  }

  const activeKeyMissing =
    loaded && !settings.serperKey && !settings.groqKey && !settings.anthropicKey;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Domain Sniper AI</h1>
          <p className="mt-1 max-w-xl text-zinc-400">
            Three to five category-killer domains, verified unregistered, with a listing pack ready for Afternic.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="sr-only" htmlFor="provider">
            AI provider
          </label>
          <select
            id="provider"
            value={settings.provider}
            onChange={(e) => persistSettings({ ...settings, provider: e.target.value as Provider })}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="groq">Groq (free backtest)</option>
            <option value="anthropic">Anthropic Claude (pro)</option>
          </select>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
          >
            API keys
          </button>
        </div>
      </header>

      {activeKeyMissing && (
        <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          No keys saved in this browser yet. Open API keys to add them, or set them as environment variables on Vercel.
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <label htmlFor="niche" className="text-sm font-medium text-zinc-300">
          Niche
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="niche"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && launch()}
            placeholder="Leave empty to auto-discover trending niches"
            maxLength={100}
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            onClick={launch}
            disabled={running}
            className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
          >
            {running ? "Hunting..." : "Launch Sniper Hunt"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setNiche(p)}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-emerald-500 hover:text-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-6">
        <Terminal logs={logs} running={running} />
      </div>

      {error && !running && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {deals.length > 0 && (
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold text-zinc-50">Goldmine picks</h2>
            {stats && (
              <p className="text-sm text-zinc-500">
                {stats.available} available out of {stats.generated} candidates checked
              </p>
            )}
          </div>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            {deals.map((d) => (
              <DealCard key={d.domain} deal={d} saved={watchlist.some((w) => w.domain === d.domain)} onToggleSave={toggleSave} />
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            RDAP and DNS checks are a strong signal, not a guarantee. Confirm the standard price at the registrar before
            paying, and treat AI price suggestions as a starting point, not an appraisal.
          </p>
        </section>
      )}

      <div className="mt-10">
        <Watchlist
          items={watchlist}
          onRemove={(domain) => setWatchlist((prev) => prev.filter((d) => d.domain !== domain))}
          onClear={() => setWatchlist([])}
        />
      </div>

      {showSettings && (
        <SettingsModal
          open={showSettings}
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={(s) => {
            persistSettings(s);
            setShowSettings(false);
          }}
        />
      )}
    </main>
  );
}
