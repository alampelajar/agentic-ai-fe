import { apiFetch } from '@/lib/api'

export type DesignProjectSummary = { id: number; name: string; revision: number; created_at: string; updated_at: string }
export type DesignProject = DesignProjectSummary & { document: unknown }

/** The server's limit for one design; larger saves are refused before sending. */
export const MAX_DOCUMENT_BYTES = 6 * 1024 * 1024

export class DesignApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) throw new DesignApiError(data?.message || 'Permintaan gagal.', response.status)
  return data as T
}

export async function listDesignProjects(): Promise<DesignProjectSummary[]> {
  const data = await parse<{ projects: DesignProjectSummary[] }>(await apiFetch('/api/design-projects'))
  return Array.isArray(data.projects) ? data.projects : []
}

export async function createDesignProject(name: string, document: unknown): Promise<DesignProject> {
  const data = await parse<{ project: DesignProject }>(await apiFetch('/api/design-projects', { method: 'POST', body: JSON.stringify({ name, document }) }))
  return data.project
}

export async function getDesignProject(id: number): Promise<DesignProject> {
  const data = await parse<{ project: DesignProject }>(await apiFetch(`/api/design-projects/${id}`))
  return data.project
}

export async function saveDesignProject(id: number, body: { name: string; serialized: string; revision: number }): Promise<number> {
  const payload = `{"name":${JSON.stringify(body.name)},"revision":${body.revision},"document":${body.serialized}}`
  const data = await parse<{ revision: number }>(await apiFetch(`/api/design-projects/${id}`, { method: 'PUT', body: payload }))
  return data.revision
}

export async function deleteDesignProject(id: number): Promise<void> {
  await parse(await apiFetch(`/api/design-projects/${id}`, { method: 'DELETE' }))
}
