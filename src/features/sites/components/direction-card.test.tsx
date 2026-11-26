import i18n from '@/i18n'
import { beforeAll, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { Direction } from '../data/api'
import { DirectionCard } from './direction-card'

const look: Direction = {
  key: 'warm-editorial',
  name: 'Hangat dan klasik',
  description: 'Warna krem dan cokelat bata.',
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
}

describe('DirectionCard', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('id')
  })

  it('shows the colours and where each is used, never a website', async () => {
    const screen = await render(
      <DirectionCard
        direction={look}
        selected={false}
        onSelect={() => {}}
        onPreview={() => {}}
      />
    )
    await expect
      .element(screen.getByRole('radio', { name: /Hangat dan klasik/ }))
      .toBeVisible()
    for (const label of ['Latar', 'Kotak', 'Judul', 'Tombol', 'Aksen'])
      await expect
        .element(screen.getByText(label, { exact: true }))
        .toBeVisible()

    const boxes = Array.from(
      screen.container.querySelectorAll<HTMLElement>('.h-12')
    ).map((box) => box.style.background)
    expect(boxes).toHaveLength(5)
    expect(new Set(boxes).size).toBe(5)

    expect(screen.container.querySelector('img')).toBeNull()
    expect(screen.container.querySelector('iframe')).toBeNull()
    await expect
      .element(screen.getByRole('button', { name: 'Lihat contoh' }))
      .toBeEnabled()
  })
})
