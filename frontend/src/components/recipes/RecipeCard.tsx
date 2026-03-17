import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChefHat, Clock, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { TagChip } from '@/components/tags/TagChip'
import { formatCookTime } from '@/lib/utils'
import type { Recipe, Tag } from '@/types'

interface RecipeCardProps {
  recipe: Recipe
  tags: Tag[]
  onEdit: (recipe: Recipe) => void
  onDelete: (id: number) => Promise<void>
}

export function RecipeCard({ recipe, tags, onEdit, onDelete }: RecipeCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(recipe.id)
      toast.success(`Deleted ${recipe.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <div className="group relative rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {/* Image */}
        <Link to="/recipes/$id" params={{ id: String(recipe.id) }} className="block">
          <div className="aspect-[4/3] overflow-hidden">
            {recipe.image_url ? (
              <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-50 dark:from-stone-800 dark:to-stone-700 flex items-center justify-center">
                <ChefHat className="w-12 h-12 text-orange-300 dark:text-stone-500" />
              </div>
            )}
          </div>
        </Link>

        {/* Action buttons — shown on hover */}
        <div className="absolute top-2 right-2 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="secondary" className="h-7 w-7 shadow-sm" onClick={() => onEdit(recipe)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="secondary" className="h-7 w-7 shadow-sm text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Title + info */}
        <div className="px-3 pt-3 pb-2 flex flex-wrap items-center gap-1.5">
          <p className="font-semibold text-sm leading-snug truncate line-clamp-2 w-full mb-1">{recipe.name}</p>
          <Badge variant="secondary" className="text-xs">
            {recipe.ingredient_count} ingredient{recipe.ingredient_count !== 1 ? 's' : ''}
          </Badge>
          {recipe.cook_time_minutes && (
            <Badge variant="secondary" className="text-xs flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {formatCookTime(recipe.cook_time_minutes)}
            </Badge>
          )}
        </div>

        {/* Divider + tags */}
        {tags.length > 0 && (
          <>
            <div className="border-t border-border mx-3" />
            <div className="px-3 py-2 flex flex-wrap gap-1">
              {tags.map(tag => (
                <TagChip key={tag.id} tag={tag} size="sm" />
              ))}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={open => !open && setDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-all">Delete {recipe.name}?</AlertDialogTitle>
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
