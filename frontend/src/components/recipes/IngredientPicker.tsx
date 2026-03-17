import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, ChevronsUpDown } from 'lucide-react'
import { IngredientThumbnail } from '@/components/shared/Thumbnails'
import type { Ingredient } from '@/types'

export interface PickedIngredient {
  ingredient_id: number
  name: string
  amount: number
  unit: string
  nutrition_basis: string
  pieces_allowed: boolean
}

interface IngredientPickerProps {
  ingredients: Ingredient[]
  value: PickedIngredient[]
  onChange: (value: PickedIngredient[]) => void
}

function getUnitOptions(ingredient: Ingredient): string[] {
  const units: string[] = [ingredient.nutrition_basis] // 'g' or 'ml'
  if (ingredient.pieces_allowed) units.push('pieces')
  return units
}

export function IngredientPicker({ ingredients, value, onChange }: IngredientPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const addIngredient = (ingredient: Ingredient) => {
    if (value.some(v => v.ingredient_id === ingredient.id)) {
      setOpen(false)
      return
    }
    onChange([
      ...value,
      {
        ingredient_id: ingredient.id,
        name: ingredient.name,
        amount: 100,
        unit: ingredient.nutrition_basis,
        nutrition_basis: ingredient.nutrition_basis,
        pieces_allowed: ingredient.pieces_allowed,
      },
    ])
    setOpen(false)
    setSearch('')
  }

  const updateRow = (index: number, field: 'amount' | 'unit', val: string | number) => {
    onChange(value.map((v, i) => (i === index ? { ...v, [field]: val } : v)))
  }

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const filtered = ingredients.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            Add ingredient...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start" onWheel={e => e.stopPropagation()}>
          <Command>
            <CommandInput
              placeholder="Search ingredients..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No ingredients found.</CommandEmpty>
              <CommandGroup>
                {filtered.map(ingredient => (
                  <CommandItem
                    key={ingredient.id}
                    onSelect={() => addIngredient(ingredient)}
                    className="gap-2"
                  >
                    <IngredientThumbnail imageUrl={ingredient.image_url} name={ingredient.name} size="sm" />
                    <span className="truncate">{ingredient.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((row, index) => (
            <div key={row.ingredient_id} className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <IngredientThumbnail imageUrl={ingredients.find(i => i.id === row.ingredient_id)?.image_url} name={row.name} size="sm" />
                <span className="flex-1 min-w-0 truncate text-sm font-medium">{row.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-24"
                  value={row.amount}
                  onChange={e => updateRow(index, 'amount', parseFloat(e.target.value) || 0)}
                  min={0}
                />
                <Select value={row.unit} onValueChange={v => updateRow(index, 'unit', v)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getUnitOptions({ nutrition_basis: row.nutrition_basis, pieces_allowed: row.pieces_allowed } as Ingredient).map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => removeRow(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
