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

  it('shows the photos the person attached above their text', async () => {
    const url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const screen = await render(<MessageItem agentName='Coding Agent' message={{ id: 1, role: 'user', content: 'Apa isi foto ini?', images: [{ name: 'kucing.png', url }] }} />)
    await expect.element(screen.getByRole('img', { name: 'kucing.png' })).toHaveAttribute('src', url)
    await expect.element(screen.getByText('Apa isi foto ini?')).toBeInTheDocument()
  })

  it('lists attached documents by name', async () => {
    const screen = await render(<MessageItem agentName='Coding Agent' message={{ id: 1, role: 'user', content: 'Ringkas', files: [{ name: 'laporan.pdf' }, { name: 'catatan.md' }] }} />)
    const list = screen.getByRole('list', { name: 'Attached files' })
    await expect.element(list).toHaveTextContent('laporan.pdf')
    await expect.element(list).toHaveTextContent('catatan.md')
  })

  it('shows no photo area when nothing was attached', async () => {
    const screen = await render(<MessageItem agentName='Coding Agent' message={{ id: 1, role: 'user', content: 'Halo' }} />)
    await expect.element(screen.getByTestId('message-images')).not.toBeInTheDocument()
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
    // Directly under the article there is only the agent's name: no model line after the answer.
    expect(screen.getByRole('article').element().querySelectorAll(':scope > p').length).toBe(1)
  })

  it('formats the answer as Markdown but leaves the person own message as typed', async () => {
    const table = ['| File | Isi |', '|---|---|', '| a.go | **utama** |'].join('\n')
    const agent = await render(<MessageItem agentName='Coding Agent' message={{ id: 5, role: 'agent', content: table }} />)
    await expect.element(agent.getByRole('table')).toBeInTheDocument()
    expect(agent.getByRole('article').element().querySelector('strong')?.textContent).toBe('utama')
    await agent.unmount()

    const person = await render(<MessageItem agentName='Coding Agent' message={{ id: 6, role: 'user', content: 'tulis **tebal** dan | tabel |' }} />)
    expect(person.getByRole('article').element().querySelector('strong')).toBeNull()
    await expect.element(person.getByRole('article')).toHaveTextContent('tulis **tebal** dan | tabel |')
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
