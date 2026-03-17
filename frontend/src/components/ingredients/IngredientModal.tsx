import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { TagMultiSelect } from '@/components/tags/TagMultiSelect'
import { fetchTags } from '@/api/tags'
import type { Ingredient, CreateIngredientPayload, Tag } from '@/types'

interface IngredientModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: CreateIngredientPayload, file: File | null) => Promise<void>
  ingredient?: Ingredient | null
}

interface FormState {
  name: string
  nutrition_basis: string
  kcal_per_100: string
  protein_per_100: string
  carbs_per_100: string
  fat_per_100: string
  unsaturated_fat_per_100: string
  sugar_per_100: string
  pieces_allowed: boolean
  weight_per_unit: string
  tagIds: number[]
}

const emptyForm: FormState = {
  name: '',
  nutrition_basis: 'g',
  kcal_per_100: '',
  protein_per_100: '',
  carbs_per_100: '',
  fat_per_100: '',
  unsaturated_fat_per_100: '0',
  sugar_per_100: '0',
  pieces_allowed: false,
  weight_per_unit: '',
  tagIds: [],
}

export function IngredientModal({ open, onClose, onSave, ingredient }: IngredientModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchTags().then(setAllTags).catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (ingredient) {
      setForm({
        name: ingredient.name,
        nutrition_basis: ingredient.nutrition_basis,
        kcal_per_100: String(ingredient.kcal_per_100),
        protein_per_100: String(ingredient.protein_per_100),
        carbs_per_100: String(ingredient.carbs_per_100),
        fat_per_100: String(ingredient.fat_per_100),
        unsaturated_fat_per_100: String(ingredient.unsaturated_fat_per_100),
        sugar_per_100: String(ingredient.sugar_per_100),
        pieces_allowed: ingredient.pieces_allowed,
        weight_per_unit: ingredient.weight_per_unit != null ? String(ingredient.weight_per_unit) : '',
        tagIds: ingredient.tags?.map(t => t.id) ?? [],
      })
      setImagePreview(ingredient.image_url ?? null)
    } else {
      setForm(emptyForm)
      setImagePreview(null)
    }
    setImageFile(null)
    setError(null)
  }, [ingredient, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.nutrition_basis) { setError('Nutrition basis is required'); return }

    const parsed = {
      kcal_per_100: parseFloat(form.kcal_per_100),
      protein_per_100: parseFloat(form.protein_per_100),
      carbs_per_100: parseFloat(form.carbs_per_100),
      fat_per_100: parseFloat(form.fat_per_100),
      weight_per_unit: form.pieces_allowed && form.weight_per_unit ? parseInt(form.weight_per_unit) : null,
    }

    for (const [k, v] of Object.entries(parsed)) {
      if (k !== 'weight_per_unit' && isNaN(v as number)) {
        setError(`${k.replace(/_/g, ' ')} must be a number`)
        return
      }
    }
    if (form.pieces_allowed && !form.weight_per_unit) {
      setError('Weight per unit is required when pieces are allowed')
      return
    }

    const unsaturatedFat = parseFloat(form.unsaturated_fat_per_100) || 0
    const sugar = parseFloat(form.sugar_per_100) || 0

    if (unsaturatedFat < 0 || sugar < 0) {
      setError('Sub-fields must be non-negative')
      return
    }
    if (unsaturatedFat > parsed.fat_per_100) {
      setError('Unsaturated fat cannot exceed total fat')
      return
    }
    if (sugar > parsed.carbs_per_100) {
      setError('Sugar cannot exceed total carbs')
      return
    }

    const payload: CreateIngredientPayload = {
      name: form.name.trim(),
      nutrition_basis: form.nutrition_basis,
      pieces_allowed: form.pieces_allowed,
      weight_per_unit: parsed.weight_per_unit ?? undefined,
      kcal_per_100: parsed.kcal_per_100,
      protein_per_100: parsed.protein_per_100,
      carbs_per_100: parsed.carbs_per_100,
      fat_per_100: parsed.fat_per_100,
      unsaturated_fat_per_100: unsaturatedFat,
      sugar_per_100: sugar,
      tag_ids: form.tagIds.length > 0 ? form.tagIds : undefined,
    }

    setSaving(true)
    setError(null)
    try {
      await onSave(payload, imageFile)
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{ingredient ? 'Edit Ingredient' : 'New Ingredient'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>

          <div className="space-y-2">
            <Label>Nutrition Basis</Label>
            <Select value={form.nutrition_basis} onValueChange={v => setForm(p => ({ ...p, nutrition_basis: v }))} disabled={!!ingredient}>
              <SelectTrigger disabled={!!ingredient}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="g">Grams (g)</SelectItem>
                <SelectItem value="ml">Milliliters (ml)</SelectItem>
              </SelectContent>
            </Select>
            {!!ingredient && <p className="text-xs text-muted-foreground">Cannot be changed after creation.</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['kcal_per_100', 'protein_per_100'] as const).map(field => (
              <div key={field} className="space-y-1">
                <Label htmlFor={field}>{field.replace(/_per_100/, '').replace(/_/g, ' ')} /100{form.nutrition_basis}</Label>
                <Input
                  id={field}
                  type="number"
                  value={form[field]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="carbs_per_100">carbs /100{form.nutrition_basis}</Label>
                <Input
                  id="carbs_per_100"
                  type="number"
                  value={form.carbs_per_100}
                  onChange={e => setForm(p => ({ ...p, carbs_per_100: e.target.value }))}
                />
              </div>
              <div className="space-y-1 pl-3 border-l-2 border-border">
                <Label htmlFor="sugar_per_100" className="text-xs text-muted-foreground">of which sugar</Label>
                <Input
                  id="sugar_per_100"
                  type="number"
                  min={0}
                  step="any"
                  value={form.sugar_per_100}
                  onChange={e => setForm(p => ({ ...p, sugar_per_100: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="fat_per_100">fat /100{form.nutrition_basis}</Label>
                <Input
                  id="fat_per_100"
                  type="number"
                  value={form.fat_per_100}
                  onChange={e => setForm(p => ({ ...p, fat_per_100: e.target.value }))}
                />
              </div>
              <div className="space-y-1 pl-3 border-l-2 border-border">
                <Label htmlFor="unsaturated_fat_per_100" className="text-xs text-muted-foreground">of which unsaturated</Label>
                <Input
                  id="unsaturated_fat_per_100"
                  type="number"
                  min={0}
                  step="any"
                  value={form.unsaturated_fat_per_100}
                  onChange={e => setForm(p => ({ ...p, unsaturated_fat_per_100: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="pieces_allowed"
              checked={form.pieces_allowed}
              onCheckedChange={checked => setForm(p => ({ ...p, pieces_allowed: Boolean(checked), weight_per_unit: checked ? p.weight_per_unit : '' }))}
            />
            <Label htmlFor="pieces_allowed">Pieces allowed</Label>
          </div>

          {form.pieces_allowed && (
            <div className="space-y-2">
              <Label htmlFor="weight_per_unit">Weight per unit (g)</Label>
              <Input
                id="weight_per_unit"
                type="number"
                value={form.weight_per_unit}
                onChange={e => setForm(p => ({ ...p, weight_per_unit: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Tags</Label>
            <TagMultiSelect
              allTags={allTags}
              selectedTagIds={form.tagIds}
              onChange={ids => setForm(p => ({ ...p, tagIds: ids }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Image</Label>
            {imagePreview ? (
              <div className="relative w-20 h-20 group">
                <img src={imagePreview} alt="preview" className="w-20 h-20 rounded-lg object-cover" />
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer text-white text-xs font-medium">
                  Change
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors text-muted-foreground text-sm gap-1">
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
