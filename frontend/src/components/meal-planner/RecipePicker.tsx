import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchTags } from '@/api/tags'
import { TagChip } from '@/components/tags/TagChip'
import { RecipeThumbnail, IngredientThumbnail } from '@/components/shared/Thumbnails'
import type { Recipe, Ingredient, Tag } from '@/types'

interface RecipePickerProps {
  recipes: Recipe[]
  ingredients: Ingredient[]
  onSelect: (recipe: Recipe) => void
  onSelectIngredient: (ingredient: Ingredient) => void
  triggerLabel?: string
  triggerVariant?: 'default' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'link'
  triggerClassName?: string
}


function getRecipeTags(recipe: Recipe): Tag[] {
  if (!recipe.ingredients.length) return []
  let tags = recipe.ingredients[0].tags ?? []
  for (const ing of recipe.ingredients.slice(1)) {
    const ingTagIds = new Set((ing.tags ?? []).map(t => t.id))
    tags = tags.filter(t => ingTagIds.has(t.id))
  }
  return tags
}

export function RecipePicker({ recipes, ingredients, onSelect, onSelectIngredient, triggerLabel, triggerVariant, triggerClassName }: RecipePickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])

  useEffect(() => {
    if (open && allTags.length === 0) {
      void fetchTags().then(setAllTags).catch(() => {})
    }
  }, [open, allTags.length])

  const toggleTag = (id: number) => {
    setSelectedTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  const filteredRecipes = recipes.filter(r => {
    if (!r.name.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedTagIds.length === 0) return true
    const recipeTagIds = new Set(getRecipeTags(r).map(t => t.id))
    return selectedTagIds.every(id => recipeTagIds.has(id))
  })
  const filteredIngredients = ingredients.filter(i => {
    if (!i.name.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedTagIds.length === 0) return true
    const ingTagIds = new Set((i.tags ?? []).map(t => t.id))
    return selectedTagIds.every(id => ingTagIds.has(id))
  })

  const handleSelectRecipe = (recipe: Recipe) => {
    onSelect(recipe)
    setOpen(false)
    setSearch('')
    setSelectedTagIds([])
  }

  const handleSelectIngredient = (ingredient: Ingredient) => {
    onSelectIngredient(ingredient)
    setOpen(false)
    setSearch('')
    setSelectedTagIds([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={triggerVariant ?? 'secondary'} className={triggerClassName ?? 'w-full gap-2'}>
          <Plus className="h-4 w-4" />
          {triggerLabel ?? 'Add Item'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(500px,calc(100vw-2rem))] p-0" align="start">
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 p-2 border-b">
            {allTags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={cn('cursor-pointer transition-opacity', selectedTagIds.includes(tag.id) ? 'opacity-100' : 'opacity-40 hover:opacity-70')}
              >
                <TagChip tag={tag} size="sm" />
              </button>
            ))}
          </div>
        )}
        <Command>
          <CommandInput placeholder="Search recipes & ingredients..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No items found.</CommandEmpty>
            {filteredRecipes.length > 0 && (
              <CommandGroup heading="Recipes">
                {filteredRecipes.map(recipe => (
                  <CommandItem key={`recipe-${recipe.id}`} onSelect={() => handleSelectRecipe(recipe)} className="gap-2">
                    <RecipeThumbnail imageUrl={recipe.image_url} name={recipe.name} size="sm" />
                    <span className="truncate">{recipe.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {filteredIngredients.length > 0 && (
              <CommandGroup heading="Ingredients">
                {filteredIngredients.map(ingredient => (
                  <CommandItem key={`ingredient-${ingredient.id}`} onSelect={() => handleSelectIngredient(ingredient)} className="gap-2">
                    <IngredientThumbnail imageUrl={ingredient.image_url} name={ingredient.name} size="sm" />
                    <span className="truncate">{ingredient.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
