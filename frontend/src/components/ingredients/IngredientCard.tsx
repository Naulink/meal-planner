import { useState } from 'react'
import { Carrot, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'
import { TagChip } from '@/components/tags/TagChip'
import type { Ingredient } from '@/types'

interface IngredientCardProps {
  ingredient: Ingredient
  onEdit: (ingredient: Ingredient) => void
  onDelete: (id: number) => Promise<void>
}

export function IngredientCard({ ingredient, onEdit, onDelete }: IngredientCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const visibleTags = ingredient.tags?.filter(t => t.show_on_cards) ?? []

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(ingredient.id)
      toast.success(`Deleted ${ingredient.name}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error('This ingredient is used in one or more recipes')
      } else {
        toast.error(err instanceof Error ? err.message : 'Delete failed')
      }
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <div
        className="group relative rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
        onClick={() => onEdit(ingredient)}
      >
        {/* Image */}
        <div className="aspect-[4/3] overflow-hidden">
          {ingredient.image_url ? (
            <img src={ingredient.image_url} alt={ingredient.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-50 dark:from-stone-800 dark:to-stone-700 flex items-center justify-center">
              <Carrot className="w-12 h-12 text-orange-300 dark:text-stone-500" />
            </div>
          )}
        </div>

        {/* Action buttons — shown on hover */}
        <div className="absolute top-2 right-2 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="secondary" className="h-7 w-7 shadow-sm" onClick={e => { e.stopPropagation(); onEdit(ingredient) }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="secondary" className="h-7 w-7 shadow-sm text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteOpen(true) }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Title + info */}
        <div className="px-3 pt-3 pb-2">
          <p className="font-semibold text-sm leading-snug truncate mb-1">{ingredient.name}</p>
          <Badge variant="secondary" className="text-xs">
            {ingredient.kcal_per_100} kcal/100g
          </Badge>
        </div>

        {/* Divider + tags */}
        {visibleTags.length > 0 && (
          <>
            <div className="border-t border-border mx-3" />
            <div className="px-3 py-2 flex flex-wrap gap-1">
              {visibleTags.map(tag => (
                <TagChip key={tag.id} tag={tag} size="sm" />
              ))}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={open => !open && setDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-all">Delete {ingredient.name}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
