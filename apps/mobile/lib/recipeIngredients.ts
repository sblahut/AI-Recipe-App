import type { GeneratedRecipe, IngredientCreate } from "@/lib/schemas";

/** Map recipe lines to inventory rows (best-effort quantity parsing). */
export function recipeToIngredientCreates(
  recipe: GeneratedRecipe,
  defaultLocation: string,
): IngredientCreate[] {
  return recipe.ingredients.map((line) => {
    const parsed = parseIngredientLine(line.name, line.quantity ?? null);
    return {
      name: parsed.name,
      quantity_kind: parsed.quantity_kind,
      quantity: parsed.quantity,
      unit: parsed.unit,
      location: defaultLocation,
    };
  });
}

function parseIngredientLine(
  name: string,
  quantityText: string | null,
): Pick<IngredientCreate, "name" | "quantity" | "quantity_kind" | "unit"> {
  const trimmedName = name.trim();
  const qty = quantityText?.trim() ?? "";
  if (!qty) {
    return { name: trimmedName, quantity: null, quantity_kind: "count", unit: null };
  }

  const match = /^([\d./]+)\s*(\w+)?/.exec(qty);
  if (!match) {
    return { name: trimmedName, quantity: null, quantity_kind: "count", unit: null };
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? null;
  if (Number.isNaN(amount)) {
    return { name: trimmedName, quantity: null, quantity_kind: "count", unit: null };
  }

  const weightUnits = new Set(["g", "kg", "oz", "lb", "lbs"]);
  const volumeUnits = new Set(["ml", "l", "cup", "cups", "tbsp", "tsp"]);

  if (unit && weightUnits.has(unit)) {
    return { name: trimmedName, quantity: amount, quantity_kind: "weight", unit };
  }
  if (unit && volumeUnits.has(unit)) {
    return { name: trimmedName, quantity: amount, quantity_kind: "volume", unit };
  }

  return { name: trimmedName, quantity: amount, quantity_kind: "count", unit: unit ?? "each" };
}
