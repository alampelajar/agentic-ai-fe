import { useAuthStore } from '@/stores/auth-store'
import { getCurrentUser } from '@/lib/api/auth'
import { refreshAccessTokenOnce } from '@/lib/api/client'
import { API_BASE_URL } from '@/lib/api/config'

/**
 * Whether the person is still signed in, renewing the session when needed.
 *
 * The stored user's `exp` is only when the access token was last known to be fresh (15 minutes
 * after it was issued). The refresh token in the httpOnly cookie lasts 7 days, so an old `exp`
 * is a reason to renew, not to sign the person out. Only when the server refuses the renewal
 * is the session over: a server that cannot be reached (restarting, offline) keeps it.
 */
export async function ensureSession(): Promise<boolean> {
  const { auth } = useAuthStore.getState()
  if (!auth.user) return restoreSession()
  if (auth.accessToken && auth.user.exp > Date.now()) return true
  try {
    await refreshAccessTokenOnce()
    return true
  } catch (error) {
    if (!unreachable(error)) useAuthStore.getState().auth.reset()
    return false
  }
}

/** A fetch that never reached the server fails with a TypeError. */
export function unreachable(error: unknown): boolean {
  return error instanceof TypeError
}

// Asked once per page load, so a visitor without an account is not asked again on every page.
let restoreAttempt: Promise<boolean> | null = null

/**
 * The browser forgot who signed in (the user cookie was cleared) while the refresh-token
 * cookie is still valid: sign the person back in instead of showing them as a visitor.
 */
function restoreSession(): Promise<boolean> {
  if (!restoreAttempt) {
    restoreAttempt = (async () => {
      try {
        await refreshAccessTokenOnce()
        return Boolean(await getCurrentUser())
      } catch {
        useAuthStore.getState().auth.resetAccessToken()
        return false
      }
    })()
  }
  return restoreAttempt
}

/** Lets the next check ask the server again (tests). */
export function forgetRestoreAttempt() {
  restoreAttempt = null
}

/**
 * Signs the person out on the server too: the refresh token is revoked and its cookie
 * removed, so nobody can renew the session from this browser afterwards, and the
 * person is not signed back in as they look around as a visitor.
 */
export async function signOut() {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
  } catch {
    // Offline: the browser still forgets the person below.
  }
  useAuthStore.getState().auth.reset()
  // Not even an old cookie may sign them back in during this visit.
  restoreAttempt = Promise.resolve(false)
}
