import type { Recipe, MealPlanEntryIngredient } from '@/types'

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
  unsaturated_fat: number
  sugar: number
}

export interface PlannedMeal {
  recipe: Recipe
  servingGrams: number
}

export function calcServingMacros(recipe: Recipe, servingGrams: number): Macros {
  let totalKcal = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  let totalUnsaturatedFat = 0
  let totalSugar = 0

  for (const ing of recipe.ingredients) {
    let amountInBase = ing.amount
    if (ing.unit === 'pieces' && ing.weight_per_unit) {
      amountInBase = ing.amount * ing.weight_per_unit
    }
    totalKcal += (ing.kcal_per_100 * amountInBase) / 100
    totalProtein += (ing.protein_per_100 * amountInBase) / 100
    totalCarbs += (ing.carbs_per_100 * amountInBase) / 100
    totalFat += (ing.fat_per_100 * amountInBase) / 100
    totalUnsaturatedFat += (ing.unsaturated_fat_per_100 * amountInBase) / 100
    totalSugar += (ing.sugar_per_100 * amountInBase) / 100
  }

  const totalWeight = recipe.ingredients.reduce((sum, ing) => {
    let amountInBase = ing.amount
    if (ing.unit === 'pieces' && ing.weight_per_unit) {
      amountInBase = ing.amount * ing.weight_per_unit
    }
    return sum + amountInBase
  }, 0)

  const cookedTotalWeight = totalWeight * (recipe.yield ?? 100) / 100

  if (cookedTotalWeight === 0) {
    return { kcal: 0, protein: 0, carbs: 0, fat: 0, unsaturated_fat: 0, sugar: 0 }
  }

  const scale = servingGrams / cookedTotalWeight
  const r = (n: number) => Math.round(n * 10) / 10
  return {
    kcal: r(totalKcal * scale),
    protein: r(totalProtein * scale),
    carbs: r(totalCarbs * scale),
    fat: r(totalFat * scale),
    unsaturated_fat: r(totalUnsaturatedFat * scale),
    sugar: r(totalSugar * scale),
  }
}

export function calcCustomizedServingMacros(
  recipe: Recipe,
  servingGrams: number,
  customizedIngredients: MealPlanEntryIngredient[]
): Macros {
  let totalKcal = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  let totalUnsaturatedFat = 0
  let totalSugar = 0

  for (const ing of customizedIngredients) {
    let amountInBase = ing.amount
    if (ing.unit === 'pcs' && ing.weight_per_unit) {
      amountInBase = ing.amount * ing.weight_per_unit
    }
    totalKcal += (ing.kcal_per_100 * amountInBase) / 100
    totalProtein += (ing.protein_per_100 * amountInBase) / 100
    totalCarbs += (ing.carbs_per_100 * amountInBase) / 100
    totalFat += (ing.fat_per_100 * amountInBase) / 100
    totalUnsaturatedFat += (ing.unsaturated_fat_per_100 * amountInBase) / 100
    totalSugar += (ing.sugar_per_100 * amountInBase) / 100
  }

  const totalWeight = customizedIngredients.reduce((sum, ing) => {
    let amountInBase = ing.amount
    if (ing.unit === 'pcs' && ing.weight_per_unit) {
      amountInBase = ing.amount * ing.weight_per_unit
    }
    return sum + amountInBase
  }, 0)

  const cookedTotalWeight = totalWeight * (recipe.yield ?? 100) / 100

  if (cookedTotalWeight === 0) {
    return { kcal: 0, protein: 0, carbs: 0, fat: 0, unsaturated_fat: 0, sugar: 0 }
  }

  const scale = servingGrams / cookedTotalWeight
  const r = (n: number) => Math.round(n * 10) / 10
  return {
    kcal: r(totalKcal * scale),
    protein: r(totalProtein * scale),
    carbs: r(totalCarbs * scale),
    fat: r(totalFat * scale),
    unsaturated_fat: r(totalUnsaturatedFat * scale),
    sugar: r(totalSugar * scale),
  }
}

export function calcIngredientMacros(
  ingredient: { kcal_per_100: number; protein_per_100: number; carbs_per_100: number; fat_per_100: number; unsaturated_fat_per_100: number; sugar_per_100: number; weight_per_unit?: number | null },
  amount: number,
  unit: string
): Macros {
  let amountInBase = amount
  if (unit === 'pcs' && ingredient.weight_per_unit) {
    amountInBase = amount * ingredient.weight_per_unit
  }
  const r = (n: number) => Math.round(n * 10) / 10
  return {
    kcal: r((ingredient.kcal_per_100 * amountInBase) / 100),
    protein: r((ingredient.protein_per_100 * amountInBase) / 100),
    carbs: r((ingredient.carbs_per_100 * amountInBase) / 100),
    fat: r((ingredient.fat_per_100 * amountInBase) / 100),
    unsaturated_fat: r((ingredient.unsaturated_fat_per_100 * amountInBase) / 100),
    sugar: r((ingredient.sugar_per_100 * amountInBase) / 100),
  }
}

export function sumMacros(meals: PlannedMeal[]): Macros {
  return meals.reduce(
    (acc, meal) => {
      const m = calcServingMacros(meal.recipe, meal.servingGrams)
      return {
        kcal: acc.kcal + m.kcal,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
        unsaturated_fat: acc.unsaturated_fat + m.unsaturated_fat,
        sugar: acc.sugar + m.sugar,
      }
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, unsaturated_fat: 0, sugar: 0 }
  )
}
