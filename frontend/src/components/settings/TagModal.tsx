import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagColorPicker } from '@/components/tags/TagColorPicker'
import { TAG_COLORS } from '@/lib/tagColors'
import type { Tag, CreateTagPayload } from '@/types'

interface TagModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Tag
  onSubmit: (data: CreateTagPayload) => Promise<void>
}

export function TagModal({ open, onOpenChange, initial, onSubmit }: TagModalProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState(initial?.color ?? TAG_COLORS[10])
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState('')

  const handleOpenChange = (value: boolean) => {
    if (!saving) {
      if (!value) {
        setName(initial?.name ?? '')
        setDescription(initial?.description ?? '')
        setColor(initial?.color ?? TAG_COLORS[10])
        setNameError('')
      }
      onOpenChange(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setNameError('Name is required')
      return
    }
    setNameError('')
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), color })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Tag' : 'New Tag'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="tag-name">Name</Label>
              <span className="text-xs text-muted-foreground">{name.length}/25</span>
            </div>
            <Input
              id="tag-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Vegan"
              maxLength={25}
              className={nameError ? 'border-destructive' : ''}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="tag-description">Description</Label>
            <Input
              id="tag-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <TagColorPicker value={color} onChange={setColor} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : initial ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
