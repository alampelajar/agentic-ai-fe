// What the sign-up form hands to the sign-in page right after an account is created, so the
// person does not have to type the same details again.
//
// It lives only in memory (never in the URL, local storage or a cookie): a password in an address
// would end up in history and logs. It is cleared as soon as the sign-in page has used it, and it
// is lost on a page reload.

type SignInPrefill = { email: string; password: string }

let pending: SignInPrefill | null = null

export function setSignInPrefill(value: SignInPrefill) {
  pending = value
}

export function peekSignInPrefill(): SignInPrefill | null {
  return pending
}

export function clearSignInPrefill() {
  pending = null
}
