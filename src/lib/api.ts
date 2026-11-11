import { useAuthStore } from '@/stores/auth-store'
import { API_BASE_URL } from '@/lib/api-config'

let refreshPromise: Promise<string> | null = null

/** How long a freshly issued access token is valid (the backend issues 15-minute tokens). */
export const ACCESS_TOKEN_LIFETIME_MS = 15 * 60 * 1000

async function refreshAccessToken() {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/refresh`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      credentials: 'include',
    }
  )

  const result = await response.json()

  if (
    !response.ok ||
    !result.ok ||
    !result.access_token
  ) {
    throw new Error(
      result.message || 'Refresh token tidak valid.'
    )
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
  const accessToken =
    useAuthStore.getState().auth.accessToken

  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken) {
    headers.set(
      'Authorization',
      `Bearer ${accessToken}`
    )
  }

  let response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers,
      credentials: 'include',
    }
  )

  // Access token expired
  if (response.status === 401) {
    try {
      const newAccessToken =
        await getNewAccessToken()

      headers.set(
        'Authorization',
        `Bearer ${newAccessToken}`
      )

      // Ulangi request setelah mendapatkan token baru
      response = await fetch(
        `${API_BASE_URL}${path}`,
        {
          ...options,
          headers,
          credentials: 'include',
        }
      )
    } catch (error) {
      // Refresh token juga sudah tidak valid
      useAuthStore
        .getState()
        .auth.reset()

      throw error
    }
  }

  return response
}
