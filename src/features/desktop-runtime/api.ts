export type DesktopWindow = { handle: number; title: string; class_name?: string }
export type DesktopStatus = { status: string; data?: { device_name?: string; windows_version?: string; sidecar?: string } }

async function runnerFetch<T>(baseUrl: string, token: string, path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
    ...options,
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...options?.headers },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Local Agent Runner request failed.')
  return body as T
}

export const getDesktopStatus = (base: string, token: string) => runnerFetch<DesktopStatus>(base, token, '/api/desktop/status')
export const getDesktopWindows = (base: string, token: string) => runnerFetch<{ data?: { windows?: DesktopWindow[] } }>(base, token, '/api/desktop/windows')
export const getDesktopScreenshot = (base: string, token: string) => runnerFetch<{ data?: { mime_type?: string; base64?: string } }>(base, token, '/api/desktop/screenshot')
export const inspectDesktopWindow = (base: string, token: string, window: string) => runnerFetch<{ data?: { elements?: Array<{ name: string; control_type?: string; automation_id?: string }> } }>(base, token, '/api/desktop/inspect', { method: 'POST', body: JSON.stringify({ window }), headers: { 'Content-Type': 'application/json' } })
export const stopDesktopRuntime = (base: string, token: string) => runnerFetch<{ status: string }>(base, token, '/api/desktop/stop', { method: 'POST' })
