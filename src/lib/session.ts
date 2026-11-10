import { refreshAccessTokenOnce } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Whether the person is still signed in, renewing the session when needed.
 *
 * The stored user's `exp` is only when the access token was last known to be fresh (15 minutes
 * after it was issued). The refresh token in the httpOnly cookie lasts 7 days, so an old `exp`
 * is a reason to renew, not to sign the person out. Only when renewing fails is the session over.
 */
export async function ensureSession(): Promise<boolean> {
  const { auth } = useAuthStore.getState()
  if (!auth.user) return false
  if (auth.accessToken && auth.user.exp > Date.now()) return true
  try {
    await refreshAccessTokenOnce()
    return true
  } catch {
    useAuthStore.getState().auth.reset()
    return false
  }
}
