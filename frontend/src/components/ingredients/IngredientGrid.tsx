import { IngredientCard } from './IngredientCard'
import type { Ingredient } from '@/types'

interface IngredientGridProps {
  ingredients: Ingredient[]
  onAdd: () => void
  onEdit: (ingredient: Ingredient) => void
  onDelete: (id: number) => Promise<void>
}

export function IngredientGrid({ ingredients, onEdit, onDelete }: IngredientGridProps) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-[repeat(auto-fill,minmax(180px,220px))]">
      {ingredients.map(ingredient => (
        <IngredientCard
          key={ingredient.id}
          ingredient={ingredient}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
