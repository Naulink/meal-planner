import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { IngredientPicker, type PickedIngredient } from './IngredientPicker'
import { LockedTagChip, TagMultiSelect } from '@/components/tags'
import type { Recipe, Ingredient, Tag, CreateRecipePayload } from '@/types'

interface RecipeModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: CreateRecipePayload, file: File | null) => Promise<void>
  recipe?: Recipe | null
  ingredients: Ingredient[]
  allTags: Tag[]
}

export function RecipeModal({ open, onClose, onSave, recipe, ingredients, allTags }: RecipeModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [cookTimeMinutes, setCookTimeMinutes] = useState<number | undefined>(undefined)
  const [persons, setPersons] = useState<number>(1)
  const [yield_, setYield] = useState<number>(100)
  const [picked, setPicked] = useState<PickedIngredient[]>([])
  const [manualTagIds, setManualTagIds] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const derivedTagIds = useMemo(() => {
    if (picked.length === 0) return []
    const tagIdSets = picked.map(p => {
      const ing = ingredients.find(i => i.id === p.ingredient_id)
      return new Set((ing?.tags ?? []).map((t: Tag) => t.id))
    })
    const [first, ...rest] = tagIdSets
    return [...first].filter(id => rest.every(s => s.has(id)))
  }, [picked, ingredients])

  const derivedTags = useMemo(
    () => allTags.filter(t => derivedTagIds.includes(t.id)),
    [allTags, derivedTagIds]
  )

  useEffect(() => {
    if (recipe) {
      setName(recipe.name)
      setDescription(recipe.description ?? '')
      setSteps(recipe.steps ?? '')
      setCookTimeMinutes(recipe.cook_time_minutes ?? undefined)
      setPersons(recipe.persons ?? 1)
      setYield(recipe.yield ?? 100)
      setPicked(
        recipe.ingredients.map(ri => ({
          ingredient_id: ri.ingredient_id,
          name: ri.name,
          amount: ri.amount,
          unit: ri.unit,
          nutrition_basis: ri.nutrition_basis,
          pieces_allowed: ri.pieces_allowed,
        }))
      )
      setManualTagIds(recipe.tags?.map(t => t.id) ?? [])
      setImagePreview(recipe.image_url ?? null)
    } else {
      setName('')
      setDescription('')
      setSteps('')
      setCookTimeMinutes(undefined)
      setPersons(1)
      setYield(100)
      setPicked([])
      setManualTagIds([])
      setImagePreview(null)
    }
    setImageFile(null)
    setError(null)
  }, [recipe, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        description: description || undefined,
        steps: steps || undefined,
        cook_time_minutes: cookTimeMinutes,
        persons,
        yield: yield_,
        ingredients: picked.map(p => ({
          ingredient_id: p.ingredient_id,
          amount: p.amount,
          unit: p.unit,
        })),
        tag_ids: manualTagIds.filter(id => !derivedTagIds.includes(id)),
      }, imageFile)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  return (
    <Dialog open={open} onOpenChange={open ? onClose : undefined}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Edit Recipe' : 'New Recipe'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 min-w-0 w-full">
          <div className="space-y-2">
            <Label htmlFor="recipe-name">Name</Label>
            <Input id="recipe-name" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="steps">Cooking Steps</Label>
            <Textarea
              id="steps"
              value={steps}
              onChange={e => setSteps(e.target.value)}
              placeholder="Write your cooking steps here..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cook-time">Cook time (min)</Label>
            <Input
              id="cook-time"
              type="number"
              min={1}
              placeholder="e.g. 45"
              value={cookTimeMinutes ?? ''}
              onChange={e => {
                const v = parseInt(e.target.value, 10)
                setCookTimeMinutes(isNaN(v) || v < 1 ? undefined : v)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="persons">Number of persons</Label>
            <Input
              id="persons"
              type="number"
              min={1}
              step={1}
              required
              value={persons}
              onChange={e => setPersons(Math.max(1, Math.floor(Number(e.target.value))))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yield">Yield (%)</Label>
            <Input
              id="yield"
              type="number"
              min={1}
              max={200}
              step={1}
              value={yield_}
              onChange={e => {
                const v = parseFloat(e.target.value)
                setYield(isNaN(v) || v < 1 ? 1 : v)
              }}
            />
            <p className="text-xs text-muted-foreground">Weight after cooking as % of raw weight (e.g. 70 means 30% weight loss during cooking)</p>
          </div>

          <div className="space-y-2">
            <Label>Ingredients</Label>
            <IngredientPicker ingredients={ingredients} value={picked} onChange={setPicked} />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            {derivedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {derivedTags.map(tag => <LockedTagChip key={tag.id} tag={tag} size="sm" />)}
              </div>
            )}
            <TagMultiSelect
              allTags={allTags.filter(t => !derivedTagIds.includes(t.id))}
              selectedTagIds={manualTagIds}
              onChange={setManualTagIds}
            />
          </div>

          <div className="space-y-2">
            <Label>Image</Label>
            {imagePreview ? (
              <div className="relative w-24 h-24 group">
                <img src={imagePreview} alt="preview" className="w-24 h-24 rounded-lg object-cover" />
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer text-white text-xs font-medium">
                  Change
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors text-muted-foreground text-sm gap-1">
                <span>Upload image</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
              </label>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
