import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import { OtpForm } from './otp-form'

const navigate = vi.fn()
const fetchMock = vi.fn()

vi.mock('@tanstack/react-router', async (orig) => {
  const actual = await orig<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

describe('OtpForm', () => {
  let screen: RenderResult
  let otpInput: Locator
  let verifyButton: Locator

  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/forgot-password/verify')) {
        return {
          ok: true,
          json: async () => ({ ok: true, reset_token: 'a'.repeat(64) }),
        }
      }
      return { ok: true, json: async () => ({ ok: true, message: 'Password reset.' }) }
    })
    screen = await render(<OtpForm initialEmail='a@b.com' />)
    otpInput = screen.getByLabelText(/^6-digit verification code$/i)
    verifyButton = screen.getByRole('button', { name: /^Verify code$/i })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('disables Verify until all six digits are entered', async () => {
    await expect.element(verifyButton).toBeDisabled()
    await userEvent.fill(otpInput, '12345')
    await expect.element(verifyButton).toBeDisabled()
    await userEvent.fill(otpInput, '123456')
    await expect.element(verifyButton).toBeEnabled()
  })

  it('verifies the OTP and reveals the new-password form', async () => {
    await userEvent.fill(otpInput, '123456')
    await userEvent.click(verifyButton)

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8081/api/auth/forgot-password/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'a@b.com', otp: '123456' }),
        }),
      )
    })
    await expect.element(screen.getByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument()
  })

  it('resets the password and navigates back to sign in', async () => {
    await userEvent.fill(otpInput, '123456')
    await userEvent.click(verifyButton)

    const passwordInput = screen.getByLabelText('New password', { exact: true })
    const confirmInput = screen.getByLabelText('Confirm new password')
    await userEvent.fill(passwordInput, 'new-secure-pass')
    await userEvent.fill(confirmInput, 'new-secure-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Save new password' }))

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8081/api/auth/forgot-password/reset',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'a@b.com',
            reset_token: 'a'.repeat(64),
            new_password: 'new-secure-pass',
            confirm_password: 'new-secure-pass',
          }),
        }),
      )
      expect(navigate).toHaveBeenCalledWith({ to: '/sign-in', replace: true })
    })
  })
})
