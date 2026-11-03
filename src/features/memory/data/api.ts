import { apiFetch } from '@/lib/api'

export const MEMORY_CATEGORIES = ['profile', 'preference', 'project', 'technical_context', 'decision', 'instruction'] as const
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number]
export type MemoryStatus = 'active' | 'archived'

export type Memory = {
  id: number
  agent_id: number | null
  category: MemoryCategory
  title: string
  content: string
  importance: number
  status: MemoryStatus
  source_task_id: number | null
  created_at: string
  updated_at: string
  last_used_at: string | null
}

export type MemoryAgent = { id: number; name: string }

export type MemoryFilters = {
  q?: string
  category?: MemoryCategory | 'all'
  /** "all", "global" (memories for every agent) or an agent id */
  agent?: string
  status?: MemoryStatus | 'all'
}

/** What the user can set. The server decides the owner, never the client. */
export type MemoryDraft = {
  title: string
  content: string
  category: MemoryCategory
  importance: number
  agent_id: number | null
}

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || data?.message || 'Permintaan memory gagal.')
  return data as T
}

export async function getMemories(filters: MemoryFilters = {}): Promise<Memory[]> {
  const params = new URLSearchParams()
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.category && filters.category !== 'all') params.set('category', filters.category)
  if (filters.agent && filters.agent !== 'all') params.set('agent_id', filters.agent)
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const data = await parse<{ memories: Memory[] }>(await apiFetch(`/api/memories${suffix}`))
  return data.memories || []
}

export async function createMemory(draft: MemoryDraft): Promise<Memory> {
  const data = await parse<{ memory: Memory }>(await apiFetch('/api/memories', { method: 'POST', body: JSON.stringify(draft) }))
  return data.memory
}

export async function updateMemory(id: number, changes: Partial<MemoryDraft> & { status?: MemoryStatus }): Promise<Memory> {
  const data = await parse<{ memory: Memory }>(await apiFetch(`/api/memories/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }))
  return data.memory
}

export async function deleteMemory(id: number): Promise<void> {
  await parse<{ ok: boolean }>(await apiFetch(`/api/memories/${id}`, { method: 'DELETE' }))
}

export async function getMemorySettings(): Promise<{ enabled: boolean }> {
  const data = await parse<{ settings: { enabled: boolean } }>(await apiFetch('/api/memory-settings'))
  return { enabled: Boolean(data.settings?.enabled) }
}

export async function setMemoryEnabled(enabled: boolean): Promise<{ enabled: boolean }> {
  const data = await parse<{ settings: { enabled: boolean } }>(await apiFetch('/api/memory-settings', { method: 'PUT', body: JSON.stringify({ enabled }) }))
  return { enabled: Boolean(data.settings?.enabled) }
}

/** The agents the user can attach a memory to. */
export async function getMemoryAgents(): Promise<MemoryAgent[]> {
  const data = await parse<{ agents?: { id: number; name: string }[] }>(await apiFetch('/api/agents'))
  return (data.agents || []).map((agent) => ({ id: agent.id, name: agent.name }))
}
