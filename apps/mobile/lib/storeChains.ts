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

export function weeklyAdUrlForStore(store: { chain: StoreChain; name: string }): string | null {
  const fromChain = weeklyAdUrlForChain(store.chain);
  if (fromChain) {
    return fromChain;
  }
  const name = store.name.toLowerCase();
  if (name.includes("publix")) return WEEKLY_AD_URLS.Publix;
  if (name.includes("food lion")) return WEEKLY_AD_URLS["Food Lion"];
  if (name.includes("walmart")) return WEEKLY_AD_URLS.Walmart;
  if (name.includes("aldi")) return WEEKLY_AD_URLS.Aldi;
  if (name.includes("lidl")) return WEEKLY_AD_URLS.Lidl;
  if (name.includes("giant")) return WEEKLY_AD_URLS.Giant;
  if (name.includes("harris teeter")) return WEEKLY_AD_URLS["Harris Teeter"];
  if (name.includes("wegmans")) return WEEKLY_AD_URLS.Wegmans;
  if (name.includes("target")) return WEEKLY_AD_URLS.Target;
  return null;
}
