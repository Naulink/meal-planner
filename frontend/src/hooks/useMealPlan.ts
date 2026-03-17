import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import type { MealPlanEntry, CreateMealPlanEntryPayload } from '@/types'

export function useMealPlan() {
  const [entries, setEntries] = useState<MealPlanEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<MealPlanEntry[]>('/meal-plan')
      setEntries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  const addEntry = useCallback(async (data: CreateMealPlanEntryPayload): Promise<MealPlanEntry> => {
    const entry = await apiFetch<MealPlanEntry>('/meal-plan', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    // Optimistic update for recipe entries; ingredient entries need a full
    // refresh because the POST response omits the joined ingredient object.
    if (data.ingredient_id != null) {
      const all = await apiFetch<MealPlanEntry[]>('/meal-plan')
      setEntries(all)
    } else {
      setEntries(prev => [...prev, entry])
    }
    return entry
  }, [])

  const updateEntry = useCallback(async (id: number, data: { serving_grams?: number; amount?: number }): Promise<void> => {
    await apiFetch<void>(`/meal-plan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e
      return {
        ...e,
        ...(data.serving_grams !== undefined && { serving_grams: data.serving_grams }),
        ...(data.amount !== undefined && { amount: data.amount }),
      }
    }))
  }, [])

  const removeEntry = useCallback(async (id: number): Promise<void> => {
    setEntries(prev => prev.filter(e => e.id !== id))
    await apiFetch<void>(`/meal-plan/${id}`, { method: 'DELETE' })
  }, [])

  const removeDay = useCallback(async (dayIndex: number): Promise<void> => {
    setEntries(prev =>
      prev
        .filter(e => e.day_index !== dayIndex)
        .map(e => e.day_index > dayIndex ? { ...e, day_index: e.day_index - 1 } : e)
    )
    try {
      await apiFetch<void>(`/meal-plan/day/${dayIndex}`, { method: 'DELETE' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove day')
      await fetchEntries()
    }
  }, [fetchEntries])

  const resetAll = useCallback(async (): Promise<void> => {
    await apiFetch<void>('/meal-plan', { method: 'DELETE' })
    setEntries([])
  }, [])

  return { entries, loading, error, fetchEntries, addEntry, updateEntry, removeEntry, removeDay, resetAll }
}
