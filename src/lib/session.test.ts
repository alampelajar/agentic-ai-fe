import { clearCookies } from '@/test-utils/cookies'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const user = { accountNo: 'USER_1', email: 'rina@example.com', role: ['user'], exp: 0 }

async function setup() {
  const { useAuthStore } = await import('@/stores/auth-store')
  const { ensureSession } = await import('./session')
  return { useAuthStore, ensureSession }
}

describe('ensureSession', () => {
  beforeEach(() => {
    clearCookies()
    vi.resetModules()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lets a fresh session through without asking the server', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { useAuthStore, ensureSession } = await setup()
    useAuthStore.getState().auth.setAccessToken('fresh')
    useAuthStore.getState().auth.setUser({ ...user, exp: Date.now() + 60_000 })

    expect(await ensureSession()).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('renews a stale session with the refresh token instead of signing out', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, access_token: 'renewed' }) })
    vi.stubGlobal('fetch', fetchMock)
    const { useAuthStore, ensureSession } = await setup()
    useAuthStore.getState().auth.setAccessToken('stale')
    useAuthStore.getState().auth.setUser({ ...user, exp: Date.now() - 1_000 })

    expect(await ensureSession()).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/auth/refresh')
    const { auth } = useAuthStore.getState()
    expect(auth.accessToken).toBe('renewed')
    // The renewed token's lifetime is noted, so the next page does not renew again at once.
    expect(auth.user?.exp ?? 0).toBeGreaterThan(Date.now() + 10 * 60 * 1000)
  })

  it('gets a new access token after a reload, when only the signed-in user was kept', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, access_token: 'after-reload' }) })
    vi.stubGlobal('fetch', fetchMock)
    const { useAuthStore, ensureSession } = await setup()
    // The access token is kept in memory only, so a reload leaves the user but no token.
    useAuthStore.getState().auth.resetAccessToken()
    useAuthStore.getState().auth.setUser({ ...user, exp: Date.now() + 60_000 })

    expect(await ensureSession()).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().auth.accessToken).toBe('after-reload')
  })

  it('signs out only when renewing fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ ok: false, message: 'expired' }) }))
    const { useAuthStore, ensureSession } = await setup()
    useAuthStore.getState().auth.setAccessToken('stale')
    useAuthStore.getState().auth.setUser({ ...user, exp: Date.now() - 1_000 })

    expect(await ensureSession()).toBe(false)
    expect(useAuthStore.getState().auth.user).toBeNull()
    expect(useAuthStore.getState().auth.accessToken).toBe('')
  })

  it('does not try to renew when nobody signed in', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { ensureSession } = await setup()

    expect(await ensureSession()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
