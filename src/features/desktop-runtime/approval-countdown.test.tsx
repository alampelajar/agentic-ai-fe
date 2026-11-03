import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { ApprovalCountdown } from './approval-countdown'
import { isExpired, msUntilExpiry } from './approval-details'

describe('expiry helpers', () => {
  const now = Date.parse('2026-11-02T12:00:00Z')
  it('measure against the runner deadline', () => {
    expect(msUntilExpiry('2026-11-02T12:01:00Z', now)).toBe(60_000)
    expect(msUntilExpiry('2026-11-02T11:59:59Z', now)).toBe(-1_000)
    expect(isExpired('2026-11-02T12:00:00Z', now)).toBe(true) // the deadline itself is already too late
    expect(isExpired('2026-11-02T12:00:01Z', now)).toBe(false)
  })
  it('never call an unreadable deadline expired; the runner still enforces it', () => {
    expect(msUntilExpiry('not a date', now)).toBeNull()
    expect(isExpired('not a date', now)).toBe(false)
    expect(isExpired('', now)).toBe(false)
  })
})

describe('ApprovalCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(new Date('2026-11-02T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('calls onExpire exactly once, at the deadline and not before', async () => {
    const onExpire = vi.fn()
    await render(<ApprovalCountdown expiresAt='2026-11-02T12:01:00Z' onExpire={onExpire} />)

    await vi.advanceTimersByTimeAsync(59_999)
    expect(onExpire).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onExpire).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(300_000)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('shows the seconds left, counted from that deadline', async () => {
    const screen = await render(<ApprovalCountdown expiresAt='2026-11-02T12:01:00Z' onExpire={vi.fn()} />)
    await expect.element(screen.getByTestId('approval-countdown')).toHaveTextContent('(60 s left)')
    await vi.advanceTimersByTimeAsync(12_000)
    await expect.element(screen.getByTestId('approval-countdown')).toHaveTextContent('(48 s left)')
  })

  it('a re-render with a new callback neither resets nor repeats the countdown', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const screen = await render(<ApprovalCountdown expiresAt='2026-11-02T12:01:00Z' onExpire={first} />)
    await vi.advanceTimersByTimeAsync(30_000)
    await screen.rerender(<ApprovalCountdown expiresAt='2026-11-02T12:01:00Z' onExpire={second} />)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1) // still at 60 s from the start, with the latest callback
  })

  it('an already passed deadline expires at once', async () => {
    const onExpire = vi.fn()
    await render(<ApprovalCountdown expiresAt='2026-11-02T11:59:00Z' onExpire={onExpire} />)
    await vi.advanceTimersByTimeAsync(0)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('leaves no timer behind when it is closed early, and never calls onExpire afterwards', async () => {
    const onExpire = vi.fn()
    const screen = await render(<ApprovalCountdown expiresAt='2026-11-02T12:01:00Z' onExpire={onExpire} />)
    expect(vi.getTimerCount()).toBe(2) // the deadline and the on-screen seconds
    await screen.unmount()
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(300_000)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('also stops its timers once it has expired', async () => {
    await render(<ApprovalCountdown expiresAt='2026-11-02T12:00:05Z' onExpire={vi.fn()} />)
    await vi.advanceTimersByTimeAsync(5_000)
    // The parent closes the dialog on expiry; until then only the seconds interval may remain.
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1)
  })

  it('without a readable deadline it shows nothing and starts no timer', async () => {
    const onExpire = vi.fn()
    const screen = await render(<ApprovalCountdown expiresAt='soon' onExpire={onExpire} />)
    await expect.element(screen.getByTestId('approval-countdown')).not.toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(300_000)
    expect(onExpire).not.toHaveBeenCalled()
  })
})
