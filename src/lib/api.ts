import { useAuthStore } from '@/stores/auth-store'

const API_URL = 'http://localhost:8080'

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken() {
  const response = await fetch(
    `${API_URL}/api/auth/refresh`,
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

  useAuthStore
    .getState()
    .auth.setAccessToken(result.access_token)

  return result.access_token
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

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken) {
    headers.set(
      'Authorization',
      `Bearer ${accessToken}`
    )
  }

  let response = await fetch(
    `${API_URL}${path}`,
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
        `${API_URL}${path}`,
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