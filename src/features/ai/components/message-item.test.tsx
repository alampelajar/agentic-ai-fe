import { beforeEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import i18n from '@/i18n'
import { formatFileSize } from './format-file-size'
import { MessageItem } from './message-item'

describe('MessageItem', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('puts the person on the right in a surface and keeps their line breaks', async () => {
    const screen = await render(<MessageItem agentName='Coding Agent' message={{ id: 1, role: 'user', content: 'Buat style.css\nringkas' }} />)
    const article = screen.getByRole('article')
    expect(article.element().getAttribute('data-role')).toBe('user')
    await expect.element(article).toHaveTextContent('Buat style.css')
    // No agent name, no model line on a person's own message.
    await expect.element(screen.getByText('Coding Agent')).not.toBeInTheDocument()
  })

  it('shows the agent by name with its answer as plain text and the model as one small line', async () => {
    const screen = await render(
      <MessageItem
        agentName='Coding Agent'
        message={{ id: 2, role: 'agent', content: 'style.css sudah dibuat.', model: 'cohere/north-mini-code:free', provider: 'OpenRouter', modelId: 15 }}
      />
    )
    const article = screen.getByRole('article')
    expect(article.element().getAttribute('data-role')).toBe('agent')
    await expect.element(article).toHaveTextContent('Coding Agent')
    await expect.element(article).toHaveTextContent('style.css sudah dibuat.')
    await expect.element(article).toHaveTextContent('cohere/north-mini-code:free · OpenRouter')
    // The numeric id and the "Model:" label are noise for the reader.
    await expect.element(article).not.toHaveTextContent('ID 15')
    await expect.element(article).not.toHaveTextContent('Model:')
  })

  it('leaves out the model line when the message has none, such as an error', async () => {
    const screen = await render(<MessageItem agentName='Coding Agent' message={{ id: 3, role: 'agent', content: 'Maaf, terjadi kesalahan.' }} />)
    expect(screen.getByRole('article').element().querySelectorAll('p').length).toBe(1) // only the agent's name
  })

  it('offers a generated file as a download with its size', async () => {
    const screen = await render(
      <MessageItem agentName='Coding Agent' message={{ id: 4, role: 'agent', content: 'Selesai.', file: { id: 1, name: 'site.zip', size: 2048, blobUrl: 'blob:x' } }} />
    )
    const link = screen.getByRole('link', { name: /Download/ })
    expect(link.element().getAttribute('download')).toBe('site.zip')
    await expect.element(screen.getByText('2.0 KB')).toBeInTheDocument()
  })
})

describe('formatFileSize', () => {
  it('uses the largest unit that keeps the number small', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
