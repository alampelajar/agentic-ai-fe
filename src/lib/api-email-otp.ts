import { apiFetch } from '@/lib/api'
import { API_BASE_URL } from '@/lib/api-config'

type OtpResponse = {
  ok?: boolean
  message?: string
  code?: string
  resend_after?: number
}

/** A refused e-mail code request; `code` is the server's reason, for a translated message. */
export class OtpRequestError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'OtpRequestError'
    this.code = code
  }
}

async function parse(
  response: Response,
  fallback: string
): Promise<OtpResponse> {
  const result: OtpResponse = await response.json().catch(() => ({}))
  if (!response.ok || result.ok !== true) {
    throw new OtpRequestError(result.message || fallback, result.code)
  }
  return result
}

async function publicPost(path: string, body: unknown, fallback: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  return parse(response, fallback)
}

async function authedPost(path: string, body: unknown, fallback: string) {
  const response = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return parse(response, fallback)
}

/** Sign-up: nothing is created until the code from the e-mail is verified. */
export const requestRegisterOtp = (input: {
  name: string
  email: string
  password: string
}) => publicPost('/api/auth/register/request', input, 'Registration failed.')

export const resendRegisterOtp = (email: string) =>
  publicPost(
    '/api/auth/register/resend',
    { email },
    'Could not resend the code.'
  )

export const verifyRegisterOtp = (email: string, otp: string) =>
  publicPost(
    '/api/auth/register/verify',
    { email, otp },
    'Verification failed.'
  )

/** Change e-mail: the code goes to the NEW address. */
export const requestChangeEmailOtp = (input: {
  new_email: string
  password: string
}) =>
  authedPost(
    '/api/me/email/change/request',
    input,
    'Could not start the email change.'
  )

export const resendChangeEmailOtp = (newEmail: string) =>
  authedPost(
    '/api/me/email/change/resend',
    { new_email: newEmail },
    'Could not resend the code.'
  )

export const verifyChangeEmailOtp = (newEmail: string, otp: string) =>
  authedPost(
    '/api/me/email/change/verify',
    { new_email: newEmail, otp },
    'Verification failed.'
  )
