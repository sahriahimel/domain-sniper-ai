"use client";

import { useState } from "react";
import type { Deal } from "@/lib/types";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export function listingText(deal: Deal): string {
  return [
    `Domain: ${deal.domain}`,
    `Category: ${deal.marketplaceCopy.category}`,
    `Buy It Now: ${usd(deal.afternicPricing.bin)}`,
    `Floor price: ${usd(deal.afternicPricing.floor)}`,
    `Min offer: ${usd(deal.afternicPricing.minOffer)}`,
    "",
    "Description:",
    deal.marketplaceCopy.description,
  ].join("\n");
}

interface Props {
  deal: Deal;
  saved: boolean;
  onToggleSave: (deal: Deal) => void;
}

export default function DealCard({ deal, saved, onToggleSave }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(listingText(deal));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy the listing details:", listingText(deal));
    }
  }

  const scoreColor =
    deal.sniperScore >= 85 ? "text-emerald-400" : deal.sniperScore >= 70 ? "text-amber-400" : "text-zinc-300";

  return (
    <article className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="break-all text-2xl font-semibold tracking-tight text-zinc-50">{deal.domain}</h3>
          <p className="mt-1 text-sm text-zinc-500">{deal.marketplaceCopy.category}</p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{deal.sniperScore}</div>
          <div className="text-xs text-zinc-500">Sniper score</div>
        </div>
      </header>

      <dl className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-zinc-950/70 p-4 text-center">
        <div>
          <dt className="text-xs text-zinc-500">Buy It Now</dt>
          <dd className="mt-1 font-semibold text-emerald-400">{usd(deal.afternicPricing.bin)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Floor</dt>
          <dd className="mt-1 font-semibold text-amber-400">{usd(deal.afternicPricing.floor)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Min offer</dt>
          <dd className="mt-1 font-semibold text-zinc-200">{usd(deal.afternicPricing.minOffer)}</dd>
        </div>
      </dl>

      <section className="mt-5">
        <h4 className="text-sm font-medium text-zinc-300">Why it&apos;s valuable</h4>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">{deal.whyValuable}</p>
      </section>

      <section className="mt-4">
        <h4 className="text-sm font-medium text-zinc-300">Likely buyers</h4>
        <ul className="mt-2 flex flex-wrap gap-2">
          {deal.targetBuyers.map((b) => (
            <li key={b} className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
              {b}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4">
        <h4 className="text-sm font-medium text-zinc-300">Comparable sale patterns</h4>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">{deal.comparableSales}</p>
      </section>

      <section className="mt-4">
        <h4 className="text-sm font-medium text-zinc-300">Marketplace description</h4>
        <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 font-sans text-sm leading-relaxed text-zinc-300">
          {deal.marketplaceCopy.description}
        </pre>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={copy}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
        >
          {copied ? "Copied" : "Copy Afternic listing details"}
        </button>
        <a
          href={deal.registrationLinks.namecheap}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          Register now
        </a>
        <button
          onClick={() => onToggleSave(deal)}
          aria-pressed={saved}
          className={`rounded-lg border px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 ${
            saved ? "border-emerald-500 text-emerald-400" : "border-zinc-700 text-zinc-300"
          }`}
        >
          {saved ? "Saved to watchlist" : "Save to watchlist"}
        </button>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Also check:{" "}
        <a className="text-zinc-300 underline hover:text-emerald-400" href={deal.registrationLinks.dynadot} target="_blank" rel="noopener noreferrer">
          Dynadot
        </a>{" "}
        and{" "}
        <a className="text-zinc-300 underline hover:text-emerald-400" href={deal.registrationLinks.sav} target="_blank" rel="noopener noreferrer">
          Sav
        </a>
      </p>
    </article>
  );
}
