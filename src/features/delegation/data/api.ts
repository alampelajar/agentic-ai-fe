import { apiFetch } from '@/lib/api'

export type DelegationAgent = { id: number; name: string }

export type DelegationRequest = {
  to_agent_id: number
  from_agent_id?: number | null
  task_id?: number | null
  instruction: string
  /** An excerpt of the conversation, sent as reference only. */
  context?: string
}

export type DelegationResult = {
  /** The other agent's answer, ready to show. Tool markers are already removed. */
  message: string
  delegation: { id: number; to_agent_id: number; status: 'completed' | 'failed'; duration_ms: number }
}

// Same limits as the server, so the dialog can say so before sending.
export const DELEGATION_INSTRUCTION_MAX = 4000
export const DELEGATION_CONTEXT_MAX = 6000

export async function delegateToAgent(request: DelegationRequest): Promise<DelegationResult> {
  const response = await apiFetch('/api/delegations', { method: 'POST', body: JSON.stringify(request) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || data?.message || 'Delegasi gagal.')
  return { message: String(data.message ?? ''), delegation: data.delegation }
}

export async function getDelegationAgents(): Promise<DelegationAgent[]> {
  const response = await apiFetch('/api/agents')
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || data?.message || 'Agent gagal dimuat.')
  return ((data.agents as { id: number; name: string }[] | undefined) || []).map((agent) => ({ id: agent.id, name: agent.name }))
}

/** Turns the last few chat messages into the excerpt sent with a delegation. */
export function buildDelegationContext(messages: { role: 'user' | 'agent'; content: string }[], limit = 6): string {
  const lines = messages
    .slice(-limit)
    .filter((item) => item.content.trim() !== '')
    .map((item) => `${item.role === 'user' ? 'User' : 'Agent'}: ${item.content.trim().slice(0, 800)}`)
  const joined = lines.join('\n')
  return joined.length > DELEGATION_CONTEXT_MAX ? joined.slice(joined.length - DELEGATION_CONTEXT_MAX) : joined
}
