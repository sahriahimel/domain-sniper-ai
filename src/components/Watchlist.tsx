"use client";

import type { Deal } from "@/lib/types";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""').replace(/\n/g, " ")}"`;
}

export function buildCsv(items: Deal[]): string {
  const header = ["Domain", "Category", "BIN Price", "Floor Price", "Min Offer", "Sniper Score", "Description"];
  const rows = items.map((d) =>
    [
      d.domain,
      d.marketplaceCopy.category,
      d.afternicPricing.bin,
      d.afternicPricing.floor,
      d.afternicPricing.minOffer,
      d.sniperScore,
      d.marketplaceCopy.description,
    ]
      .map(csvCell)
      .join(",")
  );
  return [header.map(csvCell).join(","), ...rows].join("\n");
}

interface Props {
  items: Deal[];
  onRemove: (domain: string) => void;
  onClear: () => void;
}

export default function Watchlist({ items, onRemove, onClear }: Props) {
  function exportCsv() {
    const blob = new Blob([buildCsv(items)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sniper-watchlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">Watchlist</h2>
          <p className="text-sm text-zinc-500">
            {items.length === 0
              ? "Save a deal card to keep it here. Your picks stay in this browser."
              : `${items.length} saved ${items.length === 1 ? "domain" : "domains"}. A sniper portfolio stays at 3 to 5.`}
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
            >
              Export CSV
            </button>
            <button
              onClick={onClear}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-zinc-800">
          {items.map((d) => (
            <li key={d.domain} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-100">{d.domain}</p>
                <p className="text-xs text-zinc-500">
                  BIN {usd(d.afternicPricing.bin)} · Floor {usd(d.afternicPricing.floor)} · Score {d.sniperScore}
                </p>
              </div>
              <button
                onClick={() => onRemove(d.domain)}
                className="shrink-0 rounded-md px-3 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
