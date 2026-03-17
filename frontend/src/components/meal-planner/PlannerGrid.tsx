import { Fragment, useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PlannerCell } from './PlannerCell'
import { PersonTabs } from './PersonTabs'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Person, MealPlanEntry, Recipe, Ingredient } from '@/types'

type PlanMap = Record<number, Record<number, MealPlanEntry[]>>

interface PlannerGridProps {
  persons: Person[]
  dayCount: number
  planMap: PlanMap
  recipes: Recipe[]
  ingredients: Ingredient[]
  onAdd: (personId: number, dayIndex: number, recipeId: number, servingGrams: number) => Promise<void>
  onUpdate: (id: number, data: { serving_grams?: number; amount?: number }) => Promise<void>
  onRemove: (id: number) => Promise<void>
  onRemoveDay: (dayIndex: number) => Promise<void>
  onAddIngredient: (personId: number, dayIndex: number, ingredientId: number, amount: number, unit: string) => Promise<void>
}

function DayHeaderCell({ dayIndex, onRemove, disabled }: { dayIndex: number; onRemove: () => void; disabled: boolean }) {
  return (
    <div className={cn('relative flex items-center justify-center p-2 font-medium text-sm min-h-[48px] border-r-[3px] border-b-[3px] border-zinc-300 dark:border-zinc-600', dayIndex % 2 === 0 ? 'bg-muted/40' : 'bg-muted/50')}>
      <span>Day {dayIndex}</span>
      <Button
        size="icon"
        variant="secondary"
        className="absolute top-1 right-1 h-7 w-7 shadow-sm text-destructive hover:text-destructive"
        onClick={onRemove}
        disabled={disabled}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export function PlannerGrid({ persons, dayCount, planMap, recipes, ingredients, onAdd, onUpdate, onRemove, onRemoveDay, onAddIngredient }: PlannerGridProps) {
  const isMobile = useIsMobile()
  const [selectedPersonIndex, setSelectedPersonIndex] = useState(0)

  useEffect(() => {
    if (selectedPersonIndex >= persons.length && persons.length > 0) {
      setSelectedPersonIndex(persons.length - 1)
    }
  }, [persons.length, selectedPersonIndex])

  if (isMobile && persons.length > 0) {
    const selectedPerson = persons[selectedPersonIndex]
    return (
      <div className="flex flex-col">
        <PersonTabs
          persons={persons}
          selectedIndex={selectedPersonIndex}
          onSelect={setSelectedPersonIndex}
        />
        <div className="border-l-[3px] border-t-[3px] border-zinc-300 dark:border-zinc-600 rounded-xl overflow-auto shadow-sm mt-2">
          {Array.from({ length: dayCount }, (_, dayIdx) => (
            <Fragment key={dayIdx + 1}>
              <DayHeaderCell
                dayIndex={dayIdx + 1}
                onRemove={() => void onRemoveDay(dayIdx + 1)}
                disabled={dayCount === 1}
              />
              <PlannerCell
                person={selectedPerson}
                dayIndex={dayIdx + 1}
                entries={planMap[selectedPerson.id]?.[dayIdx + 1] ?? []}
                recipes={recipes}
                ingredients={ingredients}
                onAdd={onAdd}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onAddIngredient={onAddIngredient}
              />
            </Fragment>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="border-l-[3px] border-t-[3px] border-zinc-300 dark:border-zinc-600 rounded-xl overflow-auto shadow-sm"
      style={{
        display: 'grid',
        gridTemplateColumns: `60px repeat(${persons.length}, minmax(260px, 1fr))`,
      }}
    >
      {/* Header row: empty corner + one cell per person */}
      <div className="p-3 border-r-[3px] border-b-[3px] border-zinc-300 dark:border-zinc-600 bg-muted font-medium text-sm" />
      {persons.map(person => (
        <div key={person.id} className="p-3 border-r-[3px] border-b-[3px] border-zinc-300 dark:border-zinc-600 bg-muted font-medium text-sm text-center">
          {person.name}
        </div>
      ))}

      {/* Day rows: day label + one cell per person */}
      {Array.from({ length: dayCount }, (_, dayIdx) => (
        <Fragment key={dayIdx + 1}>
          <DayHeaderCell
            dayIndex={dayIdx + 1}
            onRemove={() => void onRemoveDay(dayIdx + 1)}
            disabled={dayCount === 1}
          />
          {persons.map(person => (
            <PlannerCell
              key={`${person.id}-${dayIdx + 1}`}
              person={person}
              dayIndex={dayIdx + 1}
              entries={planMap[person.id]?.[dayIdx + 1] ?? []}
              recipes={recipes}
              ingredients={ingredients}
              onAdd={onAdd}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAddIngredient={onAddIngredient}
            />
          ))}
        </Fragment>
      ))}
    </div>
  )
}
