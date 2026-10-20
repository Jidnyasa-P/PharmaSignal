import type { ApiConfig, Focus, Mode, ResearchResponse, ReviewStatus } from './types'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    })
  } catch {
    throw new Error('Could not reach the PharmaSignal API. Start the backend at http://127.0.0.1:8000 or check VITE_API_URL.')
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : `Request failed (${response.status}).`
    throw new Error(detail)
  }
  return body as T
}

export const getConfig = () => apiFetch<ApiConfig>('/api/config')
export const getHealth = () => apiFetch<{ status: string; service: string; timestamp: string }>('/api/health')
export const runResearch = (company: string, mode: Mode, focus: Focus) =>
  apiFetch<ResearchResponse>('/api/research', {
    method: 'POST',
    body: JSON.stringify({ company, mode, focus }),
  })
export const saveReview = (findingId: string, status: Exclude<ReviewStatus, 'pending'>, note: string, reviewer: string) =>
  apiFetch<{ saved: boolean; reviewed_at: string }>('/api/review', {
    method: 'POST',
    body: JSON.stringify({ finding_id: findingId, status, analyst_note: note, reviewer }),
  })
