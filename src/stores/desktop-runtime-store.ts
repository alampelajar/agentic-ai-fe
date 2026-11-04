import { create } from 'zustand'

/**
 * The connection to the optional Desktop Runtime (the Local Agent Runner on the
 * user's own computer). It lives for the browser session only and is never
 * written to storage: the bearer token stays in memory, as before.
 */

export type LocalRunnerWorkspace = { id: string; name: string }

export type RuntimeProblem =
  | 'missing-credentials' // no URL or token entered
  | 'unreachable' // nothing answered at the URL
  | 'unauthorized' // the runner is there but refused the token
  | 'http-error' // any other answer
  | 'unknown'

export type DesktopControl = 'unknown' | 'available' | 'disabled'

type DesktopRuntimeState = {
  url: string
  token: string
  connected: boolean
  connecting: boolean
  /** What the runner said about desktop control: available, or switched off on the runner. */
  desktopControl: DesktopControl
  deviceName: string
  /** True after the user stopped the desktop runtime; connecting again clears it. */
  stopped: boolean
  problem: RuntimeProblem | null
  problemDetail: string
  localWorkspaces: LocalRunnerWorkspace[]
  localWorkspaceId: string
  cloning: boolean
  cloneMessage: string

  setUrl: (url: string) => void
  setToken: (token: string) => void
  selectLocalWorkspace: (id: string) => void
  connect: () => Promise<void>
  disconnect: () => void
  cloneRepository: (repositoryUrl: string) => Promise<boolean>
  /** Called when the user stops the desktop runtime: the connection stays, desktop control does not. */
  markDesktopStopped: () => void
}

export const DEFAULT_RUNNER_URL = 'http://127.0.0.1:8765'

const initial = {
  url: DEFAULT_RUNNER_URL,
  token: '',
  connected: false,
  connecting: false,
  desktopControl: 'unknown' as DesktopControl,
  deviceName: '',
  stopped: false,
  problem: null as RuntimeProblem | null,
  problemDetail: '',
  localWorkspaces: [] as LocalRunnerWorkspace[],
  localWorkspaceId: '',
  cloning: false,
  cloneMessage: '',
}

const normalize = (url: string) => url.trim().replace(/\/+$/, '')

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>
}

export const useDesktopRuntime = create<DesktopRuntimeState>()((set, get) => ({
  ...initial,

  setUrl: (url) => set({ url, connected: false, desktopControl: 'unknown', problem: null }),
  setToken: (token) => set({ token, connected: false, desktopControl: 'unknown', problem: null }),
  selectLocalWorkspace: (id) => set({ localWorkspaceId: id }),

  connect: async () => {
    const base = normalize(get().url)
    const token = get().token.trim()
    if (!base || !token) {
      set({ problem: 'missing-credentials', problemDetail: '', connected: false })
      return
    }
    set({ connecting: true, problem: null, problemDetail: '' })

    // Is anything there? /health needs no token, so this tells "not running" apart from "wrong token".
    try {
      await fetch(`${base}/health`)
    } catch {
      set({ connecting: false, connected: false, desktopControl: 'unknown', problem: 'unreachable', problemDetail: '' })
      return
    }

    try {
      const response = await fetch(`${base}/api/workspaces`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await readJson(response)
      if (response.status === 401 || response.status === 403) {
        set({ connecting: false, connected: false, problem: 'unauthorized', problemDetail: '' })
        return
      }
      if (!response.ok) {
        set({ connecting: false, connected: false, problem: 'http-error', problemDetail: String(data.error ?? `HTTP ${response.status}`) })
        return
      }
      const workspaces = Array.isArray(data.workspaces) ? (data.workspaces as LocalRunnerWorkspace[]) : []

      // Desktop control is a separate switch on the runner; ask it, but a refusal does not undo the connection.
      let desktopControl: DesktopControl = 'unknown'
      let deviceName = ''
      try {
        const status = await fetch(`${base}/api/desktop/status`, { headers: { Authorization: `Bearer ${token}` } })
        if (status.ok) {
          desktopControl = 'available'
          const body = await readJson(status)
          deviceName = String((body.data as { device_name?: string } | undefined)?.device_name ?? '')
        } else {
          desktopControl = 'disabled'
        }
      } catch {
        desktopControl = 'unknown'
      }

      set((state) => ({
        url: base,
        connecting: false,
        connected: true,
        problem: null,
        desktopControl,
        deviceName,
        stopped: false,
        localWorkspaces: workspaces,
        localWorkspaceId: workspaces.some((workspace) => workspace.id === state.localWorkspaceId) ? state.localWorkspaceId : workspaces[0]?.id ?? '',
      }))
    } catch (error) {
      set({ connecting: false, connected: false, problem: 'unknown', problemDetail: error instanceof Error ? error.message : '' })
    }
  },

  // Forget the connection in this browser. The runner itself keeps running on the computer.
  disconnect: () => set({ ...initial, url: get().url }),

  cloneRepository: async (repositoryUrl) => {
    const { connected, url, token } = get()
    const target = repositoryUrl.trim()
    if (!connected || !target) {
      set({ cloneMessage: 'not-connected' })
      return false
    }
    set({ cloning: true, cloneMessage: '' })
    const base = normalize(url)
    try {
      const response = await fetch(`${base}/api/workspaces/clone`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      })
      const data = await readJson(response)
      if (!response.ok) throw new Error(String(data.error ?? 'clone-failed'))
      const listResponse = await fetch(`${base}/api/workspaces`, { headers: { Authorization: `Bearer ${token}` } })
      const list = await readJson(listResponse)
      if (!listResponse.ok) throw new Error(String(list.error ?? 'list-failed'))
      const workspaces = Array.isArray(list.workspaces) ? (list.workspaces as LocalRunnerWorkspace[]) : []
      const created = (data.workspace as { id?: string; name?: string } | undefined) ?? {}
      set({ cloning: false, localWorkspaces: workspaces, localWorkspaceId: String(created.id || workspaces[0]?.id || ''), cloneMessage: `ok:${created.name || target}` })
      return true
    } catch (error) {
      set({ cloning: false, cloneMessage: `error:${error instanceof Error ? error.message : 'clone-failed'}` })
      return false
    }
  },

  markDesktopStopped: () => set({ stopped: true }),
}))
