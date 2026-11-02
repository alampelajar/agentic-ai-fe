import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { DesktopInteractionPanel } from './interaction-panel'

const mocks = vi.hoisted(() => ({ toastError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))

type Call = { path: string; method: string; body: Record<string, unknown> | null }

// Stands in for the Local Agent Runner. Like the real one it stores a request and
// returns that copy, which is what the dialog renders.
function stubRunner(options: { approve?: { ok: boolean; status: number; body: unknown } } = {}) {
  const calls: Call[] = []
  const fetchStub = vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname.replace('/api/desktop', '')
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : null
    calls.push({ path, method, body })
    const reply = (payload: unknown, ok = true, status = 200) => ({ ok, status, json: async () => payload })
    if (path === '/actions/request') {
      return reply({ ok: true, approval_required: true, action: { ...body, id: `desktop-${calls.length}`, expires_at: new Date(Date.now() + 60_000).toISOString() } }, true, 202)
    }
    if (path === '/windows') {
      return reply({ ok: true, data: { windows: [{ handle: 131406, title: 'agentic-ai-be', class_name: 'CabinetWClass' }, { handle: 900, title: 'Password Manager' }] } })
    }
    if (path.endsWith('/approve')) {
      const configured = options.approve
      return configured ? reply(configured.body, configured.ok, configured.status) : reply({ ok: true, result: { ok: true } })
    }
    return reply({ ok: true, status: 'denied' })
  })
  vi.stubGlobal('fetch', fetchStub)
  return calls
}

const requestOf = (calls: Call[]) => calls.find((call) => call.path === '/actions/request')!.body!
const paths = (calls: Call[]) => calls.map((call) => call.path.replace(/desktop-\d+/, ':id'))

async function openPanel() {
  const screen = await render(<DesktopInteractionPanel baseUrl='http://127.0.0.1:8765' token='test-token' disabled={false} />)
  return screen
}

async function request(screen: Awaited<ReturnType<typeof openPanel>>) {
  await userEvent.click(screen.getByRole('button', { name: 'Request approval' }))
  const dialog = screen.getByRole('dialog', { name: 'Desktop action approval' })
  await expect.element(dialog).toBeInTheDocument()
  return dialog
}

describe('DesktopInteractionPanel approval dialog', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('focus window: shows the application and its handle', async () => {
    const calls = stubRunner()
    const screen = await openPanel()
    await userEvent.fill(screen.getByLabelText('Target window'), '131406')
    const dialog = await request(screen)

    await expect.element(dialog).toHaveTextContent('desktop.focus_window')
    await expect.element(dialog).toHaveTextContent('agentic-ai-be (handle 131406)')
    expect(requestOf(calls)).toMatchObject({ action: 'desktop.focus_window', window: '131406' })
    expect(paths(calls)).toEqual(['/actions/request', '/windows'])
  })

  it('click: shows the control that will be clicked', async () => {
    const calls = stubRunner()
    const screen = await openPanel()
    await userEvent.selectOptions(screen.getByLabelText('Action'), 'desktop.click')
    await userEvent.fill(screen.getByLabelText('Target window'), 'agentic-ai-be')
    await userEvent.selectOptions(screen.getByLabelText('Control to click'), 'name')
    await userEvent.fill(screen.getByLabelText('Control value'), 'Save')
    const dialog = await request(screen)

    await expect.element(dialog).toHaveTextContent('agentic-ai-be (handle 131406)')
    await expect.element(dialog).toHaveTextContent('Name: "Save"')
    expect(requestOf(calls)).toMatchObject({ action: 'desktop.click', window: 'agentic-ai-be', target: { type: 'name', value: 'Save' } })
  })

  it('double click needs a control before it can be requested', async () => {
    stubRunner()
    const screen = await openPanel()
    await userEvent.selectOptions(screen.getByLabelText('Action'), 'desktop.double_click')
    await expect.element(screen.getByRole('button', { name: 'Request approval' })).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText('Control to click'), 'control_type')
    await userEvent.fill(screen.getByLabelText('Control value'), 'Edit')
    await expect.element(screen.getByRole('button', { name: 'Request approval' })).toBeEnabled()
  })

  it('scroll: shows the control, direction and amount', async () => {
    const calls = stubRunner()
    const screen = await openPanel()
    await userEvent.selectOptions(screen.getByLabelText('Action'), 'desktop.scroll')
    await userEvent.fill(screen.getByLabelText('Target window'), '131406')
    await userEvent.selectOptions(screen.getByLabelText('Control to scroll (optional)'), 'control_type')
    await userEvent.fill(screen.getByLabelText('Control value'), 'Edit')
    await userEvent.selectOptions(screen.getByLabelText('Direction'), 'up')
    await userEvent.fill(screen.getByLabelText('Lines (1 to 20)'), '5')
    const dialog = await request(screen)

    await expect.element(dialog).toHaveTextContent('Control type: "Edit"')
    await expect.element(dialog).toHaveTextContent('up')
    await expect.element(dialog).toHaveTextContent('5 lines')
    expect(requestOf(calls)).toMatchObject({ action: 'desktop.scroll', target: { type: 'control_type', value: 'Edit' }, arguments: { direction: 'up', amount: 5 } })
  })

  it('type: shows the exact text', async () => {
    const calls = stubRunner()
    const screen = await openPanel()
    await userEvent.selectOptions(screen.getByLabelText('Action'), 'desktop.type')
    await userEvent.fill(screen.getByLabelText('Target window'), '131406')
    await userEvent.fill(screen.getByLabelText('Text'), 'hello from the panel')
    const dialog = await request(screen)

    await expect.element(dialog).toHaveTextContent('hello from the panel')
    await expect.element(dialog).toHaveTextContent('20 characters')
    expect(requestOf(calls).arguments).toEqual({ text: 'hello from the panel' })
  })

  it('type: masks what looks like a credential until the user asks to see it', async () => {
    stubRunner()
    const screen = await openPanel()
    await userEvent.selectOptions(screen.getByLabelText('Action'), 'desktop.type')
    await userEvent.fill(screen.getByLabelText('Target window'), '131406')
    await userEvent.fill(screen.getByLabelText('Text'), 'use password=hunter2 here')
    const dialog = await request(screen)

    await expect.element(dialog).toHaveTextContent('use password=•••••• here')
    await expect.element(dialog).not.toHaveTextContent('hunter2')
    await userEvent.click(dialog.getByRole('button', { name: 'Show full text' }))
    await expect.element(dialog).toHaveTextContent('use password=hunter2 here')
    await userEvent.click(dialog.getByRole('button', { name: 'Hide' }))
    await expect.element(dialog).not.toHaveTextContent('hunter2')
  })

  it('hotkey: sends the combination as keys and shows it', async () => {
    const calls = stubRunner()
    const screen = await openPanel()
    await userEvent.selectOptions(screen.getByLabelText('Action'), 'desktop.hotkey')
    await userEvent.fill(screen.getByLabelText('Target window'), '131406')
    await userEvent.fill(screen.getByLabelText('Allowlisted hotkey'), 'ctrl+a')
    const dialog = await request(screen)

    await expect.element(dialog).toHaveTextContent('CTRL+A')
    expect(requestOf(calls).arguments).toEqual({ keys: 'ctrl+a' })
  })

  it('warns when the window looks like it holds credentials', async () => {
    stubRunner()
    const screen = await openPanel()
    await userEvent.selectOptions(screen.getByLabelText('Action'), 'desktop.type')
    await userEvent.fill(screen.getByLabelText('Target window'), '900')
    await userEvent.fill(screen.getByLabelText('Text'), 'x')
    const dialog = await request(screen)
    await expect.element(dialog).toHaveTextContent('Password Manager (handle 900)')
    await expect.element(dialog).toHaveTextContent('looks like it holds credentials')
  })

  it('shows the details before anything is approved, and Deny never approves', async () => {
    const calls = stubRunner()
    const screen = await openPanel()
    await userEvent.fill(screen.getByLabelText('Target window'), '131406')
    const dialog = await request(screen)

    // Details are on screen and nothing has been approved yet.
    await expect.element(dialog).toHaveTextContent('agentic-ai-be (handle 131406)')
    expect(paths(calls).some((path) => path.endsWith('/approve'))).toBe(false)

    await userEvent.click(dialog.getByRole('button', { name: 'Deny', exact: true }))
    await vi.waitFor(() => expect(paths(calls)).toContain('/actions/:id/deny'))
    expect(paths(calls).some((path) => path.endsWith('/approve'))).toBe(false)
    await expect.element(screen.getByRole('dialog', { name: 'Desktop action approval' })).not.toBeInTheDocument()
  })

  it('Allow once approves exactly the stored action with mode once', async () => {
    const calls = stubRunner()
    const screen = await openPanel()
    await userEvent.fill(screen.getByLabelText('Target window'), '131406')
    const dialog = await request(screen)
    await userEvent.click(dialog.getByRole('button', { name: 'Allow once' }))

    await vi.waitFor(() => expect(paths(calls)).toContain('/actions/:id/approve'))
    const approve = calls.find((call) => call.path.endsWith('/approve'))!
    expect(approve.body).toEqual({ mode: 'once' })
    // The request was the first call, so the stub gave the stored action the id desktop-1.
    expect(approve.path).toBe('/actions/desktop-1/approve')
    expect(calls.filter((call) => call.path.endsWith('/approve'))).toHaveLength(1)
  })

  it('an expired approval is refused by the runner and the error is shown', async () => {
    const calls = stubRunner({ approve: { ok: false, status: 410, body: { ok: false, error: 'approval expired' } } })
    const screen = await openPanel()
    await userEvent.fill(screen.getByLabelText('Target window'), '131406')
    const dialog = await request(screen)
    await userEvent.click(dialog.getByRole('button', { name: 'Allow once' }))

    await vi.waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('approval expired'))
    expect(calls.filter((call) => call.path.endsWith('/approve'))).toHaveLength(1)
  })

  it('Emergency stop clears the pending request and calls the runner', async () => {
    const calls = stubRunner()
    const screen = await openPanel()
    await userEvent.fill(screen.getByLabelText('Target window'), '131406')
    await request(screen)
    await userEvent.click(screen.getByRole('button', { name: 'Emergency stop' }))

    await vi.waitFor(() => expect(paths(calls)).toContain('/emergency-stop'))
    await expect.element(screen.getByRole('dialog', { name: 'Desktop action approval' })).not.toBeInTheDocument()
    expect(paths(calls).some((path) => path.endsWith('/approve'))).toBe(false)
  })
})
