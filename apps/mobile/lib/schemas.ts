import { z } from "zod";

export const quantityKindSchema = z.enum(["count", "weight", "volume"]);
export type QuantityKind = z.infer<typeof quantityKindSchema>;

export const ingredientSchema = z.object({
  id: z.number(),
  name: z.string(),
  quantity: z.number().nullable(),
  quantity_kind: quantityKindSchema,
  unit: z.string().nullable(),
  location: z.string().nullable(),
  barcode: z.string().nullable(),
  expires_at: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Ingredient = z.infer<typeof ingredientSchema>;

export const ingredientCreateSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable().optional(),
  quantity_kind: quantityKindSchema.optional(),
  unit: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type IngredientCreate = z.infer<typeof ingredientCreateSchema>;

export const quantityUnitsSchema = z.object({
  kinds: z.record(quantityKindSchema, z.array(z.string())),
});

export const healthSchema = z.object({
  status: z.string(),
  ollama: z.boolean(),
});

export const recipeIngredientSchema = z.object({
  name: z.string(),
  quantity: z.string().nullable().optional(),
});

export const generatedRecipeSchema = z.object({
  title: z.string(),
  servings: z.number().nullable().optional(),
  prep_minutes: z.number().nullable().optional(),
  ingredients: z.array(recipeIngredientSchema),
  steps: z.array(z.string()),
  uses_from_pantry: z.array(z.string()).optional(),
});
export type GeneratedRecipe = z.infer<typeof generatedRecipeSchema>;

export const savedRecipeReadSchema = z.object({
  id: z.number(),
  title: z.string(),
  recipe: generatedRecipeSchema,
  favorite: z.boolean(),
  created_at: z.string(),
});
export type SavedRecipe = z.infer<typeof savedRecipeReadSchema>;

export const recipeGenerateResponseSchema = z.object({
  recipes: z.array(generatedRecipeSchema),
  saved_recipes: z.array(savedRecipeReadSchema).optional().default([]),
});

export const recipeImportResponseSchema = z.object({
  recipe: generatedRecipeSchema,
  saved_recipe: savedRecipeReadSchema.nullable().optional(),
});

export const shoppingListSchema = z.object({
  id: z.number(),
  name: z.string(),
  done: z.boolean(),
  created_at: z.string(),
});
export type ShoppingList = z.infer<typeof shoppingListSchema>;

export const shoppingListItemSchema = z.object({
  id: z.number(),
  shopping_list_id: z.number(),
  name: z.string(),
  quantity: z.number().nullable(),
  quantity_kind: quantityKindSchema,
  unit: z.string().nullable(),
  barcode: z.string().nullable(),
  checked: z.boolean(),
});
export type ShoppingListItem = z.infer<typeof shoppingListItemSchema>;

export const shoppingListDetailSchema = shoppingListSchema.extend({
  items: z.array(shoppingListItemSchema),
});
export type ShoppingListDetail = z.infer<typeof shoppingListDetailSchema>;

export const shoppingFromRecipeResponseSchema = z.object({
  added: z.array(shoppingListItemSchema),
  skipped_in_pantry: z.array(z.string()),
});
export type ShoppingFromRecipeResponse = z.infer<typeof shoppingFromRecipeResponseSchema>;

export const productReadSchema = z.object({
  barcode: z.string(),
  name: z.string(),
  brand: z.string().nullable().optional(),
});

export const barcodeScanResponseSchema = z.object({
  barcode: z.string(),
  product: z
    .object({
      barcode: z.string(),
      name: z.string(),
      brand: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  unknown: z.boolean(),
  ingredient_id: z.number().nullable().optional(),
  shopping_list_item_id: z.number().nullable().optional(),
});
