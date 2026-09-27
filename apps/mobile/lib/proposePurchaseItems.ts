import { apiJson } from "@/lib/api";
import {
  proposedIngredientSchema,
  receiptProposeResponseSchema,
  type ProposedIngredient,
} from "@/lib/schemas";
import { z } from "zod";

export type ProposePurchaseSource =
  | { kind: "image"; imageBase64: string }
  | { kind: "url"; url: string }
  | { kind: "text"; text: string };

export async function proposePurchaseItems(
  source: ProposePurchaseSource,
  serverUrl: string,
): Promise<ProposedIngredient[]> {
  const body =
    source.kind === "image"
      ? { image_base64: source.imageBase64 }
      : source.kind === "url"
        ? { url: source.url.trim() }
        : { text: source.text.trim() };

  const raw = await apiJson<unknown>("/inventory/propose-receipt", {
    baseUrl: serverUrl,
    method: "POST",
    body: JSON.stringify(body),
  });
  const parsed = receiptProposeResponseSchema.parse(raw);
  return z.array(proposedIngredientSchema).parse(parsed.items);
}
