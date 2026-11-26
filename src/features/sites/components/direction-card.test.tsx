import i18n from '@/i18n'
import { beforeAll, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { Direction, LookBlocks } from '../data/api'
import { DirectionCard } from './direction-card'

const plain: LookBlocks = {
  header: 'split',
  hero: 'editorial',
  list: 'rows',
  statement: 'quote',
  footer: 'columns',
  button: 'square',
  frame: 'line',
  caps: false,
  centered: false,
  rule: false,
  tilt: false,
  airy: true,
}

function look(key: string, name: string, blocks?: LookBlocks): Direction {
  return {
    key,
    name,
    description: `${name}, untuk usaha Anda.`,
    variant: '',
    variant_name: '',
    // design-system-ignore: a look's own colours, as the server sends them
    palette: {
      background: '#FBF6EE',
      surface: '#F3EADB',
      foreground: '#2B2118',
      muted: '#6E5E4C',
      primary: '#A8471F',
      primary_foreground: '#FFF8F0',
      accent: '#E2A93B',
      border: '#E2D3BD',
    },
    serif: true,
    radius: '6px',
    sample_url: 'https://contoh-look.example.test/',
    blocks,
  }
}

describe('DirectionCard', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('id')
  })

  it('shows colours and layout, never a picture or copy of a website', async () => {
    const screen = await render(
      <DirectionCard
        direction={look('warm-editorial', 'Hangat dan klasik', plain)}
        selected={false}
        onSelect={() => {}}
        onPreview={() => {}}
      />
    )
    await expect
      .element(screen.getByRole('radio', { name: /Hangat dan klasik/ }))
      .toBeVisible()
    expect(screen.container.querySelector('img')).toBeNull()
    expect(screen.container.querySelector('iframe')).toBeNull()
    await expect
      .element(screen.getByRole('button', { name: 'Lihat contoh' }))
      .toBeEnabled()
  })

  it('draws a different layout for a look with other sections', async () => {
    const drawing = async (blocks?: LookBlocks) => {
      const screen = await render(
        <DirectionCard
          direction={look('a', 'Tampilan', blocks)}
          selected={false}
          onSelect={() => {}}
          onPreview={() => {}}
        />
      )
      const html =
        screen.container.querySelector('[aria-hidden="true"]')?.innerHTML ?? ''
      await screen.unmount()
      return html
    }
    const editorial = await drawing(plain)
    const poster = await drawing({
      ...plain,
      header: 'bar',
      hero: 'poster',
      list: 'boxes',
      statement: 'band',
      footer: 'dark',
      frame: 'bold',
      caps: true,
    })
    expect(editorial).not.toBe('')
    expect(poster).not.toBe(editorial)
    // A server that sends no sections still gets a drawing.
    expect(await drawing(undefined)).not.toBe('')
  })
})
