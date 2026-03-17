import { RecipeCard } from './RecipeCard'
import type { Recipe, Tag } from '@/types'

interface RecipeGridProps {
  recipes: Recipe[]
  getRecipeTags: (recipe: Recipe) => Tag[]
  onAdd: () => void
  onEdit: (recipe: Recipe) => void
  onDelete: (id: number) => Promise<void>
}

export function RecipeGrid({ recipes, getRecipeTags, onEdit, onDelete }: RecipeGridProps) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-[repeat(auto-fill,minmax(180px,220px))]">
      {recipes.map(recipe => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          tags={getRecipeTags(recipe).filter(t => t.show_on_cards)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
