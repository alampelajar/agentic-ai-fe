import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { DesktopAction } from './api'
import { ChatApprovalDialog } from './chat-approval-dialog'

const action = (overrides: Partial<DesktopAction> = {}): DesktopAction => ({
  id: 'desktop-1',
  action: 'desktop.type',
  agent: 'Agent 19',
  reason: 'AI Agent requested this desktop action for the current user task.',
  window: '131406',
  arguments: { text: 'hello' },
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  ...overrides,
})

async function openDialog(approval = action()) {
  const onDecision = vi.fn()
  const onEmergencyStop = vi.fn()
  const screen = await render(
    <ChatApprovalDialog
      action={approval}
      agentName='Coding Agent'
      skill='Desktop Control'
      windows={[{ handle: 131406, title: 'agentic-ai-be' }]}
      onDecision={onDecision}
      onEmergencyStop={onEmergencyStop}
    />
  )
  return { screen, onDecision, onEmergencyStop }
}

describe('ChatApprovalDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(new Date('2026-11-02T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('shows the action, its details and the time left', async () => {
    const { screen } = await openDialog(action({ expires_at: '2026-11-02T12:01:00Z' }))
    const dialog = screen.getByRole('dialog', { name: 'Desktop action approval' })
    await expect.element(dialog).toHaveTextContent('Coding Agent')
    await expect.element(dialog).toHaveTextContent('desktop.type')
    await expect.element(dialog).toHaveTextContent('agentic-ai-be (handle 131406)')
    await expect.element(dialog).toHaveTextContent('hello')
    await expect.element(dialog).toHaveTextContent('(60 detik lagi)')
  })

  it('reports Allow Once once, and locks the buttons', async () => {
    const { screen, onDecision } = await openDialog(action({ expires_at: '2026-11-02T12:01:00Z' }))
    const allow = screen.getByRole('button', { name: 'Allow Once' })
    await userEvent.click(allow)
    await expect.element(allow).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Deny' })).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Emergency Stop' })).toBeDisabled()
    expect(onDecision).toHaveBeenCalledTimes(1)
    expect(onDecision).toHaveBeenCalledWith('once')
  })

  it('reports Deny', async () => {
    const { screen, onDecision } = await openDialog(action({ expires_at: '2026-11-02T12:01:00Z' }))
    await userEvent.click(screen.getByRole('button', { name: 'Deny' }))
    expect(onDecision).toHaveBeenCalledExactlyOnceWith('deny')
  })

  it('Emergency Stop stops the runner and reports once', async () => {
    const { screen, onDecision, onEmergencyStop } = await openDialog(action({ expires_at: '2026-11-02T12:01:00Z' }))
    await userEvent.click(screen.getByRole('button', { name: 'Emergency Stop' }))
    expect(onEmergencyStop).toHaveBeenCalledTimes(1)
    expect(onDecision).toHaveBeenCalledExactlyOnceWith('emergency')
  })

  it('reports an expiry at the deadline and locks the buttons', async () => {
    const { screen, onDecision, onEmergencyStop } = await openDialog(action({ expires_at: '2026-11-02T12:01:00Z' }))
    await vi.advanceTimersByTimeAsync(59_000)
    expect(onDecision).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(onDecision).toHaveBeenCalledExactlyOnceWith('expired')
    await expect.element(screen.getByRole('button', { name: 'Allow Once' })).toBeDisabled()
    expect(onEmergencyStop).not.toHaveBeenCalled()
  })

  it('Allow Once after the deadline is reported as an expiry, never as an approval', async () => {
    const { screen, onDecision } = await openDialog(action({ expires_at: '2026-11-02T12:01:00Z' }))
    vi.setSystemTime(new Date('2026-11-02T12:01:30Z')) // past the deadline, before the timer had its turn
    await userEvent.click(screen.getByRole('button', { name: 'Allow Once' }))
    expect(onDecision).toHaveBeenCalledExactlyOnceWith('expired')
    await vi.advanceTimersByTimeAsync(120_000)
    expect(onDecision).toHaveBeenCalledTimes(1) // the timer afterwards does not report again
  })

  it('whichever of the click and the countdown comes first is the only decision', async () => {
    const { screen, onDecision } = await openDialog(action({ expires_at: '2026-11-02T12:01:00Z' }))
    await vi.advanceTimersByTimeAsync(59_999)
    await userEvent.click(screen.getByRole('button', { name: 'Allow Once' }))
    await vi.advanceTimersByTimeAsync(5_000) // the countdown reaches zero right after
    expect(onDecision).toHaveBeenCalledExactlyOnceWith('once')
  })

  it('leaves no timer behind after a decision or when it is closed', async () => {
    const first = await openDialog(action({ expires_at: '2026-11-02T12:01:00Z' }))
    expect(vi.getTimerCount()).toBe(2)
    await userEvent.click(first.screen.getByRole('button', { name: 'Deny' }))
    await first.screen.unmount()
    expect(vi.getTimerCount()).toBe(0)

    const second = await openDialog(action({ expires_at: '2026-11-02T12:01:00Z' }))
    await second.screen.unmount()
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(120_000)
    expect(second.onDecision).not.toHaveBeenCalled()
  })
})
