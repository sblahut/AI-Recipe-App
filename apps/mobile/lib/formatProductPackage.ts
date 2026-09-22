import type { z } from "zod";

import { productReadSchema } from "@/lib/schemas";

export type ProductRead = z.infer<typeof productReadSchema>;

/** Human-readable package size from catalog defaults (e.g. "1 l"). */
export function formatProductPackage(product: ProductRead): string | null {
  const qty = product.default_quantity;
  const unit = product.default_unit?.trim();
  if (qty == null || !unit) {
    return null;
  }
  const n = Number(qty);
  const amount = Number.isInteger(n) ? String(n) : String(qty);
  return `${amount} ${unit}`;
}
