import { Lock } from 'lucide-react'
import { getContrastColor } from '@/lib/tagColors'
import type { Tag } from '@/types'

interface LockedTagChipProps {
  tag: Tag
  size?: 'sm' | 'md'
}

export function LockedTagChip({ tag, size = 'md' }: LockedTagChipProps) {
  const textColor = getContrastColor(tag.color)
  return (
    <span
      className={
        size === 'sm'
          ? 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium opacity-70'
          : 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium opacity-70'
      }
      style={{ backgroundColor: tag.color, color: textColor }}
      title="Automatically derived from ingredients"
    >
      <Lock className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {tag.name}
    </span>
  )
}
