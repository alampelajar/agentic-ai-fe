import { apiFetch } from '@/lib/api'

export type GitHubConnection =
  | { configured: boolean; connected: false }
  | { configured: boolean; connected: true; githubLogin: string; scope: string; connectedAt: string }

type Reply = {
  ok?: boolean
  message?: string
  code?: string
  configured?: boolean
  connected?: boolean
  github_login?: string
  scope?: string
  connected_at?: string
  url?: string
}

async function read(response: Response, fallback: string): Promise<Reply> {
  const result: Reply = await response.json().catch(() => ({}))
  if (!response.ok || result.ok !== true) throw new Error(result.message || fallback)
  return result
}

/** Whether the backend has GitHub set up, and whether this user connected an account. The token never reaches the browser. */
export async function getGitHubConnection(): Promise<GitHubConnection> {
  const result = await read(await apiFetch('/api/integrations/github'), 'Gagal membaca status GitHub.')
  const configured = result.configured === true
  if (!result.connected) return { configured, connected: false }
  return {
    configured,
    connected: true,
    githubLogin: result.github_login ?? '',
    scope: result.scope ?? '',
    connectedAt: result.connected_at ?? '',
  }
}

/** The GitHub address to send the browser to, to approve the connection. */
export async function startGitHubConnect(): Promise<string> {
  const result = await read(
    await apiFetch('/api/integrations/github/connect', { method: 'POST', body: JSON.stringify({}) }),
    'Gagal memulai koneksi GitHub.',
  )
  if (!result.url) throw new Error('Gagal memulai koneksi GitHub.')
  return result.url
}

export async function disconnectGitHub(): Promise<void> {
  await read(await apiFetch('/api/integrations/github', { method: 'DELETE' }), 'Gagal memutuskan GitHub.')
}
