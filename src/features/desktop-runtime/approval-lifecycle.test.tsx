import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { DesktopInteractionPanel } from './interaction-panel'
import { stubRunner } from './runner-stub'

const mocks = vi.hoisted(() => ({ toastError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))

const EXPIRED = 'Approval expired. Request a new one to continue.'
const DIALOG = { name: 'Desktop action approval' }
const expiredToasts = () => mocks.toastError.mock.calls.filter(([message]) => message === EXPIRED).length

async function openPanel() {
  return render(<DesktopInteractionPanel baseUrl='http://127.0.0.1:8765' token='test-token' disabled={false} />)
}
type Screen = Awaited<ReturnType<typeof openPanel>>

async function request(screen: Screen) {
  await userEvent.fill(screen.getByLabelText('Target window'), '131406')
  await userEvent.click(screen.getByRole('button', { name: 'Request approval' }))
  const dialog = screen.getByRole('dialog', DIALOG)
  await expect.element(dialog).toBeInTheDocument()
  return dialog
}
const closed = (screen: Screen) => expect.element(screen.getByRole('dialog', DIALOG)).not.toBeInTheDocument()

describe('approval lifecycle on the Desktop Runtime panel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // The countdown must be driven by the runner's expiry time, so the clock is under the test's control.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('expiration', () => {
    it('closes the dialog by itself after 60 seconds and tells the user to ask again', async () => {
      const runner = stubRunner()
      const screen = await openPanel()
      const dialog = await request(screen)

      await vi.advanceTimersByTimeAsync(59_000)
      await expect.element(dialog).toBeInTheDocument()
      expect(expiredToasts()).toBe(0)

      await vi.advanceTimersByTimeAsync(1_000)
      await closed(screen)
      expect(expiredToasts()).toBe(1)
      await expect.element(screen.getByText('Approval expired: desktop.focus_window')).toBeInTheDocument()
      // Nothing was approved, denied or retried on the user's behalf.
      expect(runner.count('/approve')).toBe(0)
      expect(runner.count('/deny')).toBe(0)
    })

    it('the Allow once button is gone after expiry, so it cannot be used', async () => {
      stubRunner()
      const screen = await openPanel()
      const dialog = await request(screen)
      await expect.element(dialog.getByRole('button', { name: 'Allow once' })).toBeEnabled()

      await vi.advanceTimersByTimeAsync(60_000)
      await closed(screen)
      await expect.element(screen.getByRole('button', { name: 'Allow once' })).not.toBeInTheDocument()
    })

    it('uses the expiry time the runner gave, and a re-render does not extend it', async () => {
      stubRunner({ expiresInMs: 10_000 })
      const screen = await openPanel()
      const dialog = await request(screen)

      await vi.advanceTimersByTimeAsync(5_000)
      await userEvent.fill(screen.getByLabelText('Reason'), 'a different reason, which re-renders the panel')
      await expect.element(dialog).toBeInTheDocument()

      await vi.advanceTimersByTimeAsync(5_000)
      await closed(screen)
      expect(expiredToasts()).toBe(1)
    })

    it('counts down from that deadline', async () => {
      stubRunner()
      const screen = await openPanel()
      const dialog = await request(screen)
      await expect.element(dialog).toHaveTextContent('(60 s left)')
      await vi.advanceTimersByTimeAsync(5_000)
      await expect.element(dialog).toHaveTextContent('(55 s left)')
    })

    it('Allow once pressed after the deadline, before the timer ran, is an expiry and sends nothing', async () => {
      const runner = stubRunner()
      const screen = await openPanel()
      const dialog = await request(screen)

      // The deadline has passed by the clock, but the timer has not had a turn yet.
      vi.setSystemTime(Date.now() + 61_000)
      await userEvent.click(dialog.getByRole('button', { name: 'Allow once' }))

      await closed(screen)
      expect(runner.count('/approve')).toBe(0)
      expect(expiredToasts()).toBe(1)
      // And the timer that fires afterwards does not announce it a second time.
      await vi.advanceTimersByTimeAsync(120_000)
      expect(expiredToasts()).toBe(1)
    })

    it('a new dialog works after the previous one expired, with its own 60 seconds', async () => {
      const runner = stubRunner()
      const screen = await openPanel()
      await request(screen)
      await vi.advanceTimersByTimeAsync(60_000)
      await closed(screen)

      await userEvent.click(screen.getByRole('button', { name: 'Request approval' }))
      const second = screen.getByRole('dialog', DIALOG)
      await expect.element(second).toBeInTheDocument()
      await vi.advanceTimersByTimeAsync(59_000)
      await expect.element(second).toBeInTheDocument() // the old timer did not close it

      await userEvent.click(second.getByRole('button', { name: 'Allow once' }))
      await vi.waitFor(() => expect(runner.count('/approve')).toBe(1))
      const request2 = runner.calls.filter((call) => call.path === '/actions/request')[1]
      expect(request2).toBeDefined()
      expect(runner.calls.find((call) => call.path.endsWith('/approve'))!.path).toMatch(/^\/actions\/desktop-\d+\/approve$/)
      await closed(screen)
      expect(expiredToasts()).toBe(1) // only the first one expired
    })
  })

  describe('HTTP 410 from the runner', () => {
    it('clears the dialog, shows the expired message and does not retry', async () => {
      const runner = stubRunner({ approve: { ok: false, status: 410, body: { ok: false, error: 'approval expired' } } })
      const screen = await openPanel()
      const dialog = await request(screen)
      await userEvent.click(dialog.getByRole('button', { name: 'Allow once' }))

      await closed(screen)
      expect(expiredToasts()).toBe(1)
      expect(runner.count('/approve')).toBe(1)
      await vi.advanceTimersByTimeAsync(180_000)
      expect(runner.count('/approve')).toBe(1) // never resent
      expect(runner.count('/deny')).toBe(0)
      expect(expiredToasts()).toBe(1)
    })

    it('also clears the dialog for other answers from the runner, since the approval is gone', async () => {
      stubRunner({ approve: { ok: false, status: 409, body: { ok: false, error: 'another agent owns the desktop session' } } })
      const screen = await openPanel()
      const dialog = await request(screen)
      await userEvent.click(dialog.getByRole('button', { name: 'Allow once' }))

      await closed(screen)
      expect(mocks.toastError).toHaveBeenCalledWith('another agent owns the desktop session')
      expect(expiredToasts()).toBe(0)
    })

    it('keeps the dialog when the runner could not be reached, because the approval may still be valid', async () => {
      const runner = stubRunner({ approve: 'network-error' })
      const screen = await openPanel()
      const dialog = await request(screen)
      await userEvent.click(dialog.getByRole('button', { name: 'Allow once' }))

      await vi.waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Failed to fetch'))
      await expect.element(screen.getByRole('dialog', DIALOG)).toBeInTheDocument()
      await expect.element(dialog.getByRole('button', { name: 'Allow once' })).toBeEnabled()
      expect(runner.count('/approve')).toBe(1)
    })
  })

  describe('races', () => {
    it('Allow once pressed twice sends one approval', async () => {
      const runner = stubRunner({ approve: 'hold' })
      const screen = await openPanel()
      const dialog = await request(screen)
      const allow = dialog.getByRole('button', { name: 'Allow once' })
      await userEvent.click(allow)
      // While the approval is on its way, both buttons are locked, so a second click cannot send another.
      await expect.element(allow).toBeDisabled()
      await expect.element(dialog.getByRole('button', { name: 'Deny', exact: true })).toBeDisabled()
      expect(runner.count('/approve')).toBe(1)
      runner.release({ ok: true, status: 200, body: { ok: true, result: { ok: true } } })
      await closed(screen)
    })

    it('the countdown reaching zero while an approval is on its way does not close it: the runner decides', async () => {
      const runner = stubRunner({ approve: 'hold' })
      const screen = await openPanel()
      const dialog = await request(screen)
      await userEvent.click(dialog.getByRole('button', { name: 'Allow once' }))

      await vi.advanceTimersByTimeAsync(61_000)
      await expect.element(dialog).toBeInTheDocument()
      expect(expiredToasts()).toBe(0)

      // It had been sent in time, so the runner approves it.
      runner.release({ ok: true, status: 200, body: { ok: true, result: { ok: true } } })
      await closed(screen)
      await expect.element(screen.getByText('Approved desktop.focus_window (once)')).toBeInTheDocument()
      expect(expiredToasts()).toBe(0)
    })

    it('a 410 that arrives after Emergency Stop closed the dialog adds nothing and does not touch a newer dialog', async () => {
      const runner = stubRunner({ approve: 'hold' })
      const screen = await openPanel()
      const dialog = await request(screen)
      await userEvent.click(dialog.getByRole('button', { name: 'Allow once' }))
      await userEvent.click(screen.getByRole('button', { name: 'Emergency stop' }))
      await closed(screen)

      // A new request is made while the old approval is still unanswered.
      await userEvent.click(screen.getByRole('button', { name: 'Request approval' }))
      const second = screen.getByRole('dialog', DIALOG)
      await expect.element(second).toBeInTheDocument()

      runner.release({ ok: false, status: 410, body: { ok: false, error: 'approval expired' } })
      await vi.advanceTimersByTimeAsync(1_000)
      await expect.element(second).toBeInTheDocument() // the late answer did not close the new dialog
      expect(expiredToasts()).toBe(0)
    })

    it('a late success for a dialog that is already closed is still recorded, so the user knows', async () => {
      const runner = stubRunner({ approve: 'hold' })
      const screen = await openPanel()
      const dialog = await request(screen)
      await userEvent.click(dialog.getByRole('button', { name: 'Allow once' }))
      await userEvent.click(screen.getByRole('button', { name: 'Emergency stop' }))
      await closed(screen)

      runner.release({ ok: true, status: 200, body: { ok: true, result: { ok: true } } })
      await expect.element(screen.getByText('Approved desktop.focus_window (once)')).toBeInTheDocument()
    })
  })

  describe('Deny', () => {
    it('closes the dialog at once and never approves', async () => {
      const runner = stubRunner({ deny: 'hold' })
      const screen = await openPanel()
      const dialog = await request(screen)
      await userEvent.click(dialog.getByRole('button', { name: 'Deny', exact: true }))

      await closed(screen) // before the runner has even answered the deny
      expect(runner.count('/deny')).toBe(1)
      expect(runner.count('/approve')).toBe(0)
      runner.release({ ok: true, status: 200, body: { ok: true, status: 'denied' } })
      await vi.advanceTimersByTimeAsync(120_000)
      expect(runner.count('/approve')).toBe(0)
      expect(expiredToasts()).toBe(0) // its countdown died with the dialog
    })

    it('still closes when the runner no longer knows the approval, without an error', async () => {
      stubRunner({ deny: { ok: false, status: 404, body: { ok: false, error: 'action not found or already resolved' } } })
      const screen = await openPanel()
      const dialog = await request(screen)
      await userEvent.click(dialog.getByRole('button', { name: 'Deny', exact: true }))
      await closed(screen)
      await vi.advanceTimersByTimeAsync(1_000)
      expect(mocks.toastError).not.toHaveBeenCalled()
    })
  })

  describe('Emergency Stop', () => {
    it('closes the pending dialog, stops its countdown and approves nothing', async () => {
      const runner = stubRunner()
      const screen = await openPanel()
      await request(screen)
      await userEvent.click(screen.getByRole('button', { name: 'Emergency stop' }))

      await closed(screen)
      await vi.waitFor(() => expect(runner.count('/emergency-stop')).toBe(1))
      await vi.advanceTimersByTimeAsync(120_000)
      expect(runner.count('/approve')).toBe(0)
      expect(expiredToasts()).toBe(0)
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Emergency stop activated.')
    })

    it('closes the dialog even when the stop request fails, so nothing can be approved afterwards', async () => {
      stubRunner({ emergency: { ok: false, status: 500, body: { ok: false, error: 'runner busy' } } })
      const screen = await openPanel()
      await request(screen)
      await userEvent.click(screen.getByRole('button', { name: 'Emergency stop' }))
      await closed(screen)
      await vi.waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('runner busy'))
    })
  })

  describe('cleanup', () => {
    it('leaves no timer behind once the dialog is closed, however it was closed', async () => {
      stubRunner()
      const screen = await openPanel()
      expect(vi.getTimerCount()).toBe(0)

      await request(screen)
      expect(vi.getTimerCount()).toBeGreaterThan(0)
      await vi.advanceTimersByTimeAsync(60_000)
      await closed(screen)
      expect(vi.getTimerCount()).toBe(0) // expired

      await userEvent.click(screen.getByRole('button', { name: 'Request approval' }))
      const denyDialog = screen.getByRole('dialog', DIALOG)
      await expect.element(denyDialog).toBeInTheDocument()
      await userEvent.click(denyDialog.getByRole('button', { name: 'Deny', exact: true }))
      await closed(screen)
      expect(vi.getTimerCount()).toBe(0) // denied

      await userEvent.click(screen.getByRole('button', { name: 'Request approval' }))
      await expect.element(screen.getByRole('dialog', DIALOG)).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Emergency stop' }))
      await closed(screen)
      expect(vi.getTimerCount()).toBe(0) // stopped
    })

    it('leaves no timer or late call behind when the panel is closed with an approval open', async () => {
      const runner = stubRunner()
      const screen = await openPanel()
      await request(screen)
      expect(vi.getTimerCount()).toBeGreaterThan(0)

      await screen.unmount()
      expect(vi.getTimerCount()).toBe(0)
      await vi.advanceTimersByTimeAsync(120_000)
      expect(expiredToasts()).toBe(0)
      expect(runner.count('/approve')).toBe(0)
    })
  })

  describe('activity list', () => {
    it('lists repeated identical events as separate rows without duplicate-key errors', async () => {
      stubRunner()
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const screen = await openPanel()
      for (let round = 0; round < 2; round++) {
        const dialog = await request(screen)
        await userEvent.click(dialog.getByRole('button', { name: 'Deny', exact: true }))
        await closed(screen)
      }
      expect(screen.getByText('Denied desktop.focus_window').elements()).toHaveLength(2)
      expect(consoleError.mock.calls.filter(([message]) => String(message).includes('same key'))).toHaveLength(0)
      consoleError.mockRestore()
    })
  })
})
