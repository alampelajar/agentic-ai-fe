import i18n from '@/i18n'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { TopUp } from './top-up'

const api = vi.hoisted(() => ({ sendTopUp: vi.fn() }))
vi.mock('../data/api', async (importActual) => ({
  ...(await importActual<typeof import('../data/api')>()),
  sendTopUp: api.sendTopUp,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const open = {
  available: true,
  price_per_credit: 1000,
  packages: [10, 25],
  payment_info: 'Bank Contoh 0000 a.n. Contoh',
}

describe('TopUp', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('id')
  })
  beforeEach(() => {
    vi.clearAllMocks()
    api.sendTopUp.mockResolvedValue({ id: 1 })
  })

  it('says it is not available until an admin sets it up', async () => {
    const screen = await render(
      <TopUp topup={{ ...open, available: false }} onSent={vi.fn()} />
    )
    await expect.element(screen.getByText('Belum tersedia')).toBeVisible()
  })

  it('asks for a package and the screenshot, then sends both', async () => {
    const onSent = vi.fn()
    const screen = await render(<TopUp topup={open} onSent={onSent} />)
    await expect
      .element(screen.getByText('Bank Contoh 0000 a.n. Contoh'))
      .toBeVisible()

    // Nothing chosen yet.
    await userEvent.click(screen.getByRole('button', { name: 'Kirim bukti' }))
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Pilih jumlah kredit dulu.')

    await userEvent.click(screen.getByRole('button', { name: /25 kredit/ }))
    await expect.element(screen.getByText(/Rp\s?25\.000/).first()).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Kirim bukti' }))
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Tambahkan screenshot bukti bayar dulu.')

    const proof = new File([new Uint8Array([137, 80, 78, 71])], 'bukti.png', {
      type: 'image/png',
    })
    await userEvent.upload(
      screen.getByLabelText('3. Kirim screenshot bukti bayar'),
      proof
    )
    await userEvent.click(screen.getByRole('button', { name: 'Kirim bukti' }))
    await vi.waitFor(() => expect(onSent).toHaveBeenCalled())
    expect(api.sendTopUp).toHaveBeenCalledWith(25, proof)
  })

  it('lets a person type their own number of credits', async () => {
    const onSent = vi.fn()
    const screen = await render(<TopUp topup={open} onSent={onSent} />)
    await userEvent.click(screen.getByRole('button', { name: /Jumlah lain/ }))
    const amount = screen.getByLabelText('Jumlah kredit')

    await userEvent.fill(amount, '1001')
    await userEvent.click(screen.getByRole('button', { name: 'Kirim bukti' }))
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Tulis jumlah dari 1 sampai 1000 kredit.')

    await userEvent.fill(amount, '7')
    await expect.element(screen.getByText(/Rp\s?7\.000/).first()).toBeVisible()
    const proof = new File([new Uint8Array([137, 80, 78, 71])], 'bukti.png', {
      type: 'image/png',
    })
    await userEvent.upload(
      screen.getByLabelText('3. Kirim screenshot bukti bayar'),
      proof
    )
    await userEvent.click(screen.getByRole('button', { name: 'Kirim bukti' }))
    await vi.waitFor(() => expect(onSent).toHaveBeenCalled())
    expect(api.sendTopUp).toHaveBeenCalledWith(7, proof)
  })

  it('shows the new-account discount and the price after it', async () => {
    const screen = await render(
      <TopUp
        topup={open}
        discount={{ percent: 50, until: '2026-12-25T00:00:00Z' }}
        onSent={vi.fn()}
      />
    )
    await expect
      .element(screen.getByRole('status'))
      .toHaveTextContent('diskon 50%')
    await userEvent.click(screen.getByRole('button', { name: /25 kredit/ }))
    await expect.element(screen.getByText(/Rp\s?12\.500/).first()).toBeVisible()
  })
})
