/**
 * Application types — derived from the auto-generated OpenAPI types.
 * Do not define API shapes here manually; update the backend annotations
 * and regenerate with the commands in README / agents.md instead.
 */
import type { components } from '@/api/types'

type Schemas = components['schemas']

// ── Tags ───────────────────────────────────────────────────────────────────

export type Tag = Required<Schemas['internal_api.TagResponse']>
export type CreateTagPayload = Schemas['internal_api.CreateTagRequest']
export type UpdateTagPayload = Schemas['internal_api.CreateTagRequest']

// ── Ingredients ────────────────────────────────────────────────────────────

export type Ingredient = Omit<Required<Schemas['internal_api.IngredientResponse']>, 'tags'> & {
  tags: Tag[]
}
export type CreateIngredientPayload = Schemas['internal_api.CreateIngredientRequest']

// ── Recipes ────────────────────────────────────────────────────────────────

export type RecipeIngredient = Omit<Required<Schemas['internal_api.RecipeIngredientResponse']>, 'tags'> & {
  tags: Tag[]
}
export type Recipe = Omit<Required<Schemas['internal_api.RecipeResponse']>, 'ingredients' | 'tags'> & {
  ingredients: RecipeIngredient[]
  tags: Tag[]
}
export type CreateRecipePayload = Schemas['internal_api.CreateRecipeRequest']
export type UpdateRecipePayload = Schemas['internal_api.CreateRecipeRequest']

// ── Persons ────────────────────────────────────────────────────────────────

export type PersonSettings = Required<Schemas['internal_api.PersonSettingsResponse']>
export type Person = Required<Schemas['internal_api.PersonResponse']>
export type CreatePersonPayload = Schemas['internal_api.CreatePersonRequest']
export type UpdatePersonPayload = Schemas['internal_api.UpdatePersonRequest']
export type UpdatePersonSettingsPayload = Schemas['internal_api.UpdatePersonSettingsRequest']

// ── Meal Plan ──────────────────────────────────────────────────────────────

export type MealPlanIngredient = {
  id: number
  name: string
  kcal_per_100: number
  protein_per_100: number
  carbs_per_100: number
  fat_per_100: number
  unsaturated_fat_per_100: number
  sugar_per_100: number
  image_path: string | null
  weight_per_unit: number | null
}

export type MealPlanEntryIngredient = Required<Schemas['internal_api.MealPlanEntryIngredientResponse']>

export type MealPlanEntry = Omit<
  Required<Schemas['internal_api.MealPlanEntryResponse']>,
  'ingredient' | 'ingredient_id' | 'recipe_id' | 'serving_grams' | 'amount' | 'unit' | 'customized_ingredients'
> & {
  recipe_id: number | null
  serving_grams: number | null
  ingredient_id: number | null
  amount: number | null
  unit: string | null
  ingredient?: MealPlanIngredient
  customized_ingredients?: MealPlanEntryIngredient[]
}

export type CreateMealPlanEntryPayload = Schemas['internal_api.CreateMealPlanEntryRequest']
export type UpdateMealPlanEntryPayload = Schemas['internal_api.UpdateMealPlanEntryRequest']
