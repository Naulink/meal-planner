import { useState, useCallback, createContext, useContext } from 'react'
import { apiFetch } from '@/lib/api'
import type {
  Person,
  CreatePersonPayload,
  UpdatePersonPayload,
  PersonSettings,
  UpdatePersonSettingsPayload,
} from '@/types'

export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPersons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<Person[]>('/persons')
      setPersons(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  const createPerson = useCallback(async (data: CreatePersonPayload): Promise<Person> => {
    const person = await apiFetch<Person>('/persons', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    setPersons(prev => [...prev, person])
    return person
  }, [])

  const updatePerson = useCallback(async (id: number, data: UpdatePersonPayload): Promise<Person> => {
    const updated = await apiFetch<Person>(`/persons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    setPersons(prev => prev.map(p => (p.id === id ? updated : p)))
    return updated
  }, [])

  const deletePerson = useCallback(async (id: number): Promise<void> => {
    setPersons(prev => prev.filter(p => p.id !== id))
    await apiFetch<void>(`/persons/${id}`, { method: 'DELETE' })
  }, [])

  const updatePersonSettings = useCallback(
    async (id: number, data: UpdatePersonSettingsPayload): Promise<PersonSettings> => {
      const updated = await apiFetch<PersonSettings>(`/persons/${id}/settings`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      setPersons(prev =>
        prev.map(p =>
          p.id === id
            ? { ...p, settings: { ...p.settings, ...updated } }
            : p
        )
      )
      return updated
    },
    []
  )

  return { persons, loading, error, fetchPersons, createPerson, updatePerson, deletePerson, updatePersonSettings }
}

export const PersonsContext = createContext<ReturnType<typeof usePersons> | null>(null)

export function usePersonsContext() {
  const ctx = useContext(PersonsContext)
  if (!ctx) throw new Error('usePersonsContext must be used within PersonsProvider')
  return ctx
}
