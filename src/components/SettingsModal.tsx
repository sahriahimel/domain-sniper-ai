"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types";

interface Props {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings) => void;
}

export default function SettingsModal({ open, settings, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Settings>(settings);

  if (!open) return null;

  const field = (label: string, key: "serperKey" | "groqKey" | "anthropicKey", hint: string, placeholder: string) => (
    <label className="block">
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>
      <input
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="API configuration"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-50">API configuration</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Keys are saved only in this browser (localStorage) and sent to your own server route with each hunt. Keys set in
          Vercel environment variables are used when a field here is empty.
        </p>

        <div className="mt-6 space-y-5">
          {field("Serper.dev API key", "serperKey", "Live Google search. Free signup at serper.dev.", "Paste Serper key")}
          {field("Groq API key", "groqKey", "Free tier, used for backtesting. Get one at console.groq.com.", "gsk_...")}
          {field("Anthropic API key", "anthropicKey", "Claude for production runs. Get one at console.anthropic.com.", "sk-ant-...")}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                ...draft,
                serperKey: draft.serperKey.trim(),
                groqKey: draft.groqKey.trim(),
                anthropicKey: draft.anthropicKey.trim(),
              })
            }
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
          >
            Save keys
          </button>
        </div>
      </div>
    </div>
  );
}
