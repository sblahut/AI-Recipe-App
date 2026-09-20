export const STORE_CHAINS = [
  "Publix",
  "Food Lion",
  "Walmart",
  "Aldi",
  "Lidl",
  "Giant",
  "Harris Teeter",
  "Wegmans",
  "Target",
  "Other",
] as const;

export type StoreChain = (typeof STORE_CHAINS)[number];

export const PUBLIX_WEEKLY_AD = "https://www.publix.com/savings/weekly-ad";

const WEEKLY_AD_URLS: Record<StoreChain, string | null> = {
  Publix: PUBLIX_WEEKLY_AD,
  "Food Lion": "https://www.foodlion.com/weekly-ad",
  Walmart: "https://www.walmart.com/shop/deals/weekly-ad",
  Aldi: "https://www.aldi.us/en/weekly-specials/",
  Lidl: "https://www.lidl.com/weekly-ad",
  Giant: "https://giantfood.com/savings/weekly-ad",
  "Harris Teeter": "https://www.harristeeter.com/weeklyad",
  Wegmans: "https://www.wegmans.com/weekly-ad/",
  Target: "https://www.target.com/c/weekly-ad/-/N-4xsxm",
  Other: null,
};

export function weeklyAdUrlForChain(chain: StoreChain): string | null {
  return WEEKLY_AD_URLS[chain];
}

function inferChainFromStoreName(name: string): StoreChain | null {
  const lower = name.toLowerCase();
  if (lower.includes("publix")) return "Publix";
  if (lower.includes("food lion")) return "Food Lion";
  if (lower.includes("walmart")) return "Walmart";
  if (lower.includes("aldi")) return "Aldi";
  if (lower.includes("lidl")) return "Lidl";
  if (lower.includes("giant")) return "Giant";
  if (lower.includes("harris teeter")) return "Harris Teeter";
  if (lower.includes("wegmans")) return "Wegmans";
  if (lower.includes("target")) return "Target";
  return null;
}

/** Chain used for weekly-ad links (explicit chain on the store, or inferred from name). */
export function weeklyAdChainForStore(store: { chain: StoreChain; name: string }): StoreChain | null {
  if (weeklyAdUrlForChain(store.chain)) {
    return store.chain;
  }
  return inferChainFromStoreName(store.name);
}

export function weeklyAdUrlForStore(store: { chain: StoreChain; name: string }): string | null {
  const chain = weeklyAdChainForStore(store);
  if (chain) {
    return weeklyAdUrlForChain(chain);
  }
  return null;
}

/** Unique chains among saved stores that have a known weekly-ad URL. */
export function weeklyAdChainsForStores(
  stores: readonly { chain: StoreChain; name: string }[],
): StoreChain[] {
  const seen = new Set<StoreChain>();
  const out: StoreChain[] = [];
  for (const store of stores) {
    const chain = weeklyAdChainForStore(store);
    if (chain && !seen.has(chain)) {
      seen.add(chain);
      out.push(chain);
    }
  }
  return out;
}

/** Chains to show under Weekly ad (saved stores + common defaults, deduped). */
export function weeklyAdChainsForPicker(
  stores: readonly { chain: StoreChain; name: string }[],
): StoreChain[] {
  const defaults: StoreChain[] = [
    "Publix",
    "Food Lion",
    "Walmart",
    "Aldi",
    "Wegmans",
    "Target",
    "Lidl",
    "Giant",
    "Harris Teeter",
  ];
  const seen = new Set<StoreChain>();
  const out: StoreChain[] = [];
  for (const chain of [...weeklyAdChainsForStores(stores), ...defaults]) {
    if (chain === "Other" || !weeklyAdUrlForChain(chain) || seen.has(chain)) {
      continue;
    }
    seen.add(chain);
    out.push(chain);
  }
  return out;
}
