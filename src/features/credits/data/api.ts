import { apiFetch } from '@/lib/api/client'

/** How to buy credits, as an admin set it. */
export type TopUp = {
  available: boolean
  /** In Rupiah. */
  price_per_credit: number
  packages: number[]
  /** Where to pay, one line each. */
  payment_info: string
}

/** The new-account discount: 50% for 30 days, 0 when it does not apply. */
export type Discount = { percent: number; until: string | null }

export type TopUpRequest = {
  id: number
  credits: number
  price: number
  discount_percent: number
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string
  reviewed_at: string | null
  created_at: string
}

export class TopUpError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'TopUpError'
    this.code = code
  }
}

async function read<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) {
    throw new TopUpError(data?.code ?? 'unknown', data?.message ?? '')
  }
  return data as T
}

export async function getTopUp(): Promise<{
  topup: TopUp
  requests: TopUpRequest[]
  discount: Discount
}> {
  return read(await apiFetch('/api/topup'))
}

/** Sends a request for a package, with the screenshot of the payment. */
export async function sendTopUp(
  credits: number,
  proof: File
): Promise<TopUpRequest> {
  const form = new FormData()
  form.append('credits', String(credits))
  form.append('proof', proof)
  const result = await read<{ request: TopUpRequest }>(
    await apiFetch('/api/topups', { method: 'POST', body: form })
  )
  return result.request
}
