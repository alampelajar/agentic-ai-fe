import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
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
  useAuthStore: (selector: (state: { auth: { setUser: typeof mocks.setUser; setAccessToken: typeof mocks.setAccessToken } }) => unknown) =>
    selector({ auth: { setUser: mocks.setUser, setAccessToken: mocks.setAccessToken } }),
}))
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/react-router')>(),
  useNavigate: () => mocks.navigate,
}))
vi.mock('@react-oauth/google', () => ({ GoogleLogin: () => null }))
vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess, info: mocks.toastInfo },
}))

describe('UserAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mocks.fetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders email, password, submit, and reset-password controls', async () => {
    const screen = await render(<UserAuthForm />)

    await expect.element(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument()
    await expect.element(screen.getByLabelText('Password')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Forgot password?' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('shows validation toasts for missing credentials', async () => {
    const screen = await render(<UserAuthForm />)

    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(mocks.toastError).toHaveBeenCalledWith('Email wajib diisi.')

    await userEvent.fill(screen.getByRole('textbox', { name: 'Email' }), 'alam@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(mocks.toastError).toHaveBeenCalledWith('Password wajib diisi.')
  })

  it('saves the user and navigates to the default route after login', async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        message: 'ok',
        access_token: 'mock-access-token',
        user: { id: 42, name: 'Alam', email: 'alam@example.com', avatar: 'preset:lorelei' },
      }),
    })
    const screen = await render(<UserAuthForm />)

    await userEvent.fill(screen.getByRole('textbox', { name: 'Email' }), 'alam@example.com')
    await userEvent.fill(screen.getByLabelText('Password'), 'valid-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await vi.waitFor(() => expect(mocks.setUser).toHaveBeenCalledOnce())
    expect(mocks.setAccessToken).toHaveBeenCalledWith('mock-access-token')
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/overview', replace: true })
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

    await userEvent.fill(screen.getByRole('textbox', { name: 'Email' }), 'alam@example.com')
    await userEvent.fill(screen.getByLabelText('Password'), 'valid-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await vi.waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: '/settings', replace: true }))
  })
})
