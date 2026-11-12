import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('@/lib/api', () => ({ apiFetch: mocks.apiFetch }))

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body, blob: async () => new Blob(['x']) })

describe('task message attachments', () => {
  beforeEach(() => vi.resetAllMocks())

  it('sends a message with files as a form, the fields and every file included', async () => {
    mocks.apiFetch.mockResolvedValue(ok({ ok: true, message: { id: 1 } }))
    const { addTaskMessage } = await import('./api')
    const photo = new File(['p'], 'foto.png', { type: 'image/png' })
    const note = new File(['n'], 'catatan.md')
    await addTaskMessage(5, { role: 'user', content: 'lihat', model: '', model_id: null, provider: '' }, [photo, note])

    const [path, init] = mocks.apiFetch.mock.calls[0]
    expect(path).toBe('/api/tasks/5/messages')
    const form = init.body as FormData
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('role')).toBe('user')
    expect(form.get('content')).toBe('lihat')
    expect(form.has('model_id')).toBe(false)
    expect(form.getAll('attachments').map((file) => (file as File).name)).toEqual(['foto.png', 'catatan.md'])
  })

  it('keeps sending JSON when there are no files', async () => {
    mocks.apiFetch.mockResolvedValue(ok({ ok: true, message: { id: 1 } }))
    const { addTaskMessage } = await import('./api')
    await addTaskMessage(5, { role: 'assistant', content: 'jawaban', model: 'm', model_id: 2, provider: 'p' })
    expect(JSON.parse(mocks.apiFetch.mock.calls[0][1].body)).toMatchObject({ role: 'assistant', content: 'jawaban', model_id: 2 })
  })

  it('fetches one stored attachment, and fails loudly when it is gone', async () => {
    mocks.apiFetch.mockResolvedValueOnce(ok({})).mockResolvedValueOnce({ ok: false, status: 404 })
    const { getTaskAttachment } = await import('./api')
    await expect(getTaskAttachment(5, 9)).resolves.toBeInstanceOf(Blob)
    expect(mocks.apiFetch).toHaveBeenCalledWith('/api/tasks/5/attachments/9')
    await expect(getTaskAttachment(5, 10)).rejects.toThrow('404')
  })
})
