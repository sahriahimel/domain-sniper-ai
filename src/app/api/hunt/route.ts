import { NextRequest } from "next/server";
import type { Deal, HuntEvent, LogLevel, Provider } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const encoder = new TextEncoder();

/* ----------------------------- LLM providers ----------------------------- */

interface LLMConfig {
  provider: Provider;
  groqKey: string;
  anthropicKey: string;
}

async function callLLM(cfg: LLMConfig, system: string, user: string): Promise<string> {
  if (cfg.provider === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`Groq API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? "";
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": cfg.anthropicKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0.7,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  const block = (json.content || []).find((b: { type: string }) => b.type === "text");
  return block?.text ?? "";
}

function parseJSON<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0 || end < start) {
    throw new Error("The AI did not return valid JSON. Please try again.");
  }
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    // Fallback cleanup for common trailing commas or minor JSON flaws
    const cleaned = text.slice(start, end + 1).replace(/,\s*([\]}])/g, "$1");
    return JSON.parse(cleaned) as T;
  }
}

/* ------------------------------ Serper.dev ------------------------------- */

interface SerperResult {
  title?: string;
  snippet?: string;
}

async function serperSearch(query: string, key: string): Promise<SerperResult[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: 6, tbs: "qdr:m" }),
  });
  if (!res.ok) {
    throw new Error(`Serper.dev error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = await res.json();
  return (json.organic || []) as SerperResult[];
}

/* ------------------------- Availability checking ------------------------- */

type Status = "taken" | "free" | "unknown";

async function timedFetch(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/rdap+json, application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function rdapStatus(domain: string): Promise<Status> {
  try {
    const res = await timedFetch(`https://rdap.org/domain/${domain}`);
    if (res.status === 404) return "free";
    if (res.status === 200) return "taken";
    return "unknown";
  } catch {
    return "unknown";
  }
}

async function dnsStatus(domain: string): Promise<Status> {
  try {
    const res = await timedFetch(`https://dns.google/resolve?name=${domain}&type=NS`);
    const json = await res.json();
    if (json.Status === 3) return "free";
    if (Array.isArray(json.Answer) && json.Answer.length > 0) return "taken";
    return "unknown";
  } catch {
    return "unknown";
  }
}

async function isAvailable(domain: string): Promise<boolean> {
  const [rdap, dns] = await Promise.all([rdapStatus(domain), dnsStatus(domain)]);
  if (rdap === "taken" || dns === "taken") return false;
  if (rdap === "free") return true;
  return rdap === "unknown" && dns === "free";
}

async function filterAvailable(domains: string[]): Promise<{ available: string[]; taken: string[] }> {
  const available: string[] = [];
  const taken: string[] = [];
  const batchSize = 5;
  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((d) => isAvailable(d)));
    batch.forEach((d, idx) => (results[idx] ? available : taken).push(d));
  }
  return { available, taken };
}

/* -------------------------------- Prompts -------------------------------- */

const SNIPER_SYSTEM = `You are an elite domain investor. Return ONLY valid JSON, no markdown formatting, no explanations. Format: {"candidates":[{"domain":"example.com","reason":"short"}]}`;

const VALUATION_SYSTEM = `You are an elite domain appraiser. Return ONLY valid JSON, no markdown formatting. Format: {"deals":[{"domain":"example.com","sniperScore":85,"whyValuable":"text","targetBuyers":["SaaS"],"comparableSales":"text","afternicPricing":{"bin":1950,"floor":900,"minOffer":700},"marketplaceCopy":{"category":"Tech","description":"line1\nline2\nline3"}}]}`;

/* -------------------------------- Helpers -------------------------------- */

function normalizeDomain(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const d = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  return /^[a-z]{3,16}\.(com|ai)$/.test(d) ? d : null;
}

function registrationLinks(domain: string) {
  const q = encodeURIComponent(domain);
  return {
    namecheap: `https://www.namecheap.com/domains/registration/results/?domain=${q}`,
    dynadot: `https://www.dynadot.com/domain/search?domain=${q}`,
    sav: `https://www.sav.com/domains/search?domain=${q}`,
  };
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

interface RawDeal {
  domain?: unknown;
  sniperScore?: unknown;
  whyValuable?: unknown;
  targetBuyers?: unknown;
  comparableSales?: unknown;
  afternicPricing?: { bin?: unknown; floor?: unknown; minOffer?: unknown };
  marketplaceCopy?: { category?: unknown; description?: unknown };
}

function cleanDeal(raw: RawDeal, domain: string): Deal {
  const bin = toNumber(raw.afternicPricing?.bin, 1950);
  const floor = Math.min(toNumber(raw.afternicPricing?.floor, Math.round(bin * 0.45)), bin);
  const minOffer = Math.min(toNumber(raw.afternicPricing?.minOffer, Math.round(floor * 0.8)), floor);
  const description = String(raw.marketplaceCopy?.description ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join("\n");

  return {
    domain,
    sniperScore: Math.max(0, Math.min(100, toNumber(raw.sniperScore, 80))),
    whyValuable: String(raw.whyValuable ?? ""),
    targetBuyers: Array.isArray(raw.targetBuyers) ? raw.targetBuyers.map(String).slice(0, 6) : [],
    comparableSales: String(raw.comparableSales ?? ""),
    afternicPricing: { bin, floor, minOffer },
    marketplaceCopy: {
      category: String(raw.marketplaceCopy?.category ?? "Business & Technology"),
      description,
    },
    registrationLinks: registrationLinks(domain),
  };
}

/* --------------------------------- Route --------------------------------- */

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const niche = String(body?.niche ?? "").trim().slice(0, 100);

  const headerProvider = req.headers.get("x-provider") || process.env.DEFAULT_AI_PROVIDER || "groq";
  const provider: Provider = headerProvider === "anthropic" ? "anthropic" : "groq";
  const serperKey = (req.headers.get("x-serper-key") || process.env.SERPER_API_KEY || "").trim();
  const groqKey = (req.headers.get("x-groq-key") || process.env.GROQ_API_KEY || "").trim();
  const anthropicKey = (req.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY || "").trim();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: HuntEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      const log = (message: string, level: LogLevel = "info") => send({ type: "log", level, message });

      try {
        if (!serperKey) throw new Error("Missing Serper.dev API key. Add it in Settings.");
        if (provider === "groq" && !groqKey) throw new Error("Missing Groq API key. Add it in Settings.");
        if (provider === "anthropic" && !anthropicKey) throw new Error("Missing Anthropic API key. Add it in Settings.");

        const cfg: LLMConfig = { provider, groqKey, anthropicKey };
        const providerLabel = provider === "groq" ? "Groq (openai/gpt-oss-120b)" : "Anthropic Claude";
        const year = new Date().getFullYear();

        log(`Step 1: Scouring live market trends via Serper.dev${niche ? ` for "${niche}"` : ""}...`);
        const queries = niche
          ? [`${niche} startups funding trends ${year}`, `${niche} domain name sales Afternic ${year}`]
          : [`startups raised funding seed series A ${year}`, `domain name sales Afternic ${year} .com`];

        const searchResults = await Promise.all(queries.map((q) => serperSearch(q, serperKey).catch(() => [])));
        const snippets = searchResults
          .flat()
          .map((r) => `- ${r.title ?? ""}: ${r.snippet ?? ""}`)
          .filter((s) => s.length > 6)
          .slice(0, 15)
          .join("\n");
        if (!snippets) throw new Error("Serper.dev returned no results. Check your Serper API key and quota.");
        log(`Collected ${snippets.split("\n").length} live market snippets.`, "success");

        let generatedTotal = 0;
        const seen = new Set<string>();
        const available: string[] = [];

        // Single optimized round to prevent token rate limits on free tier
        log(`Step 2: Generating Sniper candidates with ${providerLabel}...`);
        const userPrompt = `Market research:\n${snippets}\n\nNiche: ${niche || "B2B SaaS AI"}\n\nGenerate 15 short brandable .com domain candidates (1-2 words, max 10 letters, no hyphens/numbers). Return ONLY raw JSON: {"candidates":[{"domain":"example.com","reason":"short"}]}`;

        const text = await callLLM(cfg, SNIPER_SYSTEM, userPrompt);
        const parsed = parseJSON<{ candidates?: { domain?: unknown }[] }>(text);
        const candidates = (parsed.candidates || [])
          .map((c) => normalizeDomain(c?.domain))
          .filter((d): d is string => !!d && !seen.has(d));
        const unique = Array.from(new Set(candidates));
        unique.forEach((d) => seen.add(d));
        generatedTotal += unique.length;
        log(`Generated ${unique.length} valid candidates.`, "success");

        if (unique.length > 0) {
          log(`Step 3: Verifying live RDAP/DNS availability for ${unique.length} domains...`);
          const result = await filterAvailable(unique);
          available.push(...result.available);
          log(
            `${result.available.length} available, ${result.taken.length} already registered.`,
            result.available.length > 0 ? "success" : "warn"
          );
        }

        if (available.length === 0) {
          throw new Error("No unregistered domains were found this run. Try again or pick a different niche.");
        }

        log("Step 4: Generating Afternic valuation report for the Goldmine picks...");
        const valuationPrompt = `Verified unregistered domains:\n${available.join(", ")}\n\nMarket context:\n${snippets}\n\nSelect best 3 domains. Return ONLY raw JSON: {"deals":[{"domain":"example.com","sniperScore":85,"whyValuable":"3 sentences","targetBuyers":["SaaS"],"comparableSales":"2 sentences","afternicPricing":{"bin":1950,"floor":900,"minOffer":700},"marketplaceCopy":{"category":"Tech","description":"line1\nline2\nline3"}}]}`;

        const valuationText = await callLLM(cfg, VALUATION_SYSTEM, valuationPrompt);
        const valuation = parseJSON<{ deals?: RawDeal[] }>(valuationText);
        const availableSet = new Set(available);
        const deals: Deal[] = [];
        for (const raw of valuation.deals || []) {
          const domain = normalizeDomain(raw?.domain);
          if (domain && availableSet.has(domain) && !deals.some((d) => d.domain === domain)) {
            deals.push(cleanDeal(raw, domain));
          }
          if (deals.length >= 3) break;
        }
        if (deals.length === 0) throw new Error("The AI returned no usable valuation. Please try again.");
        deals.sort((a, b) => b.sniperScore - a.sniperScore);

        log(`Done. ${deals.length} Goldmine picks ready.`, "success");
        send({ type: "result", deals, stats: { generated: generatedTotal, available: available.length } });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Unexpected error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}