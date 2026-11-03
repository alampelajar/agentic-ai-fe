import { vi } from 'vitest'

export type RunnerCall = { path: string; method: string; body: Record<string, unknown> | null }
type Reply = { ok: boolean; status: number; body: unknown }

/**
 * Stands in for the Local Agent Runner in tests. Like the real one it stores a
 * request and returns that copy with an id and the expiry time it chose, which is
 * what the dialogs render.
 *
 * - expiresInMs: how long a request stays valid (the real runner uses 60 000).
 * - approve / deny: a fixed reply, or "hold" to keep the answer back until
 *   release() is called, so a test can make the response arrive late.
 *   approve can also be "network-error": the call fails without any answer.
 */
export function stubRunner(options: { expiresInMs?: number; approve?: Reply | 'hold' | 'network-error'; deny?: Reply | 'hold'; emergency?: Reply } = {}) {
  const calls: RunnerCall[] = []
  const held: { path: string; settle: (reply: Reply) => void }[] = []
  const toResponse = (reply: Reply) => ({ ok: reply.ok, status: reply.status, json: async () => reply.body })
  const answer = (path: string, configured: Reply | 'hold' | undefined, fallback: Reply) => {
    if (configured === 'hold') return new Promise<ReturnType<typeof toResponse>>((resolve) => held.push({ path, settle: (reply) => resolve(toResponse(reply)) }))
    return Promise.resolve(toResponse(configured ?? fallback))
  }
  const fetchStub = vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname.replace('/api/desktop', '')
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : null
    calls.push({ path, method, body })
    if (path === '/actions/request') {
      const action = { ...body, id: `desktop-${calls.length}`, expires_at: new Date(Date.now() + (options.expiresInMs ?? 60_000)).toISOString() }
      return toResponse({ ok: true, status: 202, body: { ok: true, approval_required: true, action } })
    }
    if (path === '/windows') {
      return toResponse({ ok: true, status: 200, body: { ok: true, data: { windows: [{ handle: 131406, title: 'agentic-ai-be', class_name: 'CabinetWClass' }, { handle: 900, title: 'Password Manager' }] } } })
    }
    if (path.endsWith('/approve')) {
      // A failure that is not an answer from the runner, such as the network being down.
      if (options.approve === 'network-error') throw new TypeError('Failed to fetch')
      return answer(path, options.approve, { ok: true, status: 200, body: { ok: true, result: { ok: true } } })
    }
    if (path.endsWith('/deny')) return answer(path, options.deny, { ok: true, status: 200, body: { ok: true, status: 'denied' } })
    if (path === '/emergency-stop') return toResponse(options.emergency ?? { ok: true, status: 200, body: { ok: true, status: 'stopped' } })
    return toResponse({ ok: true, status: 200, body: { ok: true } })
  })
  vi.stubGlobal('fetch', fetchStub)

  return {
    calls,
    /** Request paths with ids replaced, to compare calls without knowing the ids. */
    paths: () => calls.map((call) => call.path.replace(/desktop-\d+/, ':id')),
    count: (suffix: string) => calls.filter((call) => call.path.endsWith(suffix)).length,
    /** Answer the oldest held approve or deny. */
    release: (reply: Reply) => {
      const next = held.shift()
      if (!next) throw new Error('no held request to release')
      next.settle(reply)
    },
  }
}
