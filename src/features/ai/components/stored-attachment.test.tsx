import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import { MessageItem } from './message-item'

const mocks = vi.hoisted(() => ({ getTaskAttachment: vi.fn(), toastError: vi.fn() }))
vi.mock('@/features/tasks/data/api', () => ({ getTaskAttachment: mocks.getTaskAttachment }))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }))

const pixel = () => {
  const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: 'image/png' })
}

describe('stored attachments', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    await i18n.changeLanguage('en')
  })

  it('shows a photo kept with an earlier message, fetched with the login', async () => {
    mocks.getTaskAttachment.mockResolvedValue(pixel())
    const screen = await render(<MessageItem agentName='Coding Agent' message={{ id: 1, role: 'user', content: 'Apa ini?', images: [{ name: 'kucing.png', source: { taskId: 7, id: 3 } }] }} />)
    const image = screen.getByRole('img', { name: 'kucing.png' })
    await expect.element(image).toBeInTheDocument()
    expect(image.element().getAttribute('src')).toMatch(/^blob:/)
    expect(mocks.getTaskAttachment).toHaveBeenCalledWith(7, 3)
  })

  it('says when a stored photo is gone', async () => {
    mocks.getTaskAttachment.mockRejectedValue(new Error('HTTP 404'))
    const screen = await render(<MessageItem agentName='Coding Agent' message={{ id: 1, role: 'user', content: 'Apa ini?', images: [{ name: 'kucing.png', source: { taskId: 7, id: 3 } }] }} />)
    await expect.element(screen.getByText('kucing.png is no longer available')).toBeInTheDocument()
  })

  it('downloads a stored file only when asked, and reports a failure', async () => {
    mocks.getTaskAttachment.mockRejectedValueOnce(new Error('HTTP 500'))
    const screen = await render(<MessageItem agentName='Coding Agent' message={{ id: 1, role: 'user', content: 'Ringkas', files: [{ name: 'laporan.pdf', source: { taskId: 7, id: 4 } }] }} />)
    expect(mocks.getTaskAttachment).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Download laporan.pdf' }))
    await vi.waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('laporan.pdf could not be downloaded.'))
    expect(mocks.getTaskAttachment).toHaveBeenCalledWith(7, 4)
  })
})
