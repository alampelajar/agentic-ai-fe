import { create } from 'zustand'
import { useAuthStore } from '@/stores/auth-store'

/**
 * A visitor who has not signed in may open every page and look around. Using a
 * feature (saving, sending, making a website) opens a pop-up that asks them to sign
 * in or create an account, instead of sending them away from the page.
 */

/** Where a visitor is sent instead, for a page that only exists for its owner. */
export function guestRedirect(pathname: string): string | null {
  // One of the person's own websites: a visitor has none.
  if (/^\/sites\/[^/]+\/?$/.test(pathname)) return '/sites'
  return null
}

/** The current page, to come back to after signing in. */
export function currentPage(): string {
  return `${window.location.pathname}${window.location.search}`
}

export function isSignedIn(): boolean {
  return Boolean(useAuthStore.getState().auth.user)
}

export function useSignedIn(): boolean {
  return useAuthStore((state) => Boolean(state.auth.user))
}

interface SignInPromptState {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useSignInPrompt = create<SignInPromptState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))

/** Opens the "sign in to continue" pop-up. */
export function askToSignIn() {
  useSignInPrompt.getState().setOpen(true)
}

/** Thrown by an API call a visitor tried to make; the pop-up is already open. */
export class SignInRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SignInRequiredError'
  }
}
