import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useIngredients } from '@/hooks/useIngredients'
import { IngredientFilters } from '@/components/ingredients/IngredientFilters'
import type { FilterParams } from '@/components/ingredients/IngredientFilters'
import { IngredientGrid } from '@/components/ingredients/IngredientGrid'
import { IngredientModal } from '@/components/ingredients/IngredientModal'
import { matchesMacroLabels } from '@/lib/macroLabels'
import type { Ingredient, CreateIngredientPayload, Tag } from '@/types'
import { API_BASE_URL } from '@/config'
import { fetchTags } from '@/api/tags'

export const Route = createFileRoute('/ingredients/')({
  component: IngredientsPage,
})

function IngredientsPage() {
  const { ingredients, loading, error, fetchIngredients, createIngredient, updateIngredient, deleteIngredient } = useIngredients()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Ingredient | null>(null)
  const [filterParams, setFilterParams] = useState<FilterParams>({})
  const [allTags, setAllTags] = useState<Tag[]>([])

  useEffect(() => {
    void fetchIngredients({ search: filterParams.search, tagIds: filterParams.tagIds })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParams.search, filterParams.tagIds])

  const displayedIngredients = useMemo(() => {
    const labels = filterParams.macroLabels
    if (!labels?.length) return ingredients
    return ingredients.filter(ing =>
      matchesMacroLabels({
        kcal: ing.kcal_per_100,
        protein: ing.protein_per_100,
        carbs: ing.carbs_per_100,
        fat: ing.fat_per_100,
        sugar: ing.sugar_per_100,
      }, labels)
    )
  }, [ingredients, filterParams.macroLabels])

  useEffect(() => {
    fetchTags().then(setAllTags).catch(() => { /* ignore */ })
  }, [])

  const handleSave = async (data: CreateIngredientPayload, file: File | null) => {
    if (editTarget) {
      const updated = await updateIngredient(editTarget.id, data)
      if (file) {
        const formData = new FormData()
        formData.append('image', file)
        const result = await fetch(`${API_BASE_URL}/ingredients/${updated.id}/image`, {
          method: 'POST',
          body: formData,
        })
        if (!result.ok) {
          toast.error('Ingredient saved but image upload failed')
        } else {
          toast.success('Ingredient updated')
          await fetchIngredients(filterParams)
        }
      } else {
        toast.success('Ingredient updated')
      }
    } else {
      const created = await createIngredient(data)
      if (file) {
        const formData = new FormData()
        formData.append('image', file)
        const result = await fetch(`${API_BASE_URL}/ingredients/${created.id}/image`, {
          method: 'POST',
          body: formData,
        })
        if (!result.ok) {
          toast.error('Ingredient created but image upload failed')
        } else {
          toast.success('Ingredient created')
          await fetchIngredients(filterParams)
        }
      } else {
        toast.success('Ingredient created')
      }
    }
  }

  const handleEdit = (ingredient: Ingredient) => {
    setEditTarget(ingredient)
    setModalOpen(true)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h1 className="text-2xl font-bold min-w-0">Ingredients</h1>
        <Button onClick={() => { setEditTarget(null); setModalOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Ingredient
        </Button>
      </div>

      <IngredientFilters allTags={allTags} onFilterChange={setFilterParams} />

      {loading && <p className="text-muted-foreground text-sm">Loading...</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {!loading && (
        <IngredientGrid
          ingredients={displayedIngredients}
          onAdd={() => { setEditTarget(null); setModalOpen(true) }}
          onEdit={handleEdit}
          onDelete={deleteIngredient}
        />
      )}

      <IngredientModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        onSave={handleSave}
        ingredient={editTarget}
      />
    </div>
  )
}
