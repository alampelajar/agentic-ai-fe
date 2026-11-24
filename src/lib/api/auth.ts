import { useAuthStore } from '@/stores/auth-store'
import { apiFetch } from '@/lib/api/client'

interface UserResponse {
  id: number
  name: string
  email: string
  avatar?: string
  // True once the account was restored after a deletion: deleting it again is
  // final at once, without the 30 days.
  deletion_is_final?: boolean
}

interface MeResponse {
  ok: boolean
  message?: string
  user?: UserResponse
}

function updateAuthUser(user: UserResponse) {
  const currentUser = useAuthStore.getState().auth.user

  useAuthStore.getState().auth.setUser({
    accountNo: `USER_${user.id}`,
    email: user.email,
    role: currentUser?.role ?? ['user'],
    exp: currentUser?.exp ?? Date.now() + 15 * 60 * 1000,
    name: user.name,
    avatar: user.avatar || currentUser?.avatar || '',
  })
}

export async function getCurrentUser() {
  const accessToken = useAuthStore.getState().auth.accessToken

  if (!accessToken) {
    return null
  }

  const response = await apiFetch('/api/me')

  const result: MeResponse = await response.json()

  if (!response.ok || !result.ok || !result.user) {
    throw new Error(result.message || 'Gagal mengambil data pengguna.')
  }

  updateAuthUser(result.user)

  return result.user
}

export interface UpdateProfileInput {
  name: string
  avatar: string
}

export async function updateCurrentUserProfile(
  input: UpdateProfileInput
): Promise<UserResponse> {
  const response = await apiFetch('/api/me', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  const result: MeResponse = await response.json().catch(() => ({}))

  if (!response.ok || !result.ok || !result.user) {
    throw new Error(result.message || 'Gagal menyimpan perubahan profil.')
  }

  updateAuthUser(result.user)
  return result.user
}
export async function verifyCurrentUserPasswordForDeletion(
  password: string
): Promise<void> {
  const response = await apiFetch('/api/me/verify-delete-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  const result: { ok?: boolean; message?: string } = await response
    .json()
    .catch(() => ({}))

  if (!response.ok || !result.ok) {
    throw new Error(result.message || 'Gagal memverifikasi kata sandi.')
  }
}

/** Accounts that signed in with Google have no known password: they confirm with a code e-mailed to them. */
export async function requestAccountDeletionCode(): Promise<void> {
  const response = await apiFetch('/api/me/delete/request', {
    method: 'POST',
    body: JSON.stringify({}),
  })
  const result: { ok?: boolean; message?: string } = await response
    .json()
    .catch(() => ({}))

  if (!response.ok || !result.ok) {
    throw new Error(result.message || 'Gagal mengirim kode verifikasi.')
  }
}

export type AccountDeletionProof =
  { password: string; otp?: undefined } | { otp: string; password?: undefined }

/**
 * Deletes the signed-in account. Returns whether it was removed for good at once
 * (an account restored before), or only marked to be removed in 30 days.
 */
export async function deleteCurrentUserAccount(
  proof: AccountDeletionProof
): Promise<{ final: boolean }> {
  const response = await apiFetch('/api/me', {
    method: 'DELETE',
    body: JSON.stringify(proof),
  })
  const result: { ok?: boolean; message?: string; final?: boolean } =
    await response.json().catch(() => ({}))

  if (!response.ok || !result.ok) {
    throw new Error(result.message || 'Gagal menghapus akun.')
  }
  return { final: result.final === true }
}

export interface ChangePasswordInput {
  current_password: string
  new_password: string
  confirm_password: string
}

export async function changeCurrentUserPassword(
  input: ChangePasswordInput
): Promise<void> {
  const response = await apiFetch('/api/me/password', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  const result: { ok?: boolean; message?: string } = await response
    .json()
    .catch(() => ({}))

  if (!response.ok || !result.ok) {
    throw new Error(result.message || 'Gagal mengubah password.')
  }
}
