import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MACRO_LABEL_DISPLAY } from '@/lib/macroLabels'
import type { MacroLabel } from '@/lib/macroLabels'

interface MacroFilterProps {
  selectedLabels: MacroLabel[]
  onChange: (labels: MacroLabel[]) => void
}

const ALL_LABELS: MacroLabel[] = [
  'calorie-free',
  'sugar-free',
  'fat-free',
  'low-fat',
  'low-carb',
  'high-protein',
]

export function MacroFilter({ selectedLabels, onChange }: MacroFilterProps) {
  const [open, setOpen] = useState(false)

  const toggleLabel = (label: MacroLabel) => {
    if (selectedLabels.includes(label)) {
      onChange(selectedLabels.filter(l => l !== label))
    } else {
      onChange([...selectedLabels, label])
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
            {selectedLabels.length > 0
              ? `${selectedLabels.length} label${selectedLabels.length > 1 ? 's' : ''} selected`
              : 'Filter by nutrition'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {ALL_LABELS.map(label => (
                <CommandItem
                  key={label}
                  value={label}
                  onSelect={() => toggleLabel(label)}
                >
                  {MACRO_LABEL_DISPLAY[label]}
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4',
                      selectedLabels.includes(label) ? 'opacity-100' : 'opacity-0'
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
