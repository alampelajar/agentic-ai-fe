// An admin may suspend an account (for example after it tried to make a forbidden
// website). The server then answers every request, a refresh and a sign-in with 403
// and code "account_suspended", with the reason the admin wrote. The reason is kept
// for this tab, so the sign-in page can say why after the person is signed out.

const KEY = 'account.suspended'

type SuspendedAnswer = { code?: string; reason?: string }

/** The reason of an "account suspended" answer, or null for any other answer. */
export function readSuspended(
  status: number,
  body: SuspendedAnswer | null | undefined
): string | null {
  if (status !== 403 || body?.code !== 'account_suspended') return null
  return typeof body.reason === 'string' ? body.reason : ''
}

/** Remembers the reason for the sign-in page of this tab. */
export function rememberSuspension(reason: string) {
  try {
    window.sessionStorage.setItem(KEY, reason)
  } catch {
    // Without storage the sign-in page shows it when the person signs in again.
  }
}

/** The remembered reason, once: reading it forgets it. */
export function takeSuspension(): string | null {
  try {
    const reason = window.sessionStorage.getItem(KEY)
    window.sessionStorage.removeItem(KEY)
    return reason
  } catch {
    return null
  }
}
