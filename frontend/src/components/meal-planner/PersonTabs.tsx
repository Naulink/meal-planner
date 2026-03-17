import { cn } from '@/lib/utils'
import type { Person } from '@/types'

interface PersonTabsProps {
  persons: Person[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export function PersonTabs({ persons, selectedIndex, onSelect }: PersonTabsProps) {
  return (
    <div className="flex overflow-x-auto border-b md:hidden">
      {persons.map((person, index) => (
        <button
          key={person.id}
          onClick={() => onSelect(index)}
          className={cn(
            'px-4 py-2 text-sm font-medium whitespace-nowrap cursor-pointer flex-shrink-0',
            index === selectedIndex
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground',
          )}
        >
          {person.name}
        </button>
      ))}
    </div>
  )
}
