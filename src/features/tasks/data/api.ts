import { apiFetch } from '@/lib/api'

export type TaskStatus = 'todo' | 'in progress' | 'done' | 'canceled' | 'backlog'
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
  agent?: { id: number; name: string; slug: string } | null
  created_at: string
  updated_at: string
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
  const tasks = Array.isArray(data)
    ? data
    : (data?.tasks ?? data?.data ?? [])

  return (Array.isArray(tasks) ? tasks : []) as BackendTask[]
}

export async function getTask(id: string | number) {
  const cleanId = String(id)
    .trim()
    .replace(/^["']+|["']+$/g, '')

  if (!/^\d+$/.test(cleanId)) {
    throw new Error('ID task tidak valid.')
  }

  const response = await apiFetch(
    `/api/tasks/${encodeURIComponent(cleanId)}`,
    {
      cache: 'no-store',
    }
  )

  const data = await readJSON(response)
  return data.task as BackendTask
}

export async function createTask(payload: Partial<BackendTask>) {
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
    }),
  })

  const data = await readJSON(response)
  return data.task as BackendTask
}

export async function updateTask(
  id: string | number,
  payload: Partial<BackendTask>
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

export type BackendTaskMessage = {
  id: number
  task_id: number
  role: 'user' | 'assistant'
  content: string
  model?: string
  model_id?: number | null
  provider?: string
  created_at: string
}

export async function getTaskMessages(id: string | number) {
  const response = await apiFetch(`/api/tasks/${id}/messages`)
  const data = await readJSON(response)
  return (data.messages ?? []) as BackendTaskMessage[]
}

export async function addTaskMessage(
  id: string | number,
  payload: Omit<BackendTaskMessage, 'id' | 'task_id' | 'created_at'>
) {
  const response = await apiFetch(`/api/tasks/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  const data = await readJSON(response)
  return data.message as BackendTaskMessage
}
