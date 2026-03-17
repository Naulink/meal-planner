import { ChefHat, Leaf } from 'lucide-react'

interface ThumbnailProps {
  imageUrl?: string | null
  name?: string
  size?: 'sm' | 'md'
}

export function RecipeThumbnail({ imageUrl, name, size = 'md' }: ThumbnailProps) {
  const cls = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  const iconCls = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  return imageUrl ? (
    <img src={imageUrl} alt={name ?? ''} className={`${cls} shrink-0 rounded-sm object-cover`} />
  ) : (
    <div className={`${cls} shrink-0 rounded-sm bg-gradient-to-br from-orange-100 to-amber-50 dark:from-stone-800 dark:to-stone-700 flex items-center justify-center`}>
      <ChefHat className={`${iconCls} text-orange-300 dark:text-stone-500`} />
    </div>
  )
}

export function IngredientThumbnail({ imageUrl, name, size = 'md' }: ThumbnailProps) {
  const cls = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  const iconCls = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  return imageUrl ? (
    <img src={imageUrl} alt={name ?? ''} className={`${cls} shrink-0 rounded-sm object-cover`} />
  ) : (
    <div className={`${cls} shrink-0 rounded-sm bg-gradient-to-br from-green-100 to-emerald-50 dark:from-stone-800 dark:to-stone-700 flex items-center justify-center`}>
      <Leaf className={`${iconCls} text-green-400 dark:text-stone-500`} />
    </div>
  )
}
