import i18n from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'
import { API_BASE_URL } from '@/lib/api/config'
import { readSuspended, rememberSuspension } from '@/lib/account-suspended'
import { askToSignIn, SignInRequiredError } from '@/lib/guest'

let refreshPromise: Promise<string> | null = null

/** How long a freshly issued access token is valid (the backend issues 15-minute tokens). */
const ACCESS_TOKEN_LIFETIME_MS = 15 * 60 * 1000

async function refreshAccessToken() {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  })

  const result = await response.json()

  const suspendedReason = readSuspended(response.status, result)
  if (suspendedReason !== null) {
    rememberSuspension(suspendedReason)
    useAuthStore.getState().auth.reset()
    window.location.assign('/sign-in')
  }

  if (!response.ok || !result.ok || !result.access_token) {
    throw new Error(result.message || 'Refresh token tidak valid.')
  }

  const { auth } = useAuthStore.getState()
  auth.setAccessToken(result.access_token)
  // A fresh access token lasts 15 minutes; note that, so the session is not seen as expired.
  if (auth.user) {
    auth.setUser({ ...auth.user, exp: Date.now() + ACCESS_TOKEN_LIFETIME_MS })
  }

  return result.access_token
}

/** Renews the access token with the refresh-token cookie. Concurrent callers share one request. */
export function refreshAccessTokenOnce() {
  return getNewAccessToken()
}

async function getNewAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = useAuthStore.getState().auth.accessToken
  const guest = !useAuthStore.getState().auth.user

  // A visitor may look around, but anything that changes data needs an account:
  // ask them to sign in instead of sending a request that can only fail.
  const method = (options.method ?? 'GET').toUpperCase()
  if (guest && method !== 'GET' && !path.startsWith('/api/auth/')) {
    askToSignIn()
    throw new SignInRequiredError(i18n.t('signInPrompt.needed'))
  }

  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  // Access token expired
  // Nothing to renew for a visitor: their request simply has no answer.
  if (response.status === 401 && !guest) {
    try {
      const newAccessToken = await getNewAccessToken()

      headers.set('Authorization', `Bearer ${newAccessToken}`)

      // Ulangi request setelah mendapatkan token baru
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      })
    } catch (error) {
      // The refresh token is no longer valid. A server that could not be reached
      // (restarting, offline) is not a reason to sign the person out.
      if (!(error instanceof TypeError)) useAuthStore.getState().auth.reset()

      throw error
    }
  }

  // An admin suspended the account: sign out at once and let the sign-in page say why.
  if (response.status === 403 && !guest) {
    const body = await response
      .clone()
      .json()
      .catch(() => null)
    const reason = readSuspended(response.status, body)
    if (reason !== null) {
      rememberSuspension(reason)
      useAuthStore.getState().auth.reset()
      window.location.assign('/sign-in')
    }
  }

  return response
}
