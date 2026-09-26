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

export const proposedIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable().optional(),
  quantity_kind: quantityKindSchema.optional(),
  unit: z.string().nullable().optional(),
});
export type ProposedIngredient = z.infer<typeof proposedIngredientSchema>;

export const receiptProposeResponseSchema = z.object({
  items: z.array(proposedIngredientSchema),
});

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

export const homeNetworkSchema = z.object({
  lan_host: z.string().nullable(),
  api_base_url: z.string().nullable(),
  expo_go_url: z.string().nullable(),
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
  uses_from_publix_bogo: z.array(z.string()).optional(),
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

export const recipeChatMessageSchema = z.object({
  id: z.number(),
  role: z.string(),
  content: z.string(),
  recipes: z.array(generatedRecipeSchema).optional().default([]),
  created_at: z.string(),
});
export type RecipeChatMessage = z.infer<typeof recipeChatMessageSchema>;

export const recipeChatSendResponseSchema = z.object({
  session_id: z.number(),
  reply_kind: z.enum(["message", "recipes"]),
  assistant_message: z.string(),
  recipes: z.array(generatedRecipeSchema).optional().default([]),
  saved_recipes: z.array(savedRecipeReadSchema).optional().default([]),
  messages: z.array(recipeChatMessageSchema),
});
export type RecipeChatSendResponse = z.infer<typeof recipeChatSendResponseSchema>;

export const recipeChatSessionSummarySchema = z.object({
  id: z.number(),
  updated_at: z.string(),
  preview: z.string(),
  message_count: z.number(),
});
export type RecipeChatSessionSummary = z.infer<typeof recipeChatSessionSummarySchema>;

export const recipeChatSessionDetailSchema = z.object({
  id: z.number(),
  updated_at: z.string(),
  messages: z.array(recipeChatMessageSchema),
});
export type RecipeChatSessionDetail = z.infer<typeof recipeChatSessionDetailSchema>;

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

export const mealSlotSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export type MealSlot = z.infer<typeof mealSlotSchema>;

export const mealPlanEntrySchema = z.object({
  id: z.number(),
  plan_date: z.string(),
  meal_slot: mealSlotSchema,
  saved_recipe_id: z.number(),
  recipe_title: z.string(),
  created_at: z.string(),
});
export type MealPlanEntry = z.infer<typeof mealPlanEntrySchema>;

export const shoppingFromMealPlanResponseSchema = z.object({
  added: z.array(shoppingListItemSchema),
  skipped_in_pantry: z.array(z.string()),
  missing_entry_ids: z.array(z.number()).optional().default([]),
  meals_processed: z.number().optional().default(0),
});
export type ShoppingFromMealPlanResponse = z.infer<typeof shoppingFromMealPlanResponseSchema>;

export const productReadSchema = z.object({
  barcode: z.string(),
  name: z.string(),
  brand: z.string().nullable().optional(),
  default_quantity_kind: z.enum(["count", "weight", "volume"]).nullable().optional(),
  default_quantity: z.number().nullable().optional(),
  default_unit: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});
export type ProductRead = z.infer<typeof productReadSchema>;

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
