import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SignOutDialog } from './sign-out-dialog'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  reset: vi.fn(),
  href: 'https://app.test/dashboard?tab=1',
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ auth: { reset: mocks.reset } }),
}))
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/react-router')>(),
  useNavigate: () => mocks.navigate,
  useLocation: () => ({ href: mocks.href }),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'auth.signOutDialog.title': 'Sign out',
        'auth.signOutDialog.description': 'Are you sure you want to sign out?',
        'auth.signOutDialog.confirmButton': 'Sign out',
      } as Record<string, string>)[key] ?? key,
  }),
}))

describe('SignOutDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resets auth and navigates to sign-in with the current location as redirect', async () => {
    const screen = await render(<SignOutDialog open onOpenChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(mocks.reset).toHaveBeenCalledOnce()
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/sign-in',
      search: { redirect: mocks.href },
      replace: true,
    })
  })

  it('does not reset auth or navigate when Cancel is clicked', async () => {
    const screen = await render(<SignOutDialog open onOpenChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mocks.reset).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
