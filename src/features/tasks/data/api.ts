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
  workspace_id?: number | null
  agent?: { id: number; name: string; slug: string } | null
  created_at: string
  updated_at: string
}

export type TaskMutationInput = {
  title?: string;
  description?: string;
  status?: string;
  label?: string;
  priority?: string;
  agent_id?: number | null;
  model_id?: number | null;
  workspace_id?: number | null;
};

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

/** A file attached to a stored chat message; the file itself comes from getTaskAttachment. */
export type BackendTaskAttachment = {
  id: number
  name: string
  mime_type: string
  size: number
  is_image: boolean
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
  attachments?: BackendTaskAttachment[]
}

export async function getTaskMessages(id: string | number) {
  const response = await apiFetch(`/api/tasks/${id}/messages`)
  const data = await readJSON(response)
  return (data.messages ?? []) as BackendTaskMessage[]
}

export async function addTaskMessage(
  id: string | number,
  payload: Omit<BackendTaskMessage, 'id' | 'task_id' | 'created_at' | 'attachments'>,
  /** Files attached to a user message, kept with it so the chat shows them after a reload. */
  attachments: File[] = []
) {
  let body: string | FormData = JSON.stringify(payload)
  if (attachments.length > 0) {
    const form = new FormData()
    for (const [key, value] of Object.entries(payload)) {
      if (value !== null && value !== undefined) form.append(key, String(value))
    }
    attachments.forEach((file) => form.append('attachments', file))
    body = form
  }
  const response = await apiFetch(`/api/tasks/${id}/messages`, {
    method: 'POST',
    body,
  })

  const data = await readJSON(response)
  return data.message as BackendTaskMessage
}

/** One stored attachment of the person's own task, as a Blob (the request carries their login). */
export async function getTaskAttachment(taskId: string | number, attachmentId: number) {
  const response = await apiFetch(`/api/tasks/${taskId}/attachments/${attachmentId}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.blob()
}
