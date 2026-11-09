import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { SignUpForm } from './sign-up-form'
import { peekSignInPrefill, clearSignInPrefill } from '@/features/auth/sign-in/prefill'

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: toastMocks }))
const navigate = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const FORM_MESSAGES = {
  emailEmpty: 'Please enter your email.',
  passwordEmpty: 'Please enter your password.',
  confirmPasswordEmpty: 'Please confirm your password.',
  passwordMismatch: "Passwords don't match.",
} as const

describe('SignUpForm', () => {
  let screen: RenderResult
  let nameInput: Locator
  let emailInput: Locator
  let passwordInput: Locator
  let confirmPasswordInput: Locator
  let submitButton: Locator

  beforeEach(async () => {
    vi.clearAllMocks()
    clearSignInPrefill()
    screen = await render(<SignUpForm />)
    nameInput = screen.getByRole('textbox', { name: /^Name$/i })
    emailInput = screen.getByRole('textbox', { name: /^Email$/i })
    passwordInput = screen.getByLabelText(/^Password$/i)
    confirmPasswordInput = screen.getByLabelText(/^Confirm Password$/i)
    submitButton = screen.getByRole('button', { name: /^(Create Account|Creating account\.\.\.)$/i })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders fields and submit button', async () => {
    await expect.element(nameInput).toBeInTheDocument()
    await expect.element(emailInput).toBeInTheDocument()
    await expect.element(passwordInput).toBeInTheDocument()
    await expect.element(confirmPasswordInput).toBeInTheDocument()
    await expect.element(submitButton).toBeInTheDocument()
  })

  it('shows validation messages when submitting empty form', async () => {
    await userEvent.click(submitButton)

    await expect.element(screen.getByText(FORM_MESSAGES.emailEmpty)).toBeInTheDocument()
    await expect.element(screen.getByText(FORM_MESSAGES.passwordEmpty)).toBeInTheDocument()
    await expect.element(screen.getByText(FORM_MESSAGES.confirmPasswordEmpty)).toBeInTheDocument()
  })

  it('shows a mismatch error when passwords do not match', async () => {
    await userEvent.fill(nameInput, 'Alam')
    await userEvent.fill(emailInput, 'a@b.com')
    await userEvent.fill(passwordInput, '12345678')
    await userEvent.fill(confirmPasswordInput, '87654321')

    await userEvent.click(submitButton)
    await expect.element(screen.getByText(FORM_MESSAGES.passwordMismatch)).toBeInTheDocument()
  })

  it('disables submit while the registration request is pending', async () => {
    let resolveRequest: ((value: { ok: boolean; json: () => Promise<{ ok: boolean; message: string }> }) => void) | undefined
    const request = new Promise<{ ok: boolean; json: () => Promise<{ ok: boolean; message: string }> }>((resolve) => {
      resolveRequest = resolve
    })
    vi.stubGlobal('fetch', vi.fn(() => request))

    await userEvent.fill(nameInput, 'Alam')
    await userEvent.fill(emailInput, 'a@b.com')
    await userEvent.fill(passwordInput, '12345678')
    await userEvent.fill(confirmPasswordInput, '12345678')
    await userEvent.click(submitButton)

    await expect.element(submitButton).toBeDisabled()

    resolveRequest?.({
      ok: false,
      json: async () => ({ ok: false, message: 'Mock registration failure' }),
    })
    await expect.element(submitButton).toBeEnabled()
    expect(toastMocks.error).toHaveBeenCalledWith('Mock registration failure')
  })

  it('moves to the sign-in page, filled in, once the e-mailed code is accepted', async () => {
    const replies = [
      { ok: true, json: async () => ({ ok: true, message: 'sent' }) },
      { ok: true, json: async () => ({ ok: true, message: 'created' }) },
    ]
    const fetchMock = vi.fn(() => Promise.resolve(replies.shift()))
    vi.stubGlobal('fetch', fetchMock)

    await userEvent.fill(nameInput, 'Rina')
    await userEvent.fill(emailInput, 'rina@example.com')
    await userEvent.fill(passwordInput, 'RinaPass-123')
    await userEvent.fill(confirmPasswordInput, 'RinaPass-123')
    await userEvent.click(submitButton)

    // The account is not created yet: the code step opens first.
    const codeInput = screen.getByRole('textbox')
    await expect.element(codeInput).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()

    await userEvent.fill(codeInput, '123456')
    await userEvent.click(screen.getByRole('button', { name: /create account|emailOtp\.createAccount/i }))

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/sign-in', replace: true }))
    expect(peekSignInPrefill()).toEqual({ email: 'rina@example.com', password: 'RinaPass-123' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
