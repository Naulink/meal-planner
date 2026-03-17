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
import { TagChip } from './TagChip'
import { cn } from '@/lib/utils'
import type { Tag } from '@/types'

interface TagMultiSelectProps {
  allTags: Tag[]
  selectedTagIds: number[]
  onChange: (ids: number[]) => void
}

export function TagMultiSelect({ allTags, selectedTagIds, onChange }: TagMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id))

  const toggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-h-10 h-auto py-2"
        >
          <span className="flex flex-wrap gap-1 flex-1 text-left">
            {selectedTags.length > 0 ? (
              selectedTags.map(tag => <TagChip key={tag.id} tag={tag} size="sm" />)
            ) : (
              <span className="text-muted-foreground text-sm">Select tags…</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tags…" />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup>
              {allTags.map(tag => (
                <CommandItem
                  key={tag.id}
                  value={tag.name}
                  onSelect={() => toggleTag(tag.id)}
                >
                  <TagChip tag={tag} size="sm" />
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4',
                      selectedTagIds.includes(tag.id) ? 'opacity-100' : 'opacity-0'
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
