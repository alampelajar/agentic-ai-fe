import i18n from '@/i18n'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { peekSignInPrefill, setSignInPrefill } from '../lib/prefill'
import { UserAuthForm } from './user-auth-form'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  setUser: vi.fn(),
  setAccessToken: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
  fetch: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: {
      auth: {
        setUser: typeof mocks.setUser
        setAccessToken: typeof mocks.setAccessToken
      }
    }) => unknown
  ) =>
    selector({
      auth: { setUser: mocks.setUser, setAccessToken: mocks.setAccessToken },
    }),
}))
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => mocks.navigate,
  Link: ({
    to,
    children,
    className,
  }: {
    to: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))
vi.mock('@react-oauth/google', () => ({ GoogleLogin: () => null }))
vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
    info: mocks.toastInfo,
  },
}))

describe('UserAuthForm', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mocks.fetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens already filled in with the details from sign-up, then forgets them', async () => {
    setSignInPrefill({ email: 'rina@example.com', password: 'RinaPass-123' })
    const screen = await render(<UserAuthForm />)

    await expect
      .element(screen.getByRole('textbox', { name: 'Email address' }))
      .toHaveValue('rina@example.com')
    await expect
      .element(screen.getByLabelText('Password'))
      .toHaveValue('RinaPass-123')
    // Used once: nothing is kept for a later visit.
    expect(peekSignInPrefill()).toBeNull()
  })

  it('renders email, password, submit, and reset-password controls', async () => {
    const screen = await render(<UserAuthForm />)

    await expect
      .element(screen.getByRole('textbox', { name: 'Email address' }))
      .toBeInTheDocument()
    await expect.element(screen.getByLabelText('Password')).toBeInTheDocument()
    await expect
      .element(screen.getByRole('link', { name: 'Forgot password?' }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: 'Sign in' }))
      .toBeInTheDocument()
  })

  it('shows and hides the password with the eye button', async () => {
    const screen = await render(<UserAuthForm />)
    const input = screen.getByLabelText('Password')

    await expect.element(input).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    await expect.element(input).toHaveAttribute('type', 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    await expect.element(input).toHaveAttribute('type', 'password')
  })

  it('shows validation toasts for missing credentials', async () => {
    const screen = await render(<UserAuthForm />)

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(mocks.toastError).toHaveBeenCalledWith('Enter your email address.')

    await userEvent.fill(
      screen.getByRole('textbox', { name: 'Email address' }),
      'alam@example.com'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(mocks.toastError).toHaveBeenCalledWith('Enter your password.')
  })

  it('saves the user and navigates to the default route after login', async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        message: 'ok',
        access_token: 'mock-access-token',
        user: {
          id: 42,
          name: 'Alam',
          email: 'alam@example.com',
          avatar: 'preset:lorelei',
        },
      }),
    })
    const screen = await render(<UserAuthForm />)

    await userEvent.fill(
      screen.getByRole('textbox', { name: 'Email address' }),
      'alam@example.com'
    )
    await userEvent.fill(screen.getByLabelText('Password'), 'valid-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await vi.waitFor(() => expect(mocks.setUser).toHaveBeenCalledOnce())
    expect(mocks.setAccessToken).toHaveBeenCalledWith('mock-access-token')
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/overview',
      replace: true,
    })
  })

  it('uses redirectTo when provided', async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        message: 'ok',
        access_token: 'mock-access-token',
        user: { id: 42, name: 'Alam', email: 'alam@example.com' },
      }),
    })
    const screen = await render(<UserAuthForm redirectTo='/settings' />)

    await userEvent.fill(
      screen.getByRole('textbox', { name: 'Email address' }),
      'alam@example.com'
    )
    await userEvent.fill(screen.getByLabelText('Password'), 'valid-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await vi.waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/settings',
        replace: true,
      })
    )
  })

  it('says the account is suspended, with the reason, and signs nobody in', async () => {
    mocks.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        ok: false,
        code: 'account_suspended',
        message: 'Akun Anda ditangguhkan oleh admin.',
        reason: 'Trying to make a gambling website.',
      }),
    })
    const screen = await render(<UserAuthForm />)
    await userEvent.fill(
      screen.getByRole('textbox', { name: 'Email address' }),
      'alam@example.com'
    )
    await userEvent.fill(screen.getByLabelText('Password'), 'valid-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    const notice = screen.getByRole('alert')
    await expect.element(notice).toHaveTextContent('Your account is suspended')
    await expect
      .element(notice)
      .toHaveTextContent('Reason: Trying to make a gambling website.')
    expect(mocks.setUser).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('says why after the person was signed out for a suspension', async () => {
    window.sessionStorage.setItem('account.suspended', 'Spam.')
    const screen = await render(<UserAuthForm />)
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Reason: Spam.')
    // Shown once: a later visit starts clean.
    expect(window.sessionStorage.getItem('account.suspended')).toBeNull()
  })
})
