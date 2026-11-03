import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import type { ToolApproval, Workspace } from './data/api'
import { WorkspaceApprovalDialog } from './workspace-approval-dialog'
import { WorkspaceSelector } from './workspace-selector'

const mocks = vi.hoisted(() => ({ getWorkspaces: vi.fn() }))
vi.mock('@tanstack/react-router', async (importActual) => ({
  ...(await importActual<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to }: { children?: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))
vi.mock('./data/api', async (importActual) => ({ ...(await importActual<typeof import('./data/api')>()), getWorkspaces: mocks.getWorkspaces }))

const approval = (expiresAt: string): ToolApproval => ({
  id: 'wsa-1',
  tool: 'workspace.write_file',
  workspace_id: 3,
  workspace_name: 'Library app',
  summary: 'Write src/main.go (120 characters)',
  arguments: { path: 'src/main.go', content_characters: 120, content_preview: 'package main\nfunc main() {}' },
  expires_at: expiresAt,
})

describe('Workspace approval dialog', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(new Date('2026-11-03T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  const open = async (expiresAt = '2026-11-03T12:01:00Z') => {
    const onDecision = vi.fn()
    const screen = await render(<WorkspaceApprovalDialog approval={approval(expiresAt)} agentName='Coding Agent' onDecision={onDecision} />)
    return { screen, onDecision }
  }

  it('shows who asks, where, what and for how long', async () => {
    const { screen } = await open()
    const dialog = screen.getByRole('dialog')
    await expect.element(dialog).toHaveTextContent('Coding Agent')
    await expect.element(dialog).toHaveTextContent('Library app')
    await expect.element(dialog).toHaveTextContent('Write src/main.go (120 characters)')
    await expect.element(dialog).toHaveTextContent('package main')
    await expect.element(dialog).toHaveTextContent('(60 s left)')
  })

  it('reports Allow once exactly once and locks the buttons', async () => {
    const { screen, onDecision } = await open()
    await userEvent.click(screen.getByRole('button', { name: 'Allow once' }))
    await expect.element(screen.getByRole('button', { name: 'Allow once' })).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Deny' })).toBeDisabled()
    expect(onDecision).toHaveBeenCalledExactlyOnceWith('allow')
  })

  it('reports Deny, and closing the dialog counts as a denial', async () => {
    const first = await open()
    await userEvent.click(first.screen.getByRole('button', { name: 'Deny' }))
    expect(first.onDecision).toHaveBeenCalledExactlyOnceWith('deny')
    await first.screen.unmount()

    const second = await open()
    await userEvent.keyboard('{Escape}')
    expect(second.onDecision).toHaveBeenCalledExactlyOnceWith('deny')
  })

  it('closes itself as expired when the countdown ends, and Allow is then useless', async () => {
    const { screen, onDecision } = await open()
    await vi.advanceTimersByTimeAsync(59_000)
    expect(onDecision).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(onDecision).toHaveBeenCalledExactlyOnceWith('expired')
    await expect.element(screen.getByRole('button', { name: 'Allow once' })).toBeDisabled()
  })

  it('Allow once after the deadline, before the timer ran, is an expiry and not an approval', async () => {
    const { screen, onDecision } = await open()
    vi.setSystemTime(new Date('2026-11-03T12:02:00Z'))
    await userEvent.click(screen.getByRole('button', { name: 'Allow once' }))
    expect(onDecision).toHaveBeenCalledExactlyOnceWith('expired')
    await vi.advanceTimersByTimeAsync(120_000)
    expect(onDecision).toHaveBeenCalledTimes(1)
  })

  it('stops its countdown when it is closed, and never reports afterwards', async () => {
    const { screen, onDecision } = await open()
    await screen.unmount()
    await vi.advanceTimersByTimeAsync(300_000)
    expect(onDecision).not.toHaveBeenCalled()
  })
})

describe('Workspace selector', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    await i18n.changeLanguage('en')
  })

  const ws = (id: number, name: string, status: Workspace['status'] = 'ready') => ({ id, name, status }) as Workspace

  it('lists only ready workspaces and reports the choice', async () => {
    mocks.getWorkspaces.mockResolvedValueOnce([ws(1, 'Ready one'), ws(2, 'Still creating', 'creating'), ws(3, 'Ready two')])
    const onChange = vi.fn()
    const screen = await render(<WorkspaceSelector value={null} onChange={onChange} />)
    await expect.element(screen.getByRole('option', { name: 'Ready two' })).toBeInTheDocument()
    await expect.element(screen.getByRole('option', { name: 'Still creating' })).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Cloud workspace'), '3')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 3 }))
    await userEvent.selectOptions(screen.getByLabelText('Cloud workspace'), '')
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('says that no Local Agent Runner is needed once a workspace is chosen', async () => {
    mocks.getWorkspaces.mockResolvedValueOnce([ws(1, 'Ready one')])
    const screen = await render(<WorkspaceSelector value={1} onChange={vi.fn()} />)
    await expect.element(screen.getByText(/Local Agent Runner is not needed/)).toBeInTheDocument()
  })

  it('points to creating a workspace when there is none', async () => {
    mocks.getWorkspaces.mockResolvedValueOnce([])
    const screen = await render(<WorkspaceSelector value={null} onChange={vi.fn()} />)
    await expect.element(screen.getByText('Choose or create a cloud workspace first.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create one' }).element().getAttribute('href')).toBe('/workspaces')
  })

  it('warns when the chosen workspace is no longer available', async () => {
    mocks.getWorkspaces.mockResolvedValueOnce([ws(1, 'Ready one')])
    const screen = await render(<WorkspaceSelector value={99} onChange={vi.fn()} />)
    await expect.element(screen.getByRole('alert')).toHaveTextContent('not available any more')
    expect((screen.getByLabelText('Cloud workspace').element() as HTMLSelectElement).value).toBe('')
  })

  it('can be disabled while the agent works, and survives a failed load', async () => {
    mocks.getWorkspaces.mockResolvedValueOnce([ws(1, 'Ready one')])
    const busy = await render(<WorkspaceSelector value={null} onChange={vi.fn()} disabled />)
    await expect.element(busy.getByLabelText('Cloud workspace')).toBeDisabled()
    await busy.unmount()

    mocks.getWorkspaces.mockRejectedValueOnce(new Error('offline'))
    const failed = await render(<WorkspaceSelector value={null} onChange={vi.fn()} />)
    await expect.element(failed.getByLabelText('Cloud workspace')).toBeDisabled()
    await expect.element(failed.getByText('Choose or create a cloud workspace first.')).not.toBeInTheDocument()
  })
})
