import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { usePersonsContext } from '@/hooks/usePersons'
import { PersonCard } from '@/components/settings/PersonCard'
import { PersonForm } from '@/components/settings/PersonForm'
import { TagList } from '@/components/settings/TagList'

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const { persons, createPerson } = usePersonsContext()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCreate = async (data: { name: string; gender: string; age: number }) => {
    try {
      await createPerson(data)
      setShowAddForm(false)
      toast.success(`${data.name} added`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed')
    }
  }

  const handleDownloadBackup = () => {
    window.open('/api/backup', '_blank')
  }

  const handleRestoreConfirm = async () => {
    if (!restoreFile) return
    setRestoring(true)
    setRestoreError(null)
    try {
      const formData = new FormData()
      formData.append('file', restoreFile)
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const text = await res.text()
        setRestoreError(text || 'Restore failed')
        return
      }
      toast.success('Restore complete — reloading...')
      window.location.reload()
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Restore failed')
    } finally {
      setRestoring(false)
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open && !restoring) {
      setShowRestoreDialog(false)
      setRestoreFile(null)
      setRestoreError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <h2 className="text-lg font-semibold">Persons</h2>
          {!showAddForm && (
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              + Add Person
            </Button>
          )}
        </div>

        {persons.map(person => (
          <PersonCard key={person.id} person={person} />
        ))}

        {persons.length === 0 && !showAddForm && (
          <p className="text-muted-foreground text-sm text-center py-4">
            No persons added yet. Click "Add Person" to get started.
          </p>
        )}

        {showAddForm && (
          <div className="border rounded-lg p-4 bg-card">
            <p className="text-sm font-medium mb-3">New Person</p>
            <PersonForm
              onSubmit={handleCreate}
              onCancel={() => setShowAddForm(false)}
              submitLabel="Add Person"
            />
          </div>
        )}
      </div>

      <div className="mt-8 pt-8 border-t">
        <TagList />
      </div>

      <div className="mt-8 pt-8 border-t">
        <h2 className="text-lg font-semibold mb-2">Backup</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Download all your data or restore from a previous backup.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleDownloadBackup}>Download Backup</Button>
          <Button variant="destructive" onClick={() => setShowRestoreDialog(true)}>
            Restore Backup
          </Button>
        </div>
      </div>

      <Dialog open={showRestoreDialog} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              This will permanently delete all current data and replace it with the contents of
              the backup. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm font-medium">Select a backup file (.zip)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              disabled={restoring}
              className="text-sm"
              onChange={e => {
                setRestoreFile(e.target.files?.[0] ?? null)
                setRestoreError(null)
              }}
            />
            {restoreFile && (
              <p className="text-sm text-muted-foreground">{restoreFile.name}</p>
            )}
            {restoreError && (
              <p className="text-sm text-destructive">{restoreError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={restoring}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRestoreConfirm}
              disabled={!restoreFile || restoring}
            >
              {restoring ? 'Restoring…' : 'Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
