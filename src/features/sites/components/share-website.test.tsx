import i18n from '@/i18n'
import { beforeAll, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { ShareWebsite } from './share-website'

describe('ShareWebsite', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('id')
  })

  it('offers WhatsApp with the address, and a QR code to download', async () => {
    const url = 'https://roti-senja.example.test/'
    const screen = await render(<ShareWebsite url={url} name='Roti Senja' />)

    const whatsapp = screen.getByRole('link', { name: 'Bagikan ke WhatsApp' })
    await expect.element(whatsapp).toBeVisible()
    const href = whatsapp.element().getAttribute('href') ?? ''
    expect(href.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(href)).toContain(url)
    expect(decodeURIComponent(href)).toContain('Roti Senja')

    await expect
      .element(screen.getByRole('img', { name: 'Kode QR untuk Roti Senja' }))
      .toBeVisible()
    const download = screen.getByRole('link', { name: 'Unduh kode QR' })
    await expect
      .element(download)
      .toHaveAttribute('download', 'Roti Senja-qr.png')
    expect(download.element().getAttribute('href')).toMatch(
      /^data:image\/png;base64,/
    )
  })
})
