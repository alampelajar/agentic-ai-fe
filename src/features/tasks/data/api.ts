import { apiFetch } from '@/lib/api/client'

export type TaskStatus =
  'todo' | 'in progress' | 'done' | 'canceled' | 'backlog'
export type TaskLabel = 'bug' | 'feature' | 'documentation'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export type BackendTask = {
  id: number
  title: string
  description: string
  status: TaskStatus
  label: TaskLabel
  priority: TaskPriority
  agent_id?: number | null
  model_id?: number | null
  workspace_id?: number | null
  agent?: { id: number; name: string; slug: string } | null
  created_at: string
  updated_at: string
}

export type TaskMutationInput = {
  title?: string
  description?: string
  status?: string
  label?: string
  priority?: string
  agent_id?: number | null
  model_id?: number | null
  workspace_id?: number | null
}

async function readJSON(response: Response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Request failed')
  }
  return data
}

export async function getTasks() {
  const response = await apiFetch('/api/tasks', { cache: 'no-store' })
  const data = await readJSON(response)
  const tasks = Array.isArray(data) ? data : (data?.tasks ?? data?.data ?? [])

  return (Array.isArray(tasks) ? tasks : []) as BackendTask[]
}

export async function createTask(payload: TaskMutationInput) {
  const response = await apiFetch('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: payload.title,
      description: payload.description ?? '',
      status: payload.status ?? 'todo',
      label: payload.label ?? 'feature',
      priority: payload.priority ?? 'medium',
      agent_id: payload.agent_id ?? null,
      model_id: payload.model_id ?? null,
      workspace_id: payload.workspace_id ?? null,
    }),
  })

  const data = await readJSON(response)
  return data.task as BackendTask
}

export async function updateTask(
  id: string | number,
  payload: TaskMutationInput
) {
  const response = await apiFetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  const data = await readJSON(response)
  return data.task as BackendTask
}

export async function deleteTask(id: string | number) {
  const response = await apiFetch(`/api/tasks/${id}`, {
    method: 'DELETE',
  })

  return readJSON(response)
}
