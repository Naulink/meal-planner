import { apiFetch } from '@/lib/api'
import type { Tag, CreateTagPayload, UpdateTagPayload } from '@/types'

export function fetchTags(): Promise<Tag[]> {
  return apiFetch<Tag[]>('/tags')
}

export function createTag(req: CreateTagPayload): Promise<Tag> {
  return apiFetch<Tag>('/tags', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export function updateTag(id: number, req: UpdateTagPayload): Promise<Tag> {
  return apiFetch<Tag>(`/tags/${id}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  })
}

export function deleteTag(id: number): Promise<void> {
  return apiFetch<void>(`/tags/${id}`, { method: 'DELETE' })
}
