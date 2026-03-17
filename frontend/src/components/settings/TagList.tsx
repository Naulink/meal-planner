import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { TagChip } from '@/components/tags/TagChip'
import { TagModal } from './TagModal'
import { fetchTags, createTag, updateTag, deleteTag } from '@/api/tags'
import { ApiError } from '@/lib/api'
import type { Tag, CreateTagPayload } from '@/types'

export function TagList() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)

  useEffect(() => {
    fetchTags()
      .then(setTags)
      .catch(() => toast.error('Failed to load tags'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (data: CreateTagPayload) => {
    const created = await createTag(data)
    setTags(prev => [...prev, created])
    toast.success(`Tag "${created.name}" created`)
  }

  const handleUpdate = async (data: CreateTagPayload) => {
    if (!editingTag) return
    const updated = await updateTag(editingTag.id, data)
    setTags(prev => prev.map(t => (t.id === updated.id ? updated : t)))
    setEditingTag(null)
    toast.success(`Tag "${updated.name}" updated`)
  }

  const handleToggleVisibility = async (tag: Tag, show: boolean) => {
    setTags(prev => prev.map(t => t.id === tag.id ? { ...t, show_on_cards: show } : t))
    try {
      await updateTag(tag.id, { name: tag.name, description: tag.description, color: tag.color, show_on_cards: show })
    } catch {
      setTags(prev => prev.map(t => t.id === tag.id ? { ...t, show_on_cards: !show } : t))
      toast.error('Failed to update tag visibility')
    }
  }

  const handleDelete = async (tag: Tag) => {
    try {
      await deleteTag(tag.id)
      setTags(prev => prev.filter(t => t.id !== tag.id))
      toast.success(`Tag "${tag.name}" deleted`)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(`"${tag.name}" is in use and cannot be deleted`)
      } else {
        toast.error(err instanceof Error ? err.message : 'Delete failed')
      }
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading tags…</p>
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Tags</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>+ New Tag</Button>
      </div>
      <div className="space-y-2">
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tags yet. Click "+ New Tag" to create one.
          </p>
        )}
        {tags.map(tag => (
          <div key={tag.id} className="flex flex-wrap items-center gap-y-1 border border-border rounded-lg px-3 py-2 bg-card">
            <div className="flex items-center gap-3 min-w-0 shrink-0">
              <TagChip tag={tag} />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <Checkbox
                  checked={tag.show_on_cards}
                  onCheckedChange={(checked) => handleToggleVisibility(tag, !!checked)}
                />
                Show on cards
              </label>
              <Button size="sm" variant="outline" onClick={() => setEditingTag(tag)}>
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{tag.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the tag. If the tag is in use, deletion will fail.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(tag)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      <TagModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={handleCreate}
      />

      {editingTag && (
        <TagModal
          open={true}
          onOpenChange={open => { if (!open) setEditingTag(null) }}
          initial={editingTag}
          onSubmit={handleUpdate}
        />
      )}
    </>
  )
}
