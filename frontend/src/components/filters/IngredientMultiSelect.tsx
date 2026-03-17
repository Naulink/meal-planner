import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { IngredientThumbnail } from '@/components/shared/Thumbnails'
import type { Ingredient } from '@/types'

interface IngredientMultiSelectProps {
  allIngredients: Ingredient[]
  selectedIngredientIds: number[]
  onChange: (ids: number[]) => void
}

export function IngredientMultiSelect({ allIngredients, selectedIngredientIds, onChange }: IngredientMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggleIngredient = (id: number) => {
    if (selectedIngredientIds.includes(id)) {
      onChange(selectedIngredientIds.filter(i => i !== id))
    } else {
      onChange([...selectedIngredientIds, id])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-h-10 h-auto py-2"
        >
          <span className="text-sm text-muted-foreground">
            {selectedIngredientIds.length > 0
              ? `${selectedIngredientIds.length} ingredient${selectedIngredientIds.length > 1 ? 's' : ''} selected`
              : 'Filter by ingredient'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search ingredients…" />
          <CommandList>
            <CommandEmpty>No ingredients found.</CommandEmpty>
            <CommandGroup>
              {allIngredients.map(ing => (
                <CommandItem
                  key={ing.id}
                  value={ing.name}
                  onSelect={() => toggleIngredient(ing.id)}
                  className="gap-2"
                >
                  <IngredientThumbnail imageUrl={ing.image_url} name={ing.name} size="sm" />
                  <span className="truncate">{ing.name}</span>
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4 shrink-0',
                      selectedIngredientIds.includes(ing.id) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
