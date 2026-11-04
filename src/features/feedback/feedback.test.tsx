import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import type { Feedback } from './data/api'
import { FeedbackPage } from './index'

const mocks = vi.hoisted(() => ({
  getMyFeedback: vi.fn(),
  createFeedback: vi.fn(),
  rateFeedback: vi.fn(),
  deleteFeedback: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock('./data/api', async (importActual) => ({
  ...(await importActual<typeof import('./data/api')>()),
  getMyFeedback: mocks.getMyFeedback,
  createFeedback: mocks.createFeedback,
  rateFeedback: mocks.rateFeedback,
  deleteFeedback: mocks.deleteFeedback,
}))

const report = (overrides: Partial<Feedback> = {}): Feedback => ({
  id: 12,
  category: 'bug',
  subject: 'Chat freezes',
  description: 'The chat stops answering after a while.',
  related_page: 'AI Chat',
  attachment: '',
  status: 'new',
  rating: 0,
  rating_reasons: [],
  rating_comment: '',
  replies: [],
  created_at: '2026-11-01T10:00:00Z',
  updated_at: '2026-11-01T10:00:00Z',
  ...overrides,
})

describe('Feedback page', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    await i18n.changeLanguage('en')
  })

  it('sends the report and its screenshot to the server', async () => {
    mocks.getMyFeedback.mockResolvedValue([])
    mocks.createFeedback.mockImplementation(async (draft) => report({ subject: draft.subject }))
    const screen = await render(<FeedbackPage />)

    await screen.getByLabelText('Category').selectOptions('bug')
    await screen.getByLabelText('Related page or feature').fill('AI Chat')
    await screen.getByLabelText('Subject').fill('Chat freezes')
    await screen.getByLabelText('Description').fill('The chat stops answering after a while.')
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'shot.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('Screenshot (optional)', { exact: true }).first(), file)
    await expect.element(screen.getByText('shot.png')).toBeVisible()
    await screen.getByRole('button', { name: 'Submit report' }).click()

    await vi.waitFor(() => expect(mocks.createFeedback).toHaveBeenCalledTimes(1))
    const draft = mocks.createFeedback.mock.calls[0][0]
    expect(draft).toMatchObject({ category: 'bug', related_page: 'AI Chat', subject: 'Chat freezes' })
    expect(draft.attachment).toBeInstanceOf(File)
    expect(draft.attachment.name).toBe('shot.png')
    await expect.element(screen.getByRole('heading', { name: 'Chat freezes' })).toBeVisible()
  })

  it('rejects a screenshot that is not an image', async () => {
    mocks.getMyFeedback.mockResolvedValue([])
    const screen = await render(<FeedbackPage />)
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    await userEvent.upload(screen.getByLabelText('Screenshot (optional)', { exact: true }).first(), file)
    await expect.element(screen.getByText('The screenshot must be a PNG, JPG, or WebP image.')).toBeVisible()
  })

  it('offers delete only for finished reports, and deletes after confirming', async () => {
    mocks.getMyFeedback.mockResolvedValue([
      report({ id: 1, subject: 'Open one', status: 'processing' }),
      report({ id: 2, subject: 'Done one', status: 'completed' }),
    ])
    mocks.deleteFeedback.mockResolvedValue(undefined)
    const screen = await render(<FeedbackPage />)
    await screen.getByRole('button', { name: /My reports/ }).click()
    await expect.element(screen.getByRole('heading', { name: 'Done one' })).toBeVisible()

    const deleteButtons = screen.getByRole('button', { name: 'Delete report' })
    expect(deleteButtons.elements()).toHaveLength(1)
    await deleteButtons.click()
    await screen.getByRole('button', { name: 'Delete', exact: true }).click()

    await vi.waitFor(() => expect(mocks.deleteFeedback).toHaveBeenCalledWith(2))
    await expect.element(screen.getByRole('heading', { name: 'Done one' })).not.toBeInTheDocument()
    await expect.element(screen.getByRole('heading', { name: 'Open one' })).toBeVisible()
  })
})
