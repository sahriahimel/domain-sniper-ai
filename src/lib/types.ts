export type Provider = "groq" | "anthropic";

export interface Settings {
  provider: Provider;
  serperKey: string;
  groqKey: string;
  anthropicKey: string;
}

export interface Deal {
  domain: string;
  sniperScore: number;
  whyValuable: string;
  targetBuyers: string[];
  comparableSales: string;
  afternicPricing: {
    bin: number;
    floor: number;
    minOffer: number;
  };
  marketplaceCopy: {
    category: string;
    description: string;
  };
  registrationLinks: {
    namecheap: string;
    dynadot: string;
    sav: string;
  };
}

export type LogLevel = "info" | "success" | "warn" | "error";

export type HuntEvent =
  | { type: "log"; level: LogLevel; message: string }
  | { type: "result"; deals: Deal[]; stats: { generated: number; available: number } }
  | { type: "error"; message: string };
