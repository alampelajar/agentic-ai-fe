import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import { DeleteAccountCard } from './delete-account-card'

const api = vi.hoisted(() => ({
  deleteCurrentUserAccount: vi.fn(),
  requestAccountDeletionCode: vi.fn(),
  verifyCurrentUserPasswordForDeletion: vi.fn(),
}))
vi.mock('@/lib/api-auth', () => api)
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: { auth: { reset: () => void } }) => unknown) => select({ auth: { reset: vi.fn() } }),
}))

// These tests read the English text.
beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('DeleteAccountCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.requestAccountDeletionCode.mockResolvedValue(undefined)
    api.deleteCurrentUserAccount.mockResolvedValue(undefined)
  })

  it('offers an e-mailed code to accounts without a password (Google sign-in)', async () => {
    const screen = await render(<DeleteAccountCard />)
    await userEvent.click(screen.getByRole('button', { name: /delete account|hapus akun/i }))

    // The password dialog still asks for the password, with the code option beside it.
    await expect.element(screen.getByLabelText(/account password|kata sandi akun/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /e-mail me a code|kirim kode ke email/i }))

    expect(api.requestAccountDeletionCode).toHaveBeenCalledTimes(1)
    const codeInput = screen.getByLabelText(/verification code|kode verifikasi/i)
    await expect.element(codeInput).toBeInTheDocument()

    // Continue stays off until all six digits are in, and the code is not checked yet.
    const next = screen.getByRole('button', { name: /^(continue|lanjut)$/i })
    await userEvent.fill(codeInput, '12345')
    await expect.element(next).toBeDisabled()
    await userEvent.fill(codeInput, '123456')
    await expect.element(next).toBeEnabled()
    expect(api.verifyCurrentUserPasswordForDeletion).not.toHaveBeenCalled()
    expect(api.deleteCurrentUserAccount).not.toHaveBeenCalled()
  })

  it('shows the server message when the code could not be sent', async () => {
    api.requestAccountDeletionCode.mockRejectedValue(new Error('Layanan verifikasi email belum dikonfigurasi.'))
    const screen = await render(<DeleteAccountCard />)
    await userEvent.click(screen.getByRole('button', { name: /delete account|hapus akun/i }))
    await userEvent.click(screen.getByRole('button', { name: /e-mail me a code|kirim kode ke email/i }))

    await expect.element(screen.getByRole('alert')).toHaveTextContent('Layanan verifikasi email belum dikonfigurasi.')
    // Still on the password step.
    await expect.element(screen.getByLabelText(/account password|kata sandi akun/i)).toBeInTheDocument()
  })
})
