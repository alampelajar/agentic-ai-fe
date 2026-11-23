import { API_BASE_URL } from '@/lib/api-config'

/** What the server answers when the right password opens an account in deletion. */
export type PendingDeletion = {
  deletesAt: string
  appealToken: string
}

/** Reads the "account in deletion" answer of a sign-in, or null for any other answer. */
export function readPendingDeletion(
  status: number,
  body: { code?: string; deletes_at?: string; appeal_token?: string }
): PendingDeletion | null {
  if (
    status !== 403 ||
    body.code !== 'account_pending_deletion' ||
    !body.deletes_at ||
    !body.appeal_token
  ) {
    return null
  }
  return { deletesAt: body.deletes_at, appealToken: body.appeal_token }
}

/** Error codes of the message form, translated as authPage.pendingDeletion.errors.<code>. */
export const APPEAL_ERROR_CODES = [
  'appeal_expired',
  'appeal_length',
  'appeal_limit',
  'not_pending_deletion',
] as const
export type AppealErrorCode = (typeof APPEAL_ERROR_CODES)[number] | 'fallback'

export class AppealError extends Error {
  constructor(public code: AppealErrorCode) {
    super(code)
  }
}

/** Sends a message to the admins about an account in deletion. */
export async function sendDeletionAppeal(
  appealToken: string,
  message: string
): Promise<void> {
  let response: Response
  try {
    response = await fetch(API_BASE_URL + '/api/auth/deletion-appeal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ appeal_token: appealToken, message }),
    })
  } catch {
    throw new AppealError('fallback')
  }
  if (response.ok) return
  const body = (await response.json().catch(() => ({}))) as { code?: string }
  const known = APPEAL_ERROR_CODES.find((code) => code === body.code)
  throw new AppealError(known ?? 'fallback')
}
