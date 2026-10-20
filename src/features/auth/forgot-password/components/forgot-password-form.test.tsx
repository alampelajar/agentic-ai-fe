import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { userEvent, type Locator } from 'vitest/browser'
import i18n from '@/i18n'
import { ForgotPasswordForm } from './forgot-password-form'

const navigateMock = vi.fn()
const fetchMock = vi.fn()

vi.mock('@tanstack/react-router', async (orig) => {
  const actual = await orig<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigateMock }
})

describe('ForgotPasswordForm', () => {
  let screen: RenderResult
  let emailInput: Locator
  let continueButton: Locator

  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, message: 'If the email exists, a code will be sent.' }),
    })
    screen = await render(<ForgotPasswordForm />)
    emailInput = screen.getByRole('textbox', { name: /^Email address$/i })
    continueButton = screen.getByRole('button', { name: /^Send verification code$/i })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the email field and send-code button', async () => {
    await expect.element(emailInput).toBeInTheDocument()
    await expect.element(continueButton).toBeInTheDocument()
  })

  it('shows validation when submitting an empty form', async () => {
    await userEvent.click(continueButton)
    await expect
      .element(screen.getByText(/^Enter your email address\.$/i))
      .toBeInTheDocument()
  })

  it('requests an OTP and navigates to the OTP screen with the email', async () => {
    await userEvent.fill(emailInput, 'a@b.com')
    await userEvent.click(continueButton)

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/auth/forgot-password/request',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'a@b.com' }),
        }),
      )
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/otp',
        search: { email: 'a@b.com' },
      })
    })
  })
})
