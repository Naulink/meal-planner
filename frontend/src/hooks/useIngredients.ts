import { useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import type { Ingredient, CreateIngredientPayload } from '@/types'

interface SearchParams {
  search?: string
  tagIds?: number[]
  min_kcal?: number
  max_kcal?: number
}

export function useIngredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchIngredients = useCallback(async (params?: SearchParams) => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (params?.search) qs.set('search', params.search)
      if (params?.tagIds?.length) qs.set('tags', params.tagIds.join(','))
      if (params?.min_kcal) qs.set('min_kcal', String(params.min_kcal))
      if (params?.max_kcal) qs.set('max_kcal', String(params.max_kcal))
      const query = qs.toString() ? `?${qs}` : ''
      const data = await apiFetch<Ingredient[]>(`/ingredients${query}`)
      setIngredients(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  const createIngredient = useCallback(async (data: CreateIngredientPayload): Promise<Ingredient> => {
    const created = await apiFetch<Ingredient>('/ingredients', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    setIngredients(prev => [...prev, created])
    return created
  }, [])

  const updateIngredient = useCallback(async (id: number, data: CreateIngredientPayload): Promise<Ingredient> => {
    const updated = await apiFetch<Ingredient>(`/ingredients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    setIngredients(prev => prev.map(i => (i.id === id ? updated : i)))
    return updated
  }, [])

  const deleteIngredient = useCallback(async (id: number): Promise<void> => {
    const prev = ingredients
    setIngredients(ps => ps.filter(i => i.id !== id))
    try {
      await apiFetch(`/ingredients/${id}`, { method: 'DELETE' })
    } catch (err) {
      setIngredients(prev)
      throw err
    }
  }, [ingredients])

  return { ingredients, loading, error, fetchIngredients, createIngredient, updateIngredient, deleteIngredient }
}
