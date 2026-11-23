import { describe, expect, it } from 'vitest'
import { askToSignIn, guestRedirect, useSignInPrompt } from './guest'

describe('guestRedirect', () => {
  it('lets visitors open every page to look around', () => {
    for (const path of [
      '/',
      '/sites',
      '/overview',
      '/settings/account',
      '/settings/appearance',
      '/feedback',
      '/profile',
    ]) {
      expect(guestRedirect(path)).toBeNull()
    }
  })

  it('sends a visitor from one owner-only website page to the start screen', () => {
    expect(guestRedirect('/sites/4')).toBe('/sites')
    expect(guestRedirect('/sites/4/')).toBe('/sites')
  })
})

describe('askToSignIn', () => {
  it('opens the sign-in pop-up', () => {
    useSignInPrompt.getState().setOpen(false)
    askToSignIn()
    expect(useSignInPrompt.getState().open).toBe(true)
  })
})
