import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useRecipes } from '@/hooks/useRecipes'
import { useIngredients } from '@/hooks/useIngredients'
import { RecipeGrid } from '@/components/recipes/RecipeGrid'
import { RecipeModal } from '@/components/recipes/RecipeModal'
import { IngredientFilters } from '@/components/ingredients/IngredientFilters'
import type { FilterParams } from '@/components/ingredients/IngredientFilters'
import { matchesMacroLabels } from '@/lib/macroLabels'
import { calcServingMacros } from '@/lib/nutrition'
import type { Recipe, CreateRecipePayload, Tag } from '@/types'
import { ApiError } from '@/lib/api'
import { API_BASE_URL } from '@/config'
import { fetchTags } from '@/api/tags'

export const Route = createFileRoute('/recipes/')({
  component: RecipesPage,
})

function getEffectiveRecipeTags(recipe: Recipe): Tag[] {
  // Stored (manual) tags from API
  const stored = recipe.tags ?? []
  // Derived: intersection of all ingredient tags
  let derived: Tag[] = []
  if (recipe.ingredients.length > 0) {
    derived = recipe.ingredients[0].tags ?? []
    for (const ing of recipe.ingredients.slice(1)) {
      const ingTagIds = new Set((ing.tags ?? []).map(t => t.id))
      derived = derived.filter(t => ingTagIds.has(t.id))
    }
  }
  // Union, deduplicated by ID
  const seen = new Set<number>()
  return [...stored, ...derived].filter(t => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })
}

function RecipesPage() {
  const { recipes, loading, error, fetchRecipes, createRecipe, updateRecipe, deleteRecipe } = useRecipes()
  const { ingredients, fetchIngredients } = useIngredients()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Recipe | null>(null)
  const [filterParams, setFilterParams] = useState<FilterParams>({})
  const [allTags, setAllTags] = useState<Tag[]>([])

  useEffect(() => {
    void fetchRecipes()
    void fetchIngredients()
    fetchTags().then(setAllTags).catch(() => { /* ignore */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleRecipes = useMemo(() => recipes.filter(r => {
    if (filterParams.search && !r.name.toLowerCase().includes(filterParams.search.toLowerCase())) return false
    if (filterParams.tagIds?.length) {
      const rt = getEffectiveRecipeTags(r)
      const rtIds = new Set(rt.map(t => t.id))
      if (!filterParams.tagIds.every(id => rtIds.has(id))) return false
    }
    if (filterParams.macroLabels?.length) {
      const macros = calcServingMacros(r, 100)
      if (!matchesMacroLabels(macros, filterParams.macroLabels)) return false
    }
    if (filterParams.ingredientIds?.length) {
      const recipeIngIds = new Set(r.ingredients.map(i => i.ingredient_id))
      if (!filterParams.ingredientIds.every(id => recipeIngIds.has(id))) return false
    }
    return true
  }), [recipes, filterParams])

  const handleSave = async (data: CreateRecipePayload, file: File | null) => {
    try {
      if (editTarget) {
        const updated = await updateRecipe(editTarget.id, data)
        if (file) {
          const formData = new FormData()
          formData.append('image', file)
          const result = await fetch(`${API_BASE_URL}/recipes/${updated.id}/image`, {
            method: 'POST',
            body: formData,
          })
          if (!result.ok) {
            toast.error('Recipe saved but image upload failed')
          } else {
            toast.success('Recipe updated')
            await fetchRecipes()
          }
        } else {
          toast.success('Recipe updated')
        }
      } else {
        const created = await createRecipe(data)
        if (file) {
          const formData = new FormData()
          formData.append('image', file)
          const result = await fetch(`${API_BASE_URL}/recipes/${created.id}/image`, {
            method: 'POST',
            body: formData,
          })
          if (!result.ok) {
            toast.error('Recipe created but image upload failed')
          } else {
            toast.success('Recipe created')
            await fetchRecipes()
          }
        } else {
          toast.success('Recipe created')
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        throw new Error(err.message)
      }
      throw err
    }
  }

  const handleEdit = (recipe: Recipe) => {
    setEditTarget(recipe)
    setModalOpen(true)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h1 className="text-2xl font-bold min-w-0">Recipes</h1>
        <Button onClick={() => { setEditTarget(null); setModalOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          New Recipe
        </Button>
      </div>

      <IngredientFilters
        allTags={allTags}
        onFilterChange={setFilterParams}
        allIngredients={ingredients}
        showIngredientFilter
      />

      {loading && <p className="text-muted-foreground text-sm">Loading...</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {!loading && (
        <RecipeGrid
          recipes={visibleRecipes}
          getRecipeTags={getEffectiveRecipeTags}
          onAdd={() => { setEditTarget(null); setModalOpen(true) }}
          onEdit={handleEdit}
          onDelete={deleteRecipe}
        />
      )}

      <RecipeModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        onSave={handleSave}
        recipe={editTarget}
        ingredients={ingredients}
        allTags={allTags}
      />
    </div>
  )
}
