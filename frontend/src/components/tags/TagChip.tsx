import { X } from 'lucide-react'
import { getContrastColor } from '@/lib/tagColors'
import type { Tag } from '@/types'

interface TagChipProps {
  tag: Tag
  size?: 'sm' | 'md'
  onRemove?: () => void
}

export function TagChip({ tag, size = 'md', onRemove }: TagChipProps) {
  const textColor = getContrastColor(tag.color)
  return (
    <span
      className={size === 'sm' ? 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium' : 'inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium'}
      style={{ backgroundColor: tag.color, color: textColor }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          className="ml-1 rounded-full p-0.5 hover:bg-black/20 focus:outline-none"
          onClick={onRemove}
          aria-label={`Remove ${tag.name} filter`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
