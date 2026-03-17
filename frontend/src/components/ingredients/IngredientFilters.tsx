import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { TagFilter } from '@/components/tags/TagFilter'
import { TagChip } from '@/components/tags/TagChip'
import { MacroFilter } from '@/components/filters/MacroFilter'
import { IngredientMultiSelect } from '@/components/filters/IngredientMultiSelect'
import { IngredientThumbnail } from '@/components/shared/Thumbnails'
import { MACRO_LABEL_DISPLAY } from '@/lib/macroLabels'
import type { MacroLabel } from '@/lib/macroLabels'
import type { Tag, Ingredient } from '@/types'

export interface FilterParams {
  search?: string
  tagIds?: number[]
  macroLabels?: MacroLabel[]
  ingredientIds?: number[]
}

interface IngredientFiltersProps {
  allTags: Tag[]
  onFilterChange: (params: FilterParams) => void
  allIngredients?: Ingredient[]
  showIngredientFilter?: boolean
}

export function IngredientFilters({ allTags, onFilterChange, allIngredients, showIngredientFilter }: IngredientFiltersProps) {
  const [search, setSearch] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [selectedMacroLabels, setSelectedMacroLabels] = useState<MacroLabel[]>([])
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<number[]>([])

  const notify = useCallback((s: string, ids: number[], labels: MacroLabel[], ingIds: number[]) => {
    onFilterChange({
      search: s || undefined,
      tagIds: ids.length ? ids : undefined,
      macroLabels: labels.length ? labels : undefined,
      ingredientIds: ingIds.length ? ingIds : undefined,
    })
  }, [onFilterChange])

  useEffect(() => {
    const timer = setTimeout(() => {
      notify(search, selectedTagIds, selectedMacroLabels, selectedIngredientIds)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, selectedTagIds, selectedMacroLabels, selectedIngredientIds, notify])

  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id))
  const selectedIngredients = (allIngredients ?? []).filter(i => selectedIngredientIds.includes(i.id))
  const hasChips = selectedTags.length > 0 || selectedMacroLabels.length > 0 || selectedIngredients.length > 0

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search ingredients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 max-w-sm"
        />
        {allTags.length > 0 && (
          <TagFilter
            allTags={allTags}
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
        )}
        <MacroFilter
          selectedLabels={selectedMacroLabels}
          onChange={setSelectedMacroLabels}
        />
        {showIngredientFilter && allIngredients && allIngredients.length > 0 && (
          <IngredientMultiSelect
            allIngredients={allIngredients}
            selectedIngredientIds={selectedIngredientIds}
            onChange={setSelectedIngredientIds}
          />
        )}
      </div>
      {hasChips && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedTags.map(tag => (
            <TagChip
              key={tag.id}
              tag={tag}
              size="sm"
              onRemove={() => setSelectedTagIds(ids => ids.filter(id => id !== tag.id))}
            />
          ))}
          {selectedMacroLabels.map(label => (
            <span
              key={label}
              className="inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs font-medium"
            >
              {MACRO_LABEL_DISPLAY[label]}
              <button
                type="button"
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted focus:outline-none"
                onClick={() => setSelectedMacroLabels(ls => ls.filter(l => l !== label))}
                aria-label={`Remove ${MACRO_LABEL_DISPLAY[label]} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selectedIngredients.map(ing => (
            <span
              key={ing.id}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
            >
              <IngredientThumbnail imageUrl={ing.image_url} name={ing.name} size="sm" />
              {ing.name}
              <button
                type="button"
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted focus:outline-none"
                onClick={() => setSelectedIngredientIds(ids => ids.filter(id => id !== ing.id))}
                aria-label={`Remove ${ing.name} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {hasChips && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => { setSelectedTagIds([]); setSelectedMacroLabels([]); setSelectedIngredientIds([]) }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
