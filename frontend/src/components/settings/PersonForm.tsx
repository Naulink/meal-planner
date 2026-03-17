import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Person } from '@/types'

interface PersonFormProps {
  initial?: Person
  onSubmit: (data: { name: string; gender: string; age: number }) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

export function PersonForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: PersonFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [gender, setGender] = useState(initial?.gender ?? '')
  const [age, setAge] = useState(initial ? String(initial.age) : '')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!gender) errs.gender = 'Gender is required'
    const ageNum = parseInt(age)
    if (isNaN(ageNum) || ageNum <= 0) errs.age = 'Age must be a positive integer'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), gender, age: parseInt(age) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="person-name">Name</Label>
          <Input
            id="person-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Alice"
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <Label>Gender</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className={errors.gender ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="person-age">Age</Label>
          <Input
            id="person-age"
            type="number"
            min={1}
            value={age}
            onChange={e => setAge(e.target.value)}
            placeholder="30"
            className={errors.age ? 'border-destructive' : ''}
          />
          {errors.age && <p className="text-xs text-destructive">{errors.age}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving...' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
