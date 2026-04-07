import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ChefHat, ArrowLeft, Clock, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { RecipeModal } from '@/components/recipes/RecipeModal'
import { useRecipes } from '@/hooks/useRecipes'
import { useIngredients } from '@/hooks/useIngredients'
import { calcServingMacros } from '@/lib/nutrition'
import { formatCookTime } from '@/lib/utils'
import { toast } from 'sonner'
import { API_BASE_URL } from '@/config'
import type { Recipe, CreateRecipePayload, Tag } from '@/types'
import { Badge } from '@/components/ui/badge'
import { TagChip } from '@/components/tags/TagChip'
import { fetchTags } from '@/api/tags'

export const Route = createFileRoute('/recipes/$id')({
  component: RecipeDetailPage,
})

function RecipeDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { getRecipe, updateRecipe, deleteRecipe } = useRecipes()
  const { ingredients, fetchIngredients } = useIngredients()

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [persons, setPersons] = useState<number>(1)
  const [allTags, setAllTags] = useState<Tag[]>([])

  useEffect(() => {
    void fetchIngredients()
    void loadRecipe()
    fetchTags().then(setAllTags).catch(() => { /* ignore */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (recipe) setPersons(recipe.persons ?? 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id])

  const loadRecipe = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getRecipe(Number(id))
      setRecipe(data)
    } catch {
      setError('Recipe not found')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: CreateRecipePayload, file: File | null) => {
    if (!recipe) return
    const updated = await updateRecipe(recipe.id, data)
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
      }
    } else {
      toast.success('Recipe updated')
    }
    await loadRecipe()
  }

  const handleDelete = async () => {
    if (!recipe) return
    setDeleting(true)
    try {
      await deleteRecipe(recipe.id)
      toast.success(`Deleted ${recipe.name}`)
      void navigate({ to: '/recipes' })
    } catch {
      toast.error('Delete failed')
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground text-sm">Loading...</div>
  }
  if (error || !recipe) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-destructive">{error ?? 'Recipe not found'}</p>
        <Link to="/recipes"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Recipes</Button></Link>
      </div>
    )
  }

  // Compute total weight and nutrition
  const totalWeight = recipe.ingredients.reduce((sum, ing) => {
    const base = ing.unit === 'pieces' && ing.weight_per_unit ? ing.amount * ing.weight_per_unit : ing.amount
    return sum + base
  }, 0)
  const scale = persons / (recipe.persons ?? 1)
  const cookedWeight = totalWeight * scale * (recipe.yield ?? 100) / 100
  const macros = calcServingMacros(recipe, cookedWeight)

  // Parse steps
  const stepLines = recipe.steps
    ? recipe.steps.split(/\n+/).filter(Boolean)
    : []

  return (
    <>
      <div className="pb-12">
        {/* Hero */}
        <div className="relative w-full max-h-[480px] overflow-hidden">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.name}
              className="w-full max-h-[480px] object-cover"
            />
          ) : (
            <div className="w-full h-72 bg-gradient-to-br from-orange-100 to-amber-50 dark:from-stone-800 dark:to-stone-700 flex items-center justify-center">
              <ChefHat className="w-24 h-24 text-orange-200 dark:text-stone-600" />
            </div>
          )}
          {recipe.image_url && (
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
          )}
          <h1 className={`absolute bottom-6 left-6 right-6 font-serif text-2xl sm:text-4xl font-bold ${recipe.image_url ? 'text-white' : 'text-foreground'} break-all`}>
            {recipe.name}
          </h1>
        </div>

        {/* Action bar */}
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-2 border-b border-border">
          <Link to="/recipes">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Recipes
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="px-6 py-4 text-muted-foreground">{recipe.description}</p>
        )}

        {/* Tags (manual + derived from ingredient intersection) */}
        {(() => {
          const stored = recipe.tags ?? []
          let derived = recipe.ingredients.length > 0 ? (recipe.ingredients[0].tags ?? []) : []
          for (const ing of recipe.ingredients.slice(1)) {
            const ids = new Set((ing.tags ?? []).map(t => t.id))
            derived = derived.filter(t => ids.has(t.id))
          }
          const seen = new Set<number>()
          const effectiveTags = [...stored, ...derived].filter(t => !seen.has(t.id) && seen.add(t.id))
          return effectiveTags.length > 0 && (
            <div className="px-6 py-3 flex flex-wrap gap-1.5 border-b">
              {effectiveTags.map(tag => <TagChip key={tag.id} tag={tag} />)}
            </div>
          )
        })()}

        {/* Persons calculator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30 flex-wrap">
          <label className="text-sm font-medium">Persons</label>
          <Input
            type="number"
            min={1}
            step={1}
            value={persons}
            onChange={e => setPersons(Math.max(1, Math.floor(Number(e.target.value))))}
            className="w-24 h-8 text-sm"
          />
          {recipe.cook_time_minutes && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1 ml-auto">
              <Clock className="h-3.5 w-3.5" />
              {formatCookTime(recipe.cook_time_minutes)}
            </Badge>
          )}
          {totalWeight > 0 && (
            <Badge variant="outline" className="text-xs ml-1">
              {(recipe.yield ?? 100) !== 100 ? (
                <>
                  Yield: {recipe.yield}%
                  <span className="ml-1 text-muted-foreground">
                    ({Math.round(totalWeight * scale)}g raw → {Math.round(totalWeight * scale * (recipe.yield ?? 100) / 100 * 10) / 10}g cooked)
                  </span>
                </>
              ) : (
                <span>{Math.round(totalWeight * scale)}g</span>
              )}
            </Badge>
          )}
        </div>

        {/* Two-column layout */}
        <div className="px-6 pt-6 lg:grid lg:grid-cols-[320px_1fr] gap-8">
          {/* Left: ingredients */}
          <aside className="lg:sticky lg:top-4 space-y-3 mb-8 lg:mb-0">
            <h2 className="font-semibold text-lg">Ingredients</h2>
            {recipe.ingredients.length === 0 ? (
              <p className="text-muted-foreground text-sm">No ingredients.</p>
            ) : (
              <ul className="space-y-1">
                {recipe.ingredients.map(ing => (
                  <li key={ing.ingredient_id} className="flex justify-between text-sm py-1 border-b border-border last:border-0 overflow-hidden gap-2">
                    <span className="truncate min-w-0">{ing.name}</span>
                    <span className="text-muted-foreground shrink-0 whitespace-nowrap">
                      {(() => {
                        const scaled = ing.amount * scale
                        return Number.isInteger(scaled) ? scaled : scaled.toFixed(1)
                      })()} {ing.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* Right: steps + nutrition */}
          <div className="space-y-8">
            {stepLines.length > 0 && (
              <section>
                <h2 className="font-semibold text-lg mb-4">Instructions</h2>
                <ol className="space-y-6">
                  {stepLines.map((step, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="font-serif text-3xl font-bold text-primary leading-none flex-shrink-0">{i + 1}</span>
                      <p className="pt-1 text-sm leading-relaxed whitespace-pre-wrap">{step.replace(/^\d+\.\s*/, '')}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Nutrition */}
            <section>
              <h2 className="font-semibold text-lg mb-4">Nutrition (whole recipe)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{macros.kcal}</p>
                  <p className="text-xs text-muted-foreground mt-1">Calories (kcal)</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{macros.protein}</p>
                  <p className="text-xs text-muted-foreground mt-1">Protein (g)</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{macros.carbs}</p>
                  <p className="text-xs text-muted-foreground mt-1">Carbs (g)</p>
                  <p className="text-xs text-muted-foreground mt-1">sugar: {macros.sugar}g</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{macros.fat}</p>
                  <p className="text-xs text-muted-foreground mt-1">Fat (g)</p>
                  <p className="text-xs text-muted-foreground mt-1">unsaturated: {macros.unsaturated_fat}g</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <RecipeModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        recipe={recipe}
        ingredients={ingredients}
        allTags={allTags}
      />

      <AlertDialog open={deleteOpen} onOpenChange={open => !open && setDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-all">Delete {recipe.name}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
