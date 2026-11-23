import i18n from '@/i18n'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { useSignInPrompt } from '@/lib/guest'
import { SignInPrompt } from './sign-in-prompt'

const auth = vi.hoisted(() => ({ user: null as null | { name: string } }))
vi.mock('@/stores/auth-store', () => {
  const state = () => ({ auth })
  const useAuthStore = (select: (s: ReturnType<typeof state>) => unknown) =>
    select(state())
  useAuthStore.getState = state
  return { useAuthStore }
})
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    onClick,
    className,
  }: {
    to: string
    children: React.ReactNode
    onClick?: () => void
    className?: string
  }) => (
    <a href={to} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}))

function Page({ onSend }: { onSend: () => void }) {
  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSend()
        }}
      >
        <button type='submit'>Save</button>
      </form>
      <SignInPrompt />
    </>
  )
}

describe('SignInPrompt', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('id')
  })
  beforeEach(() => {
    auth.user = null
    useSignInPrompt.getState().setOpen(false)
  })

  it('asks a visitor to sign in or sign up instead of sending a form', async () => {
    const onSend = vi.fn()
    const screen = await render(<Page onSend={onSend} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSend).not.toHaveBeenCalled()
    await expect
      .element(screen.getByRole('dialog'))
      .toHaveTextContent('Masuk untuk melanjutkan')
    await expect
      .element(screen.getByRole('link', { name: /^Masuk$/ }))
      .toHaveAttribute('href', '/sign-in')
    await expect.element(screen.getByText('Belum punya akun?')).toBeVisible()
    await expect
      .element(screen.getByRole('link', { name: 'Daftar di sini' }))
      .toHaveAttribute('href', '/sign-up')
  })

  it('speaks the language the person chose', async () => {
    await i18n.changeLanguage('en')
    const screen = await render(<Page onSend={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await expect
      .element(screen.getByRole('dialog'))
      .toHaveTextContent("Don't have an account yet?")
    await expect
      .element(screen.getByRole('link', { name: 'Sign up here' }))
      .toBeVisible()
    await i18n.changeLanguage('id')
  })

  it('lets someone who signed in send the form', async () => {
    auth.user = { name: 'Sasa' }
    const onSend = vi.fn()
    const screen = await render(<Page onSend={onSend} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(useSignInPrompt.getState().open).toBe(false)
  })
})
