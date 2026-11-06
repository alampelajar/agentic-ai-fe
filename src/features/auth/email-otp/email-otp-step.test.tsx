import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { EmailOtpStep } from './email-otp-step'

const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMocks }))

describe('EmailOtpStep', () => {
  beforeEach(() => vi.clearAllMocks())

  it('names the address the code was sent to and blocks resend during the countdown', async () => {
    const screen = await render(<EmailOtpStep email='rina@example.com' onVerify={vi.fn()} onResend={vi.fn()} />)
    await expect.element(screen.getByText('rina@example.com')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: /resend ?in|kirim ulang dalam/i })).toBeDisabled()
  })

  it('verifies only once all six digits are entered, and sends the code as typed', async () => {
    const onVerify = vi.fn().mockResolvedValue(undefined)
    const screen = await render(<EmailOtpStep email='rina@example.com' verifyLabel='Confirm' onVerify={onVerify} onResend={vi.fn()} />)
    const submit = screen.getByRole('button', { name: 'Confirm' })
    const input = screen.getByRole('textbox')

    await userEvent.fill(input, '12345')
    await expect.element(submit).toBeDisabled()

    await userEvent.fill(input, '123456')
    await expect.element(submit).toBeEnabled()
    await userEvent.click(submit)
    expect(onVerify).toHaveBeenCalledWith('123456')
  })

  it('shows the server message and clears the code when verification fails', async () => {
    const onVerify = vi.fn().mockRejectedValue(new Error('Kode OTP tidak valid atau kedaluwarsa.'))
    const screen = await render(<EmailOtpStep email='rina@example.com' verifyLabel='Confirm' onVerify={onVerify} onResend={vi.fn()} />)
    await userEvent.fill(screen.getByRole('textbox'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    await vi.waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith('Kode OTP tidak valid atau kedaluwarsa.'))
    await expect.element(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()
  })
})
