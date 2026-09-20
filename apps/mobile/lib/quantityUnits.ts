import type { QuantityKind } from "@/lib/schemas";

/** Keep in sync with server `app/units.py` UNITS_BY_KIND. */
export const QUANTITY_UNITS_BY_KIND: Record<QuantityKind, readonly string[]> = {
  count: ["each", "piece", "bunch", "clove", "can", "bag", "box", "pack", "dozen"],
  weight: ["g", "kg", "oz", "lb"],
  volume: ["ml", "l", "fl_oz", "cup", "tbsp", "tsp", "gal", "qt", "pt"],
};

const UNIT_LABELS: Record<string, string> = {
  ml: "mL",
  l: "L",
  fl_oz: "fl oz",
  gal: "gal",
  qt: "qt",
  pt: "pt",
  tbsp: "tbsp",
  tsp: "tsp",
  oz: "oz",
  lb: "lb",
  kg: "kg",
  g: "g",
};

export function formatUnitLabel(unit: string): string {
  return UNIT_LABELS[unit] ?? unit;
}

export function defaultUnitsByKind(): Record<QuantityKind, string[]> {
  return {
    count: [...QUANTITY_UNITS_BY_KIND.count],
    weight: [...QUANTITY_UNITS_BY_KIND.weight],
    volume: [...QUANTITY_UNITS_BY_KIND.volume],
  };
}

/** API list plus canonical defaults; keeps current unit if already saved. */
export function unitsForKind(
  kind: QuantityKind,
  fromApi: Record<QuantityKind, string[]>,
  selectedUnit?: string | null,
): string[] {
  const merged = new Set<string>([...QUANTITY_UNITS_BY_KIND[kind], ...fromApi[kind]]);
  if (selectedUnit?.trim()) {
    merged.add(selectedUnit.trim());
  }
  const order = QUANTITY_UNITS_BY_KIND[kind];
  const ordered = order.filter((u) => merged.has(u));
  for (const u of merged) {
    if (!ordered.includes(u)) {
      ordered.push(u);
    }
  }
  return ordered;
}

export function mergeQuantityUnitsFromApi(
  kinds: Partial<Record<QuantityKind, string[]>>,
): Record<QuantityKind, string[]> {
  const base = defaultUnitsByKind();
  return {
    count: kinds.count?.length ? [...new Set([...base.count, ...kinds.count])] : base.count,
    weight: kinds.weight?.length ? [...new Set([...base.weight, ...kinds.weight])] : base.weight,
    volume: kinds.volume?.length ? [...new Set([...base.volume, ...kinds.volume])] : base.volume,
  };
}
