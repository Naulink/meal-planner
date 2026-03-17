import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { usePersonsContext } from '@/hooks/usePersons'
import { PersonForm } from './PersonForm'
import { PersonGoalsForm } from './PersonGoalsForm'
import type { Person } from '@/types'

interface PersonCardProps {
  person: Person
}

export function PersonCard({ person }: PersonCardProps) {
  const { updatePerson, deletePerson } = usePersonsContext()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)

  const handleUpdate = async (data: { name: string; gender: string; age: number }) => {
    try {
      await updatePerson(person.id, data)
      setEditing(false)
      toast.success('Person updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const handleDelete = async () => {
    try {
      await deletePerson(person.id)
      toast.success(`${person.name} deleted`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="border border-border rounded-xl p-4 bg-card shadow-sm">
      {editing ? (
        <PersonForm
          initial={person}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          submitLabel="Update"
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="min-w-0">
            <span className="font-medium truncate">{person.name}</span>
            <span className="text-sm text-muted-foreground ml-2">
              {person.gender} · {person.age} yrs
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
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
                  <AlertDialogTitle>Delete {person.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {person.name} and all their meal plan entries.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(e => !e)}
              aria-label={expanded ? 'Collapse goals' : 'Expand goals'}
            >
              {expanded ? '▼' : '▶'}
            </Button>
          </div>
        </div>
      )}
      {expanded && !editing && (
        <div className="mt-3 border-t pt-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Goals</p>
          <PersonGoalsForm person={person} />
        </div>
      )}
    </div>
  )
}
