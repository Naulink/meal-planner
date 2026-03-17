import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRecipes } from '@/hooks/useRecipes'
import { useIngredients } from '@/hooks/useIngredients'
import { usePersonsContext } from '@/hooks/usePersons'
import { useMealPlan } from '@/hooks/useMealPlan'
import { PlannerGrid } from '@/components/meal-planner/PlannerGrid'
import type { MealPlanEntry } from '@/types'

export const Route = createFileRoute('/meal-planner/')({
  component: MealPlannerPage,
})

type PlanMap = Record<number, Record<number, MealPlanEntry[]>>

function MealPlannerPage() {
  const { recipes, fetchRecipes } = useRecipes()
  const { ingredients, fetchIngredients } = useIngredients()
  const { persons } = usePersonsContext()
  const { entries, fetchEntries, addEntry, updateEntry, removeEntry, removeDay, resetAll } = useMealPlan()
  const [dayCount, setDayCount] = useState(() => {
    const saved = localStorage.getItem('mealPlanner.dayCount')
    return saved ? Math.max(1, parseInt(saved)) : 1
  })

  const updateDayCount = (updater: (prev: number) => number) => {
    setDayCount(prev => updater(prev))
  }

  useEffect(() => {
    localStorage.setItem('mealPlanner.dayCount', String(dayCount))
  }, [dayCount])

  useEffect(() => {
    void fetchRecipes()
    void fetchIngredients()
    void fetchEntries()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On first load, expand dayCount to cover all days that have entries
  // (handles fresh browser / cleared localStorage). Only runs once.
  const initializedFromEntries = useRef(false)
  useEffect(() => {
    if (initializedFromEntries.current || entries.length === 0) return
    initializedFromEntries.current = true
    const maxDay = Math.max(...entries.map(e => e.day_index))
    setDayCount(maxDay)
  }, [entries])

  const planMap = useMemo<PlanMap>(() => {
    const map: PlanMap = {}
    for (const entry of entries) {
      if (!map[entry.person_id]) map[entry.person_id] = {}
      if (!map[entry.person_id][entry.day_index]) map[entry.person_id][entry.day_index] = []
      map[entry.person_id][entry.day_index].push(entry)
    }
    return map
  }, [entries])

  const handleAdd = async (personId: number, dayIndex: number, recipeId: number, servingGrams: number) => {
    await addEntry({ person_id: personId, day_index: dayIndex, recipe_id: recipeId, serving_grams: servingGrams })
  }

  const handleAddIngredient = async (personId: number, dayIndex: number, ingredientId: number, amount: number, unit: string) => {
    await addEntry({ person_id: personId, day_index: dayIndex, ingredient_id: ingredientId, amount, unit })
  }

  const handleUpdate = async (id: number, data: { serving_grams?: number; amount?: number }) => {
    await updateEntry(id, data)
  }

  const handleRemove = async (id: number) => {
    await removeEntry(id)
  }

  const handleRemoveDay = async (dayIndex: number) => {
    await removeDay(dayIndex)
    setDayCount(prev => Math.max(1, prev - 1))
  }

  const handleReset = async () => {
    try {
      await resetAll()
      updateDayCount(() => 1)
      toast.success('Meal plan reset')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold flex-1">Meal Planner</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateDayCount(d => d + 1)}
        >
          + Add Day
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleReset}
        >
          Reset
        </Button>
      </div>

      {persons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <p className="font-medium">No persons added yet.</p>
          <p className="text-sm mt-1">Go to Settings to add persons before planning meals.</p>
        </div>
      ) : (
        <PlannerGrid
          persons={persons}
          dayCount={dayCount}
          planMap={planMap}
          recipes={recipes}
          ingredients={ingredients}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          onRemoveDay={handleRemoveDay}
          onAddIngredient={handleAddIngredient}
        />
      )}
    </div>
  )
}
