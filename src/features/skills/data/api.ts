import { apiFetch } from '@/lib/api'

export type Skill = {
  id: number
  slug: string
  name: string
  description: string
  author: string
  source: string
  status: string
  is_enabled: boolean
  current_version?: string
  validation_status?: string
  validation_error?: string
  tools: string[]
  requested_permissions: string[]
  created_at?: string
  updated_at?: string
}

export type AgentSkill = {
  id: number
  agent_id: number
  skill_id: number
  is_enabled: boolean
  skill: Skill
}

type SkillManifest = {
  id: string
  name: string
  version: string
  description: string
  author: string
  platforms: string[]
  instructions: string
  tools: string[]
  requested_permissions: string[]
}

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || data?.message || 'Permintaan skill gagal.')
  return data as T
}

export async function getSkills(query = ''): Promise<Skill[]> {
  const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
  const data = await parse<{ skills: Skill[] }>(await apiFetch(`/api/skills${suffix}`))
  return data.skills || []
}

export async function createSkill(manifest: SkillManifest, instructions: string) {
  return parse<{ skill: Skill }>(await apiFetch('/api/skills', {
    method: 'POST',
    body: JSON.stringify({ manifest, instructions }),
  }))
}

export async function importSkillZip(file: File) {
  const form = new FormData()
  form.append('file', file)
  return parse<{ skill: Skill }>(await apiFetch('/api/skills/import/zip', { method: 'POST', body: form }))
}

export async function importSkillGithub(url: string) {
  return parse<{ skill: Skill }>(await apiFetch('/api/skills/import/github', { method: 'POST', body: JSON.stringify({ url }) }))
}

export async function updateSkill(id: number, payload: Partial<Pick<Skill, 'name' | 'description' | 'is_enabled'>>) {
  return parse<{ skill: Skill }>(await apiFetch(`/api/skills/${id}`, { method: 'PUT', body: JSON.stringify(payload) }))
}

export async function deleteSkill(id: number) {
  return parse<{ ok: boolean }>(await apiFetch(`/api/skills/${id}`, { method: 'DELETE' }))
}

export async function validateSkill(id: number) {
  return parse<{ valid: boolean; error?: string }>(await apiFetch(`/api/skills/${id}/validate`, { method: 'POST' }))
}

export async function getAgentSkills(agentId: number): Promise<AgentSkill[]> {
  const data = await parse<{ skills: AgentSkill[] }>(await apiFetch(`/api/agents/${agentId}/skills`))
  return data.skills || []
}

export async function assignSkillToAgent(agentId: number, skillId: number) {
  return parse<{ assignment: AgentSkill }>(await apiFetch(`/api/agents/${agentId}/skills`, { method: 'POST', body: JSON.stringify({ skill_id: skillId }) }))
}

export async function updateAgentSkill(agentId: number, skillId: number, isEnabled: boolean) {
  return parse<{ assignment: AgentSkill }>(await apiFetch(`/api/agents/${agentId}/skills/${skillId}`, { method: 'PATCH', body: JSON.stringify({ is_enabled: isEnabled }) }))
}

export async function removeSkillFromAgent(agentId: number, skillId: number) {
  return parse<{ ok: boolean }>(await apiFetch(`/api/agents/${agentId}/skills/${skillId}`, { method: 'DELETE' }))
}
