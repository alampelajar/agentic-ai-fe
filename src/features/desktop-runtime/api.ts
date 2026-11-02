export type DesktopWindow = { handle: number; title: string; class_name?: string }
export type DesktopStatus = { status: string; data?: { device_name?: string; windows_version?: string; sidecar?: string } }
export type DesktopAction = { id: string; action: string; agent: string; reason: string; window?: string; target?: Record<string, unknown>; arguments?: Record<string, unknown>; expires_at: string }

/**
 * The runner answered with an HTTP error. Callers can tell this apart from a
 * network failure: the runner did receive the request, so for approve and deny
 * it no longer holds that approval (it removes it before it answers).
 */
export class RunnerRequestError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'RunnerRequestError'
    this.status = status
  }
}

async function runnerFetch<T>(baseUrl: string, token: string, path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
    ...options,
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...options?.headers },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new RunnerRequestError(body.error || 'Local Agent Runner request failed.', response.status)
  return body as T
}

export const getDesktopStatus = (base: string, token: string) => runnerFetch<DesktopStatus>(base, token, '/api/desktop/status')
export const getDesktopWindows = (base: string, token: string) => runnerFetch<{ data?: { windows?: DesktopWindow[] } }>(base, token, '/api/desktop/windows')
export const getDesktopScreenshot = (base: string, token: string) => runnerFetch<{ data?: { mime_type?: string; base64?: string } }>(base, token, '/api/desktop/screenshot')
export const inspectDesktopWindow = (base: string, token: string, window: string) => runnerFetch<{ data?: { elements?: Array<{ name: string; control_type?: string; automation_id?: string }> } }>(base, token, '/api/desktop/inspect', { method: 'POST', body: JSON.stringify({ window }), headers: { 'Content-Type': 'application/json' } })
export const stopDesktopRuntime = (base: string, token: string) => runnerFetch<{ status: string }>(base, token, '/api/desktop/stop', { method: 'POST' })
export const requestDesktopAction = (base: string, token: string, action: Omit<DesktopAction, 'id' | 'expires_at'>) => runnerFetch<{ action: DesktopAction }>(base, token, '/api/desktop/actions/request', { method: 'POST', body: JSON.stringify(action), headers: { 'Content-Type': 'application/json' } })
export const approveDesktopAction = (base: string, token: string, id: string, mode: 'once' | 'session') => runnerFetch<{ result: unknown }>(base, token, `/api/desktop/actions/${encodeURIComponent(id)}/approve`, { method: 'POST', body: JSON.stringify({ mode }), headers: { 'Content-Type': 'application/json' } })
export const denyDesktopAction = (base: string, token: string, id: string) => runnerFetch<{ status: string }>(base, token, `/api/desktop/actions/${encodeURIComponent(id)}/deny`, { method: 'POST' })
export const revokeDesktopPermission = (base: string, token: string) => runnerFetch<{ status: string }>(base, token, '/api/desktop/permissions/revoke', { method: 'POST' })
export const emergencyStopDesktop = (base: string, token: string) => runnerFetch<{ status: string }>(base, token, '/api/desktop/emergency-stop', { method: 'POST' })
