import { useAuthStore } from '@/stores/auth-store'
import { apiFetch } from '@/lib/api'

interface UserResponse {
  id: number
  name: string
  email: string
  avatar?: string
}

interface MeResponse {
  ok: boolean
  message?: string
  user?: UserResponse
}

function updateAuthUser(
  user: UserResponse
) {
  const currentUser =
    useAuthStore.getState().auth.user

  useAuthStore.getState().auth.setUser({
    accountNo: `USER_${user.id}`,
    email: user.email,
    role:
      currentUser?.role ?? ['user'],
    exp:
      currentUser?.exp ??
      Date.now() +
        15 * 60 * 1000,
    name: user.name,
    avatar:
      user.avatar ||
      currentUser?.avatar ||
      '',
  })
}

export async function getCurrentUser() {
  const accessToken =
    useAuthStore
      .getState()
      .auth.accessToken

  if (!accessToken) {
    return null
  }

  const response =
    await apiFetch('/api/me')

  const result: MeResponse =
    await response.json()

  if (
    !response.ok ||
    !result.ok ||
    !result.user
  ) {
    throw new Error(
      result.message ||
        'Gagal mengambil data pengguna.'
    )
  }

  updateAuthUser(result.user)

  return result.user
}