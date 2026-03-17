import { useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import type { Recipe, CreateRecipePayload } from '@/types'

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<Recipe[]>('/recipes')
      setRecipes(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  const getRecipe = useCallback(async (id: number): Promise<Recipe> => {
    return apiFetch<Recipe>(`/recipes/${id}`)
  }, [])

  const createRecipe = useCallback(async (data: CreateRecipePayload): Promise<Recipe> => {
    const created = await apiFetch<Recipe>('/recipes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    setRecipes(prev => [...prev, created])
    return created
  }, [])

  const updateRecipe = useCallback(async (id: number, data: CreateRecipePayload): Promise<Recipe> => {
    const updated = await apiFetch<Recipe>(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    setRecipes(prev => prev.map(r => (r.id === id ? updated : r)))
    return updated
  }, [])

  const deleteRecipe = useCallback(async (id: number): Promise<void> => {
    await apiFetch(`/recipes/${id}`, { method: 'DELETE' })
    setRecipes(prev => prev.filter(r => r.id !== id))
  }, [])

  return { recipes, loading, error, fetchRecipes, getRecipe, createRecipe, updateRecipe, deleteRecipe }
}
