import { apiFetch } from '@/lib/api'

export const FEEDBACK_CATEGORIES = ['feature', 'bug', 'service', 'aiExperience', 'help'] as const
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]
export type FeedbackStatus = 'new' | 'processing' | 'completed' | 'rejected'

/** The reasons the server accepts with a rating (handlers/feedback.go). */
export const RATING_REASONS = [
  'admin_ramah',
  'pengerjaan_cepat',
  'solusi_tepat',
  'komunikasi_jelas',
  'responsif',
  'masalah_terselesaikan',
] as const
export type RatingReason = (typeof RATING_REASONS)[number]

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
export const ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export type FeedbackReply = { id: number; message: string; created_at: string }

export type Feedback = {
  id: number
  category: FeedbackCategory
  subject: string
  description: string
  related_page: string
  attachment: string
  status: FeedbackStatus
  rating: number
  rating_reasons: string[] | null
  rating_comment: string
  replies?: FeedbackReply[]
  created_at: string
  updated_at: string
}

export type FeedbackDraft = {
  category: FeedbackCategory
  subject: string
  description: string
  related_page: string
  attachment: File | null
}

export type RatingDraft = { rating: number; rating_reasons: string[]; rating_comment: string }

/** Only finished tickets can be deleted; the server enforces the same rule. */
export const isFinished = (status: FeedbackStatus) => status === 'completed' || status === 'rejected'

/** Whether the report has an uploaded image (older reports may hold only a file name). */
export const hasStoredAttachment = (path: string) => path.startsWith('/uploads/feedback/')

/** The report's image. It is only sent to the signed-in owner, so it is fetched with the login. */
export async function getFeedbackAttachment(id: number): Promise<Blob> {
  const response = await apiFetch(`/api/feedback/${id}/attachment`)
  if (!response.ok) throw new Error(`Attachment request failed with status ${response.status}`)
  return response.blob()
}

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) throw new Error(data?.message || data?.error || 'Permintaan feedback gagal.')
  return data as T
}

export async function getMyFeedback(): Promise<Feedback[]> {
  const data = await parse<{ feedback: Feedback[] }>(await apiFetch('/api/feedback'))
  return Array.isArray(data.feedback) ? data.feedback : []
}

export async function createFeedback(draft: FeedbackDraft): Promise<Feedback> {
  const body = new FormData()
  body.set('category', draft.category)
  body.set('subject', draft.subject)
  body.set('description', draft.description)
  body.set('related_page', draft.related_page)
  if (draft.attachment) body.set('attachment', draft.attachment)
  const data = await parse<{ feedback: Feedback }>(await apiFetch('/api/feedback', { method: 'POST', body }))
  return data.feedback
}

export async function rateFeedback(id: number, draft: RatingDraft): Promise<void> {
  await parse(await apiFetch(`/api/feedback/${id}/rating`, { method: 'PATCH', body: JSON.stringify(draft) }))
}

export async function deleteFeedback(id: number): Promise<void> {
  await parse(await apiFetch(`/api/feedback/${id}`, { method: 'DELETE' }))
}
