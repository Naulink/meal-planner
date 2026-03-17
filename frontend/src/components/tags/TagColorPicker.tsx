import { TAG_COLORS } from '@/lib/tagColors'

interface TagColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function TagColorPicker({ value, onChange }: TagColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAG_COLORS.map(color => (
        <button
          key={color}
          type="button"
          className="w-6 h-6 rounded-full border border-border transition-transform hover:scale-110 focus:outline-none"
          style={{
            backgroundColor: color,
            boxShadow: value === color ? '0 0 0 2px white, 0 0 0 4px #374151' : undefined,
          }}
          onClick={() => onChange(color)}
          aria-label={color}
          aria-pressed={value === color}
        />
      ))}
    </div>
  )
}
