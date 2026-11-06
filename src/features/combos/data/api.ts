import { apiFetch } from '@/lib/api'

export type ComboStrategy = 'fallback' | 'round_robin'

export type ComboMember = {
  ai_model_id: number
  name: string
  model_id: string
  provider: string
  is_system: boolean
  position: number
  weight: number
  is_enabled: boolean
  /** False when the model was switched off or removed since the combo was saved. */
  available: boolean
}

export type Combo = {
  id: number
  /** The id to choose in the chat: a combo shows up there as a model. */
  ai_model_id: number
  name: string
  slug: string
  description: string
  strategy: ComboStrategy
  max_attempts: number
  is_active: boolean
  members: ComboMember[]
  agent_ids: number[]
  created_at: string
}

export type ComboLimits = { max_combos: number; max_members: number }

export type ComboList = { combos: Combo[]; enabled: boolean; limits: ComboLimits }

/** What the person sets. The server decides the owner and checks every model. */
export type ComboDraft = {
  name: string
  description: string
  strategy: ComboStrategy
  max_attempts: number
  members: { ai_model_id: number; weight: number }[]
  agent_ids: number[]
}

/** A model that may become a member: the person's own or one of the system's. */
export type ComboModelOption = {
  id: number
  name: string
  model_id: string
  provider: string
  is_system: boolean
}

export type ComboAgent = { id: number; name: string }

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || data?.message || 'Permintaan combo gagal.')
  return data as T
}

export async function getCombos(): Promise<ComboList> {
  const data = await parse<Partial<ComboList>>(await apiFetch('/api/ai/combos'))
  return {
    combos: data.combos || [],
    enabled: data.enabled !== false,
    limits: data.limits || { max_combos: 10, max_members: 4 },
  }
}

export async function createCombo(draft: ComboDraft): Promise<Combo> {
  const data = await parse<{ combo: Combo }>(await apiFetch('/api/ai/combos', { method: 'POST', body: JSON.stringify(draft) }))
  return data.combo
}

export async function updateCombo(id: number, changes: Partial<ComboDraft> & { is_active?: boolean }): Promise<Combo> {
  const data = await parse<{ combo: Combo }>(await apiFetch(`/api/ai/combos/${id}`, { method: 'PUT', body: JSON.stringify(changes) }))
  return data.combo
}

export async function deleteCombo(id: number): Promise<void> {
  await parse<{ ok: boolean }>(await apiFetch(`/api/ai/combos/${id}`, { method: 'DELETE' }))
}

/** Models that can be combined. A combo itself is left out: combos do not nest. */
export async function getComboModelOptions(): Promise<ComboModelOption[]> {
  const data = await parse<{ models?: { id: number; name: string; model_id: string; is_system: boolean; is_active?: boolean; provider?: { name?: string; type?: string } }[] }>(
    await apiFetch('/api/ai/models')
  )
  return (data.models || [])
    .filter((model) => model.is_active !== false && model.provider?.type !== 'combo')
    .map((model) => ({ id: model.id, name: model.name, model_id: model.model_id, provider: model.provider?.name || '', is_system: model.is_system }))
}

/** The agents a combo can be used with. */
export async function getComboAgents(): Promise<ComboAgent[]> {
  const data = await parse<{ agents?: { id: number; name: string }[] }>(await apiFetch('/api/agents'))
  return (data.agents || []).map((agent) => ({ id: agent.id, name: agent.name }))
}
