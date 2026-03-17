import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { usePersonsContext } from '@/hooks/usePersons'
import type { Person } from '@/types'

interface PersonGoalsFormProps {
  person: Person
}

export function PersonGoalsForm({ person }: PersonGoalsFormProps) {
  const { updatePersonSettings } = usePersonsContext()
  const [form, setForm] = useState({
    target_kcal: String(person.settings.target_kcal ?? 2000),
    target_protein: String(person.settings.target_protein ?? 150),
    target_carbs: String(person.settings.target_carbs ?? 200),
    target_fat: String(person.settings.target_fat ?? 65),
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const values = {
      target_kcal: parseInt(form.target_kcal),
      target_protein: parseInt(form.target_protein),
      target_carbs: parseInt(form.target_carbs),
      target_fat: parseInt(form.target_fat),
    }
    if (Object.values(values).some(v => isNaN(v) || v < 0)) {
      toast.error('All values must be non-negative integers')
      return
    }
    setSaving(true)
    try {
      await updatePersonSettings(person.id, values)
      toast.success('Goals saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { key: 'target_kcal', label: 'Calories', unit: 'kcal' },
    { key: 'target_protein', label: 'Protein', unit: 'g' },
    { key: 'target_carbs', label: 'Carbs', unit: 'g' },
    { key: 'target_fat', label: 'Fat', unit: 'g' },
  ] as const

  return (
    <form onSubmit={handleSubmit} className="pt-3 pb-1 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, unit }) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={`${person.id}-${key}`} className="text-sm">{label}</Label>
            <div className="flex items-center gap-1">
              <Input
                id={`${person.id}-${key}`}
                type="number"
                min={0}
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                className="h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground w-8 shrink-0">{unit}</span>
            </div>
          </div>
        ))}
      </div>
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? 'Saving...' : 'Save Goals'}
      </Button>
    </form>
  )
}
