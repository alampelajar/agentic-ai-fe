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

  it('shows a drawing in the colours of the look, never a website', async () => {
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
    await expect.element(screen.getByText('Nama Anda di sini')).toBeVisible()
    const button = screen.getByText('Hubungi').element() as HTMLElement
    expect(button.style.borderRadius).toBe('6px')

    expect(screen.container.querySelector('img')).toBeNull()
    expect(screen.container.querySelector('iframe')).toBeNull()
    await expect
      .element(screen.getByRole('button', { name: 'Lihat contoh' }))
      .toBeEnabled()
  })
})
