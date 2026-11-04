import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { Markdown } from './markdown'

const root = (screen: Awaited<ReturnType<typeof render>>) => screen.getByTestId('markdown').element()

describe('Markdown', () => {
  it('shows formatting instead of symbols: bold, lists and inline code', async () => {
    const screen = await render(<Markdown>{'Ini **penting**.\n\n- satu\n- dua\n\n1. pertama\n2. kedua\n\nPakai `npm test` dulu.'}</Markdown>)
    const element = root(screen)
    expect(element.querySelector('strong')?.textContent).toBe('penting')
    expect([...element.querySelectorAll('ul > li')].map((li) => li.textContent)).toEqual(['satu', 'dua'])
    expect([...element.querySelectorAll('ol > li')].map((li) => li.textContent)).toEqual(['pertama', 'kedua'])
    expect(element.querySelector('code')?.textContent).toBe('npm test')
    expect(element.textContent).not.toContain('**')
  })

  it('draws a table, and turns <br> in a cell into a line break (as models write them)', async () => {
    const markdown = ['| File | Isi |', '|------|-----|', '| `index.html` | Header<br>Hero<br/>Kontak |', '| `style.css` | Tema gelap |'].join('\n')
    const screen = await render(<Markdown>{markdown}</Markdown>)
    const table = screen.getByRole('table')
    await expect.element(table).toBeInTheDocument()
    const rows = [...table.element().querySelectorAll('tbody tr')]
    expect(rows).toHaveLength(2)
    const cell = rows[0].querySelectorAll('td')[1]
    expect(cell.querySelectorAll('br')).toHaveLength(2)
    expect(cell.textContent?.replace(/\s+/g, '')).toBe('HeaderHeroKontak')
    expect(table.element().textContent).not.toContain('<br')
  })

  it('keeps single new lines as line breaks, because that is how a model writes in a chat', async () => {
    const screen = await render(<Markdown>{'Baris satu.\nBaris dua.\n\nParagraf baru.'}</Markdown>)
    const element = root(screen)
    expect(element.querySelectorAll('p')).toHaveLength(2)
    expect(element.querySelectorAll('p')[0].querySelectorAll('br')).toHaveLength(1)
  })

  it('leaves code exactly as written, with no break tags or markup applied inside it', async () => {
    const markdown = ['```html', '<div>', '  <br>', '  **tidak tebal**', '</div>', '```', '', 'dan `<br>` sebaris'].join('\n')
    const screen = await render(<Markdown>{markdown}</Markdown>)
    const element = root(screen)
    const block = element.querySelector('pre code')
    expect(block?.textContent).toBe('<div>\n  <br>\n  **tidak tebal**\n</div>\n')
    expect(block?.querySelector('br')).toBeNull()
    expect(block?.querySelector('strong')).toBeNull()
    expect(element.querySelector('p code')?.textContent).toBe('<br>')
  })

  it('never renders raw HTML from the model: it shows as text and nothing runs', async () => {
    const screen = await render(
      <Markdown>{'Halo <script>window.__pwned = true</script> <img src="x" onerror="window.__pwned = true"> <b onclick="alert(1)">tebal</b>'}</Markdown>
    )
    const element = root(screen)
    expect(element.querySelector('script')).toBeNull()
    expect(element.querySelector('img')).toBeNull()
    expect(element.querySelector('b')).toBeNull()
    expect(element.querySelector('[onerror],[onclick]')).toBeNull()
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
  })

  it('never loads a picture from a markdown image: it shows the description instead', async () => {
    const screen = await render(<Markdown>{'![grafik penjualan](https://tracker.example/pixel.png?u=1)'}</Markdown>)
    const element = root(screen)
    expect(element.querySelector('img')).toBeNull()
    expect(element.textContent).toContain('[grafik penjualan]')
    expect(element.innerHTML).not.toContain('tracker.example')
  })

  it('opens links safely and refuses a javascript: address', async () => {
    const screen = await render(<Markdown>{'[dokumen](https://example.com/docs) dan [klik](javascript:alert(1))'}</Markdown>)
    const links = [...root(screen).querySelectorAll('a')]
    const good = links.find((link) => link.textContent === 'dokumen')!
    expect(good.getAttribute('href')).toBe('https://example.com/docs')
    expect(good.getAttribute('target')).toBe('_blank')
    expect(good.getAttribute('rel')).toBe('noopener noreferrer nofollow')
    const bad = links.find((link) => link.textContent === 'klik')
    expect(bad?.getAttribute('href') ?? '').not.toMatch(/^javascript:/i)
  })

  it('keeps a long table inside its own scroll frame and a long word from widening the page', async () => {
    const screen = await render(<Markdown>{'| a | b |\n|---|---|\n| 1 | 2 |\n\n' + 'x'.repeat(400)}</Markdown>)
    const element = root(screen)
    expect(element.querySelector('table')?.parentElement?.className).toContain('overflow-x-auto')
    expect(element.className).toContain('break-words')
  })

  it('renders plain text and an empty string without failing', async () => {
    const plain = await render(<Markdown>{'Maaf, terjadi kesalahan.\n\n[HTTP 502] Gagal mendapatkan jawaban dari AI.'}</Markdown>)
    expect(root(plain).textContent).toContain('[HTTP 502] Gagal mendapatkan jawaban dari AI.')
    await plain.unmount()
    const empty = await render(<Markdown>{''}</Markdown>)
    expect(root(empty).textContent).toBe('')
  })
})
