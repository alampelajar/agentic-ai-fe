import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import { useDesktopRuntime } from '@/stores/desktop-runtime-store'
import { IntegrationsPage } from './index'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

type Reply = { status: number; body?: unknown } | 'network-error'

function stubRunner(routes: Record<string, Reply>) {
  const paths: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname
      paths.push(`${init?.method ?? 'GET'} ${path}`)
      const reply = routes[`${init?.method ?? 'GET'} ${path}`] ?? routes[path]
      if (!reply || reply === 'network-error') throw new TypeError('Failed to fetch')
      return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.body ?? {} }
    })
  )
  return paths
}

const healthy = {
  '/health': { status: 200, body: { ok: true } },
  '/api/workspaces': { status: 200, body: { workspaces: [{ id: 'conelo', name: 'Conelo' }] } },
  '/api/desktop/status': { status: 200, body: { status: 'running', data: { device_name: 'DESKTOP-ALAM' } } },
  '/api/desktop/windows': { status: 200, body: { data: { windows: [{ handle: 131406, title: 'Notepad', class_name: 'ApplicationFrameWindow' }] } } },
} satisfies Record<string, Reply>

async function connect(screen: Awaited<ReturnType<typeof render>>) {
  await userEvent.fill(screen.getByLabelText('Bearer token'), 'a-long-test-token')
  await userEvent.click(screen.getByRole('button', { name: 'Connect', exact: true }))
}

describe('Settings → Integrations → Desktop Runtime', () => {
  beforeEach(async () => {
    useDesktopRuntime.setState(useDesktopRuntime.getInitialState(), true)
    await i18n.changeLanguage('en')
  })
  afterEach(() => vi.unstubAllGlobals())

  it('explains that the Desktop Runtime is optional and not needed for Cloud Workspaces', async () => {
    const screen = await render(<IntegrationsPage />)
    await expect.element(screen.getByRole('heading', { name: 'Desktop Runtime' })).toBeInTheDocument()
    await expect.element(screen.getByText('Optional', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByTestId('runtime-summary')).toHaveTextContent(
      'Desktop Runtime is an optional integration that lets Agentic AI control applications and the desktop on your local computer. It is not needed to use Cloud Workspaces.'
    )
  })

  it('tells the two kinds of work apart, and never says a Cloud Workspace needs the runner', async () => {
    const screen = await render(<IntegrationsPage />)
    const cloud = screen.getByTestId('compare-cloud')
    const desktop = screen.getByTestId('compare-desktop')
    for (const line of ['Open and manage workspaces', 'Edit code files', 'Run tests and builds through the Cloud Execution Worker', 'Needs no Local Agent Runner']) {
      await expect.element(cloud).toHaveTextContent(line)
    }
    for (const line of ['Reach your local desktop', 'Control applications and windows on your computer', 'Take screenshots or interact with the desktop', 'Needs the Local Agent Runner running on your computer']) {
      await expect.element(desktop).toHaveTextContent(line)
    }
    expect(cloud.element().textContent).not.toMatch(/needs the local agent runner/i)
  })

  it('does not call the runner until the user connects', async () => {
    const paths = stubRunner(healthy)
    const screen = await render(<IntegrationsPage />)
    await expect.element(screen.getByText('Not connected')).toBeInTheDocument()
    await expect.element(screen.getByText('Connect the Desktop Runtime above to use desktop control.')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Connect', exact: true })).toBeDisabled() // no token yet
    expect(paths).toHaveLength(0)
  })

  it('connects, shows the computer and the desktop controls, and loads the windows', async () => {
    stubRunner(healthy)
    const screen = await render(<IntegrationsPage />)
    await connect(screen)
    await expect.element(screen.getByText('Connected', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByTestId('runtime-status')).toHaveTextContent('DESKTOP-ALAM')
    await expect.element(screen.getByTestId('runtime-status')).toHaveTextContent('Available')
    await expect.element(screen.getByRole('heading', { name: 'Desktop control' })).toBeInTheDocument()
    await expect.element(screen.getByText('Notepad')).toBeInTheDocument()
    // The approval-gated interaction panel is still there.
    await expect.element(screen.getByRole('button', { name: 'Request approval' })).toBeInTheDocument()
  })

  it('keeps the desktop controls hidden when the runner has desktop control switched off', async () => {
    stubRunner({ ...healthy, '/api/desktop/status': { status: 503, body: { status: 'disconnected' } } })
    const screen = await render(<IntegrationsPage />)
    await connect(screen)
    await expect.element(screen.getByTestId('runtime-status')).toHaveTextContent('Switched off on the runner')
    await expect.element(screen.getByText('Desktop control is switched off on the runner, so there is nothing to show here.')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Request approval' })).not.toBeInTheDocument()
  })

  it('explains each way the connection can fail', async () => {
    const down = stubRunner({ '/health': 'network-error' })
    const screen = await render(<IntegrationsPage />)
    await connect(screen)
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Nothing answered at this URL')
    expect(down).toEqual(['GET /health'])
    await screen.unmount()

    useDesktopRuntime.setState(useDesktopRuntime.getInitialState(), true)
    stubRunner({ ...healthy, '/api/workspaces': { status: 401, body: {} } })
    const refused = await render(<IntegrationsPage />)
    await connect(refused)
    await expect.element(refused.getByRole('alert')).toHaveTextContent('refused the token')
  })

  it('disconnects without touching the runner, and forgets the token', async () => {
    const paths = stubRunner(healthy)
    const screen = await render(<IntegrationsPage />)
    await connect(screen)
    await expect.element(screen.getByText('Connected', { exact: true })).toBeInTheDocument()
    const calls = paths.length
    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    await expect.element(screen.getByText('Not connected')).toBeInTheDocument()
    expect(paths.length).toBe(calls)
    expect((screen.getByLabelText('Bearer token').element() as HTMLInputElement).value).toBe('')
    expect(useDesktopRuntime.getState().token).toBe('')
    await expect.element(screen.getByRole('heading', { name: 'Desktop control' })).not.toBeInTheDocument()
  })

  it('offers the runner\'s local project folders only once it is connected, and labels them advanced', async () => {
    stubRunner(healthy)
    const screen = await render(<IntegrationsPage />)
    await expect.element(screen.getByText('Local project folders (advanced)')).not.toBeInTheDocument()
    await connect(screen)
    await expect.element(screen.getByText('Local project folders (advanced)')).toBeInTheDocument()
    await expect.element(screen.getByText(/Cloud Workspaces do not use them/)).toBeInTheDocument()
    await expect.element(screen.getByLabelText('Local folder')).toHaveValue('conelo')
  })

  it('shows how to set it up and what to do when it does not connect, without a real secret', async () => {
    const screen = await render(<IntegrationsPage />)
    await expect.element(screen.getByText('Set up the Desktop Runtime')).toBeInTheDocument()
    await expect.element(screen.getByText(/go run \.\/cmd\/local-runner/)).toBeInTheDocument()
    await expect.element(screen.getByText(/LOCAL_RUNNER_DESKTOP_ENABLED/).first()).toBeInTheDocument()
    await expect.element(screen.getByText('If it does not connect')).toBeInTheDocument()
    await expect.element(screen.getByText(/LOCAL_RUNNER_ALLOWED_ORIGINS/).first()).toBeInTheDocument()
    expect(document.body.textContent).toContain('<a long random secret>')
  })

  it('is shown in Indonesian when that is the language', async () => {
    await i18n.changeLanguage('id')
    const screen = await render(<IntegrationsPage />)
    await expect.element(screen.getByTestId('runtime-summary')).toHaveTextContent('Desktop Runtime adalah integrasi opsional')
    await expect.element(screen.getByTestId('runtime-summary')).toHaveTextContent('tidak diperlukan untuk menggunakan Cloud Workspace')
    await expect.element(screen.getByTestId('compare-cloud')).toHaveTextContent('Tidak memerlukan Local Agent Runner')
    await expect.element(screen.getByRole('button', { name: 'Hubungkan' })).toBeInTheDocument()
    await i18n.changeLanguage('en')
  })

  it('has the same text keys in English and Indonesian', async () => {
    const en = (await import('@/i18n/locales/en.json')).default.desktopRuntime
    const id = (await import('@/i18n/locales/id.json')).default.desktopRuntime
    const keys = (value: unknown, prefix = ''): string[] =>
      Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        Array.isArray(child) ? [`${prefix}${key}[${child.length}]`] : typeof child === 'object' && child !== null ? keys(child, `${prefix}${key}.`) : [`${prefix}${key}`]
      )
    expect(keys(id).sort()).toEqual(keys(en).sort())
  })
})
