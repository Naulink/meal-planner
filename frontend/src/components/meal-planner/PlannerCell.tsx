import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { MacroProgress } from './MacroProgress'
import { RecipePicker } from './RecipePicker'
import { RecipeThumbnail, IngredientThumbnail } from '@/components/shared/Thumbnails'
import { calcServingMacros, calcIngredientMacros } from '@/lib/nutrition'
import type { Person, MealPlanEntry, Recipe, Ingredient } from '@/types'
import type { Macros } from '@/lib/nutrition'

interface PlannerCellProps {
  person: Person
  dayIndex: number
  entries: MealPlanEntry[]
  recipes: Recipe[]
  ingredients: Ingredient[]
  onAdd: (personId: number, dayIndex: number, recipeId: number, servingGrams: number) => Promise<void>
  onUpdate: (id: number, data: { serving_grams?: number; amount?: number }) => Promise<void>
  onRemove: (id: number) => Promise<void>
  onAddIngredient: (personId: number, dayIndex: number, ingredientId: number, amount: number, unit: string) => Promise<void>
}


function sumEntryMacros(entries: MealPlanEntry[], recipes: Recipe[]): Macros {
  let kcal = 0, protein = 0, carbs = 0, fat = 0, unsaturated_fat = 0, sugar = 0
  for (const entry of entries) {
    if (entry.ingredient && entry.amount != null && entry.unit) {
      const m = calcIngredientMacros(entry.ingredient, entry.amount, entry.unit)
      kcal += m.kcal
      protein += m.protein
      carbs += m.carbs
      fat += m.fat
      unsaturated_fat += m.unsaturated_fat
      sugar += m.sugar
    } else if (entry.recipe_id != null && entry.serving_grams != null) {
      const recipe = recipes.find(r => r.id === entry.recipe_id)
      if (!recipe) continue
      const m = calcServingMacros(recipe, entry.serving_grams)
      kcal += m.kcal
      protein += m.protein
      carbs += m.carbs
      fat += m.fat
      unsaturated_fat += m.unsaturated_fat
      sugar += m.sugar
    }
  }
  return { kcal, protein, carbs, fat, unsaturated_fat, sugar }
}

type PendingItem = { key: number; ingredient: Ingredient; amount: number; unit: 'g' | 'ml' | 'pcs' }

export function PlannerCell({ person, dayIndex, entries, recipes, ingredients, onAdd, onUpdate, onRemove, onAddIngredient }: PlannerCellProps) {
  const [pendingIngredients, setPendingIngredients] = useState<PendingItem[]>([])
  const [nextKey, setNextKey] = useState(0)

  const totals = sumEntryMacros(entries, recipes)
  const targets = {
    person_id: person.id,
    target_kcal: person.settings.target_kcal ?? 2000,
    target_protein: person.settings.target_protein ?? 150,
    target_carbs: person.settings.target_carbs ?? 200,
    target_fat: person.settings.target_fat ?? 65,
  }

  const handleAddRecipe = async (recipe: Recipe) => {
    try {
      const totalWeight = recipe.ingredients.reduce((sum, ing) => {
        const base = ing.unit === 'pieces' && ing.weight_per_unit ? ing.amount * ing.weight_per_unit : ing.amount
        return sum + base
      }, 0)
      const yieldFactor = (recipe.yield ?? 100) / 100
      const cookedWeight = totalWeight * yieldFactor
      const defaultGrams = recipe.persons > 0 && cookedWeight > 0
        ? Math.round(cookedWeight / recipe.persons)
        : 100
      await onAdd(person.id, dayIndex, recipe.id, defaultGrams)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add recipe')
    }
  }

  const handleSelectIngredient = (ingredient: Ingredient) => {
    const defaultUnit = (ingredient.nutrition_basis as 'g' | 'ml') ?? 'g'
    setPendingIngredients(prev => [...prev, { key: nextKey, ingredient, amount: 100, unit: defaultUnit }])
    setNextKey(prev => prev + 1)
  }

  const handleConfirmIngredient = async (item: PendingItem) => {
    try {
      await onAddIngredient(person.id, dayIndex, item.ingredient.id, item.amount, item.unit)
      setPendingIngredients(prev => prev.filter(p => p.key !== item.key))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add ingredient')
    }
  }

  const handleCancelIngredient = (key: number) => {
    setPendingIngredients(prev => prev.filter(p => p.key !== key))
  }

  const handleUpdatePending = (key: number, field: 'amount' | 'unit', value: number | string) => {
    setPendingIngredients(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p))
  }

  const handleUpdateGrams = async (entry: MealPlanEntry, grams: number) => {
    if (grams <= 0) return
    try {
      await onUpdate(entry.id, { serving_grams: grams })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const handleUpdateAmount = async (entry: MealPlanEntry, amount: number) => {
    if (amount <= 0) return
    try {
      await onUpdate(entry.id, { amount })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const handleRemove = async (id: number) => {
    try {
      await onRemove(id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove')
    }
  }

  return (
    <div className={cn('p-5 border-r-[3px] border-b-[3px] border-zinc-300 dark:border-zinc-600 flex flex-col gap-3', dayIndex % 2 === 0 ? 'bg-muted/20' : 'bg-card')}>
      <MacroProgress totals={totals} targets={targets} />

      <div className="flex-1 space-y-1">
        {/* Recipe entries */}
        {entries.filter(e => !e.ingredient).map(entry => {
          const recipe = recipes.find(r => r.id === entry.recipe_id)
          const macros = recipe && entry.serving_grams != null ? calcServingMacros(recipe, entry.serving_grams) : null
          return (
            <div key={entry.id} className="flex items-center gap-2 text-sm">
              <a
                href={`/recipes/${entry.recipe_id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="shrink-0"
              >
                {recipe
                  ? <RecipeThumbnail imageUrl={recipe.image_url} name={recipe.name} />
                  : <div className="h-8 w-8 shrink-0 rounded-sm bg-muted" />
                }
              </a>
              <a
                href={`/recipes/${entry.recipe_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate hover:underline"
                onClick={e => e.stopPropagation()}
              >
                {recipe?.name ?? `Recipe #${entry.recipe_id}`}
              </a>
              {macros && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {macros.kcal}kcal
                </span>
              )}
              <Input
                type="number"
                className="w-16 h-6 text-xs text-right px-1"
                value={entry.serving_grams ?? 0}
                min={1}
                onChange={e => {
                  const grams = parseFloat(e.target.value)
                  if (!isNaN(grams) && grams > 0) {
                    void handleUpdateGrams(entry, grams)
                  }
                }}
              />
              <span className="text-xs text-muted-foreground w-4 shrink-0">g</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 shrink-0"
                onClick={() => void handleRemove(entry.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )
        })}

        {/* Divider between recipes and ingredients */}
        {entries.some(e => !e.ingredient) && entries.some(e => e.ingredient) && (
          <div className="border-t border-border my-1" />
        )}

        {/* Ingredient entries */}
        {entries.filter(e => e.ingredient && e.amount != null && e.unit).map(entry => {
          const ing = entry.ingredient!
          const imageUrl = ingredients.find(i => i.id === ing.id)?.image_url
          const macros = calcIngredientMacros(ing, entry.amount!, entry.unit!)
          return (
            <div key={entry.id} className="flex items-center gap-2 text-sm">
              <IngredientThumbnail imageUrl={imageUrl} name={ing.name} />
              <span className="flex-1 truncate">{ing.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {macros.kcal}kcal
              </span>
              <Input
                type="number"
                className="w-16 h-6 text-xs text-right px-1"
                value={entry.amount ?? 0}
                min={1}
                onChange={e => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val) && val > 0) {
                    void handleUpdateAmount(entry, val)
                  }
                }}
              />
              <span className="text-xs text-muted-foreground w-4 shrink-0">{entry.unit}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 shrink-0"
                onClick={() => void handleRemove(entry.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )
        })}

        {pendingIngredients.map(item => (
          <div key={item.key} className="flex items-center gap-2 text-sm mt-2 p-2 rounded-md border border-dashed border-muted-foreground/40 bg-muted/30">
            <IngredientThumbnail imageUrl={item.ingredient.image_url} name={item.ingredient.name} />
            <span className="flex-1 truncate text-xs">{item.ingredient.name}</span>
            <Input
              type="number"
              className="w-16 h-6 text-xs text-right px-1"
              value={item.amount}
              min={1}
              onChange={e => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val) && val > 0) handleUpdatePending(item.key, 'amount', val)
              }}
            />
            <Select
              value={item.unit}
              onValueChange={v => handleUpdatePending(item.key, 'unit', v)}
            >
              <SelectTrigger className="w-14 h-6 text-xs px-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {item.ingredient.nutrition_basis === 'g' && <SelectItem value="g">g</SelectItem>}
                {item.ingredient.nutrition_basis === 'ml' && <SelectItem value="ml">ml</SelectItem>}
                {item.ingredient.pieces_allowed && <SelectItem value="pcs">pcs</SelectItem>}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 shrink-0 text-green-600"
              onClick={() => void handleConfirmIngredient(item)}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 shrink-0"
              onClick={() => handleCancelIngredient(item.key)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <RecipePicker
        recipes={recipes}
        ingredients={ingredients}
        onSelect={handleAddRecipe}
        onSelectIngredient={handleSelectIngredient}
      />
    </div>
  )
}
