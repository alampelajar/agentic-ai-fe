import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_RUNNER_URL, useDesktopRuntime } from './desktop-runtime-store'

type Reply = { status: number; body?: unknown } | 'network-error'

/** Stands in for the Local Agent Runner's HTTP API. */
function stubRunner(routes: Record<string, Reply>) {
  const calls: { path: string; method: string; auth: string | null; body?: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname
      const headers = new Headers(init?.headers)
      calls.push({ path, method: init?.method ?? 'GET', auth: headers.get('Authorization'), body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined })
      const reply = routes[path] ?? routes[`${init?.method ?? 'GET'} ${path}`]
      if (!reply || reply === 'network-error') throw new TypeError('Failed to fetch')
      return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.body ?? {} }
    })
  )
  return calls
}

const healthy = {
  '/health': { status: 200, body: { ok: true } },
  '/api/workspaces': { status: 200, body: { workspaces: [{ id: 'conelo', name: 'Conelo' }, { id: 'tools', name: 'Tools' }] } },
  '/api/desktop/status': { status: 200, body: { status: 'running', data: { device_name: 'DESKTOP-ALAM' } } },
} satisfies Record<string, Reply>

describe('Desktop Runtime connection store', () => {
  beforeEach(() => {
    useDesktopRuntime.setState(useDesktopRuntime.getInitialState(), true)
    localStorage.clear()
    sessionStorage.clear()
  })
  afterEach(() => vi.unstubAllGlobals())

  const withCredentials = (token = 'a-long-test-token', url = DEFAULT_RUNNER_URL) => {
    useDesktopRuntime.getState().setUrl(url)
    useDesktopRuntime.getState().setToken(token)
  }

  it('starts disconnected at the usual local address', () => {
    const state = useDesktopRuntime.getState()
    expect(state).toMatchObject({ url: 'http://127.0.0.1:8765', token: '', connected: false, desktopControl: 'unknown', problem: null })
  })

  it('connects, reads the local folders and asks whether desktop control is on', async () => {
    const calls = stubRunner(healthy)
    withCredentials()
    await useDesktopRuntime.getState().connect()
    const state = useDesktopRuntime.getState()
    expect(state).toMatchObject({ connected: true, connecting: false, desktopControl: 'available', deviceName: 'DESKTOP-ALAM', problem: null, localWorkspaceId: 'conelo' })
    expect(state.localWorkspaces.map((workspace) => workspace.id)).toEqual(['conelo', 'tools'])
    // The health check needs no token; every other call sends it.
    expect(calls.find((call) => call.path === '/health')?.auth).toBeNull()
    expect(calls.filter((call) => call.path !== '/health').every((call) => call.auth === 'Bearer a-long-test-token')).toBe(true)
  })

  it('removes a trailing slash from the address and keeps the folder that was chosen', async () => {
    stubRunner(healthy)
    withCredentials('t', 'http://127.0.0.1:8765///')
    useDesktopRuntime.getState().selectLocalWorkspace('tools')
    await useDesktopRuntime.getState().connect()
    expect(useDesktopRuntime.getState()).toMatchObject({ url: 'http://127.0.0.1:8765', localWorkspaceId: 'tools' })
  })

  it('does not call anything without a URL and a token', async () => {
    const calls = stubRunner(healthy)
    await useDesktopRuntime.getState().connect()
    expect(useDesktopRuntime.getState()).toMatchObject({ connected: false, problem: 'missing-credentials' })
    expect(calls).toHaveLength(0)
  })

  it('says the runner is not running when nothing answers', async () => {
    stubRunner({ '/health': 'network-error' })
    withCredentials()
    await useDesktopRuntime.getState().connect()
    expect(useDesktopRuntime.getState()).toMatchObject({ connected: false, connecting: false, problem: 'unreachable' })
  })

  it('tells a wrong token apart from a runner that is not running', async () => {
    stubRunner({ ...healthy, '/api/workspaces': { status: 401, body: { error: 'unauthorized' } } })
    withCredentials('wrong')
    await useDesktopRuntime.getState().connect()
    expect(useDesktopRuntime.getState()).toMatchObject({ connected: false, problem: 'unauthorized' })
  })

  it('reports any other answer from the runner', async () => {
    stubRunner({ ...healthy, '/api/workspaces': { status: 500, body: { error: 'registry unreadable' } } })
    withCredentials()
    await useDesktopRuntime.getState().connect()
    expect(useDesktopRuntime.getState()).toMatchObject({ connected: false, problem: 'http-error', problemDetail: 'registry unreadable' })
  })

  it('stays connected, and says so, when desktop control is switched off on the runner', async () => {
    stubRunner({ ...healthy, '/api/desktop/status': { status: 503, body: { ok: false, status: 'disconnected' } } })
    withCredentials()
    await useDesktopRuntime.getState().connect()
    expect(useDesktopRuntime.getState()).toMatchObject({ connected: true, desktopControl: 'disabled', deviceName: '' })
  })

  it('a runner without registered folders is still connected', async () => {
    stubRunner({ ...healthy, '/api/workspaces': { status: 200, body: { workspaces: [] } } })
    withCredentials()
    await useDesktopRuntime.getState().connect()
    expect(useDesktopRuntime.getState()).toMatchObject({ connected: true, localWorkspaces: [], localWorkspaceId: '' })
  })

  it('editing the address or the token drops the connection until it is made again', async () => {
    stubRunner(healthy)
    withCredentials()
    await useDesktopRuntime.getState().connect()
    useDesktopRuntime.getState().setToken('another')
    expect(useDesktopRuntime.getState()).toMatchObject({ connected: false, desktopControl: 'unknown' })
  })

  it('disconnecting forgets the token, the folders and the status, but keeps the address', async () => {
    stubRunner(healthy)
    withCredentials('secret-token', 'http://localhost:9000')
    await useDesktopRuntime.getState().connect()
    useDesktopRuntime.getState().disconnect()
    expect(useDesktopRuntime.getState()).toMatchObject({ url: 'http://localhost:9000', token: '', connected: false, localWorkspaces: [], localWorkspaceId: '', deviceName: '', desktopControl: 'unknown' })
  })

  it('never writes the token to browser storage', async () => {
    stubRunner(healthy)
    withCredentials('super-secret-runner-token')
    await useDesktopRuntime.getState().connect()
    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie
    expect(stored).not.toContain('super-secret-runner-token')
  })

  it('remembers that desktop control was stopped until the next connection', async () => {
    stubRunner(healthy)
    withCredentials()
    await useDesktopRuntime.getState().connect()
    useDesktopRuntime.getState().markDesktopStopped()
    expect(useDesktopRuntime.getState().stopped).toBe(true)
    await useDesktopRuntime.getState().connect()
    expect(useDesktopRuntime.getState().stopped).toBe(false)
  })

  describe('cloning a repository into a local folder', () => {
    it('adds the folder and selects it', async () => {
      const calls = stubRunner({
        ...healthy,
        'POST /api/workspaces/clone': { status: 200, body: { workspace: { id: 'octo-repo', name: 'octo/repo' } } },
      })
      withCredentials()
      await useDesktopRuntime.getState().connect()
      stubRunner({
        '/api/workspaces': { status: 200, body: { workspaces: [{ id: 'conelo', name: 'Conelo' }, { id: 'octo-repo', name: 'octo/repo' }] } },
        'POST /api/workspaces/clone': { status: 200, body: { workspace: { id: 'octo-repo', name: 'octo/repo' } } },
      })
      expect(await useDesktopRuntime.getState().cloneRepository('https://github.com/octo/repo')).toBe(true)
      expect(useDesktopRuntime.getState()).toMatchObject({ localWorkspaceId: 'octo-repo', cloning: false, cloneMessage: 'ok:octo/repo' })
      expect(calls.length).toBeGreaterThan(0)
    })

    it('reports a refusal from the runner', async () => {
      stubRunner(healthy)
      withCredentials()
      await useDesktopRuntime.getState().connect()
      stubRunner({ 'POST /api/workspaces/clone': { status: 400, body: { error: 'only public https://github.com repositories are allowed' } } })
      expect(await useDesktopRuntime.getState().cloneRepository('http://evil.example/x')).toBe(false)
      expect(useDesktopRuntime.getState().cloneMessage).toBe('error:only public https://github.com repositories are allowed')
    })

    it('does nothing before the runner is connected', async () => {
      const calls = stubRunner(healthy)
      expect(await useDesktopRuntime.getState().cloneRepository('https://github.com/octo/repo')).toBe(false)
      expect(useDesktopRuntime.getState().cloneMessage).toBe('not-connected')
      expect(calls).toHaveLength(0)
    })
  })
})
