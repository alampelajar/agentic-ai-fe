import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import type { Memory } from './data/api'
import { MemoryPage } from './index'

const mocks = vi.hoisted(() => ({
  getMemories: vi.fn(),
  createMemory: vi.fn(),
  updateMemory: vi.fn(),
  deleteMemory: vi.fn(),
  getMemorySettings: vi.fn(),
  setMemoryEnabled: vi.fn(),
  getMemoryAgents: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock('./data/api', async (importActual) => ({
  ...(await importActual<typeof import('./data/api')>()),
  getMemories: mocks.getMemories,
  createMemory: mocks.createMemory,
  updateMemory: mocks.updateMemory,
  deleteMemory: mocks.deleteMemory,
  getMemorySettings: mocks.getMemorySettings,
  setMemoryEnabled: mocks.setMemoryEnabled,
  getMemoryAgents: mocks.getMemoryAgents,
}))

const memory = (overrides: Partial<Memory> = {}): Memory => ({
  id: 1,
  agent_id: null,
  category: 'project',
  title: 'Conelo stack',
  content: 'Go, Gin and GORM backend',
  importance: 4,
  status: 'active',
  source_task_id: null,
  created_at: '2026-11-01T10:00:00Z',
  updated_at: '2026-11-02T10:00:00Z',
  last_used_at: null,
  ...overrides,
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

async function openPage(options: { memories?: Memory[]; enabled?: boolean } = {}) {
  mocks.getMemories.mockResolvedValue(options.memories ?? [memory()])
  mocks.getMemorySettings.mockResolvedValue({ enabled: options.enabled ?? true })
  const screen = await render(<MemoryPage />)
  return screen
}

describe('Memory page', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    mocks.getMemoryAgents.mockResolvedValue([
      { id: 7, name: 'Coding Agent' },
      { id: 8, name: 'Testing Agent' },
    ])
    await i18n.changeLanguage('en')
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows a loading message, then the memories with scope, category and importance', async () => {
    const pending = deferred<Memory[]>()
    mocks.getMemories.mockReturnValueOnce(pending.promise)
    mocks.getMemorySettings.mockResolvedValue({ enabled: true })
    const screen = await render(<MemoryPage />)
    await expect.element(screen.getByText('Loading memories...')).toBeInTheDocument()

    pending.resolve([
      memory(),
      memory({ id: 2, title: 'Review style', content: 'Short findings first', category: 'preference', agent_id: 7, importance: 2 }),
    ])
    await expect.element(screen.getByText('Conelo stack')).toBeInTheDocument()
    await expect.element(screen.getByText('Review style')).toBeInTheDocument()
    await expect.element(screen.getByText('Global', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText('Agent: Coding Agent')).toBeInTheDocument()
    await expect.element(screen.getByText('Importance 4/5')).toBeInTheDocument()
    await expect.element(screen.getByText('Preference', { exact: true }).first()).toBeInTheDocument()
    await expect.element(screen.getByText('Loading memories...')).not.toBeInTheDocument()
  })

  it('says Persistent Memory is off when it is, and not when it is on', async () => {
    const off = await openPage({ enabled: false })
    await expect.element(off.getByTestId('memory-disabled-notice')).toBeInTheDocument()
    await off.unmount()

    const on = await openPage({ enabled: true })
    await expect.element(on.getByText('Conelo stack')).toBeInTheDocument()
    await expect.element(on.getByTestId('memory-disabled-notice')).not.toBeInTheDocument()
  })

  it('turns Persistent Memory on and off through the server', async () => {
    mocks.setMemoryEnabled.mockResolvedValueOnce({ enabled: true }).mockResolvedValueOnce({ enabled: false })
    const screen = await openPage({ enabled: false })
    const toggle = screen.getByRole('switch', { name: 'Use memory in chats' })

    await userEvent.click(toggle)
    expect(mocks.setMemoryEnabled).toHaveBeenLastCalledWith(true)
    await expect.element(screen.getByTestId('memory-disabled-notice')).not.toBeInTheDocument()
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Persistent Memory is on.')

    await userEvent.click(toggle)
    expect(mocks.setMemoryEnabled).toHaveBeenLastCalledWith(false)
    await expect.element(screen.getByTestId('memory-disabled-notice')).toBeInTheDocument()
  })

  it('keeps the switch where it was when the server refuses the change', async () => {
    mocks.setMemoryEnabled.mockRejectedValueOnce(new Error('Gagal menyimpan pengaturan memory.'))
    const screen = await openPage({ enabled: false })
    await userEvent.click(screen.getByRole('switch', { name: 'Use memory in chats' }))

    await vi.waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Gagal menyimpan pengaturan memory.'))
    await expect.element(screen.getByTestId('memory-disabled-notice')).toBeInTheDocument()
  })

  it('shows an empty state with no memories, and a different one when filters match nothing', async () => {
    const screen = await openPage({ memories: [] })
    await expect.element(screen.getByText('No memories yet')).toBeInTheDocument()

    mocks.getMemories.mockResolvedValue([])
    await userEvent.fill(screen.getByLabelText('Search memories'), 'zzz')
    await expect.element(screen.getByText('No memories match these filters.')).toBeInTheDocument()
    await expect.element(screen.getByText('No memories yet')).not.toBeInTheDocument()
  })

  it('says the load failed, instead of claiming there are no memories, and retries', async () => {
    mocks.getMemories.mockRejectedValueOnce(new Error('Gagal mengambil memory.')).mockResolvedValueOnce([memory()])
    mocks.getMemorySettings.mockResolvedValue({ enabled: true })
    const screen = await render(<MemoryPage />)

    await expect.element(screen.getByText('Memories could not be loaded')).toBeInTheDocument()
    await expect.element(screen.getByText('Gagal mengambil memory.')).toBeInTheDocument()
    await expect.element(screen.getByText('No memories yet')).not.toBeInTheDocument()
    expect(mocks.toastError).toHaveBeenCalledWith('Gagal mengambil memory.')

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await expect.element(screen.getByText('Conelo stack')).toBeInTheDocument()
  })

  it('asks the server to filter by search, category, agent and status', async () => {
    const screen = await openPage()
    await expect.element(screen.getByText('Conelo stack')).toBeInTheDocument()

    await userEvent.fill(screen.getByLabelText('Search memories'), 'gorm')
    await vi.waitFor(() => expect(mocks.getMemories).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'gorm' })))
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'decision')
    await vi.waitFor(() => expect(mocks.getMemories).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'gorm', category: 'decision' })))
    await userEvent.selectOptions(screen.getByLabelText('Agent'), '7')
    await vi.waitFor(() => expect(mocks.getMemories).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'decision', agent: '7' })))
    await userEvent.selectOptions(screen.getByLabelText('Agent'), 'global')
    await vi.waitFor(() => expect(mocks.getMemories).toHaveBeenLastCalledWith(expect.objectContaining({ agent: 'global' })))
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'archived')
    await vi.waitFor(() => expect(mocks.getMemories).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'archived' })))
  })

  it('a slow answer to an older filter does not replace the newest result', async () => {
    const first = deferred<Memory[]>()
    const second = deferred<Memory[]>()
    const screen = await openPage()
    await expect.element(screen.getByText('Conelo stack')).toBeInTheDocument()

    mocks.getMemories.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    await userEvent.type(screen.getByLabelText('Search memories'), 'ty')

    second.resolve([memory({ id: 2, title: 'Newest result' })])
    await expect.element(screen.getByText('Newest result')).toBeInTheDocument()
    first.resolve([memory({ id: 3, title: 'Old result' })])
    await new Promise((done) => setTimeout(done, 50))
    await expect.element(screen.getByText('Newest result')).toBeInTheDocument()
    await expect.element(screen.getByText('Old result')).not.toBeInTheDocument()
  })

  it('creates a memory: sends only what the user filled in, then reloads and confirms', async () => {
    mocks.createMemory.mockResolvedValueOnce(memory({ id: 9 }))
    const screen = await openPage({ memories: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Add memory' }).first())

    await userEvent.fill(screen.getByLabelText('Title'), '  Project goal  ')
    await userEvent.fill(screen.getByLabelText('Content'), 'Ship Phase 5A')
    const dialog = screen.getByRole('dialog')
    await userEvent.selectOptions(dialog.getByLabelText('Category'), 'decision')
    await userEvent.selectOptions(dialog.getByLabelText('Scope'), '8')
    mocks.getMemories.mockResolvedValue([memory({ id: 9, title: 'Project goal' })])
    await userEvent.click(screen.getByRole('button', { name: 'Save memory' }))

    await vi.waitFor(() => expect(mocks.createMemory).toHaveBeenCalledTimes(1))
    const draft = mocks.createMemory.mock.calls[0][0]
    expect(draft).toEqual({ title: 'Project goal', content: 'Ship Phase 5A', category: 'decision', importance: 3, agent_id: 8 })
    expect(Object.keys(draft)).not.toContain('user_id') // the server decides the owner
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Memory saved.')
    await expect.element(screen.getByText('Project goal')).toBeInTheDocument()
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  })

  it('checks the form before sending anything', async () => {
    const screen = await openPage({ memories: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Add memory' }).first())
    await userEvent.click(screen.getByRole('button', { name: 'Save memory' }))
    await expect.element(screen.getByText('Title is required.')).toBeInTheDocument()

    await userEvent.fill(screen.getByLabelText('Title'), 'Goal')
    await userEvent.click(screen.getByRole('button', { name: 'Save memory' }))
    await expect.element(screen.getByText('Content is required.')).toBeInTheDocument()
    expect(mocks.createMemory).not.toHaveBeenCalled()
  })

  it('keeps the dialog open and shows the server message when a memory is refused', async () => {
    mocks.createMemory.mockRejectedValueOnce(new Error('Memory tampak berisi password, OTP, API key, token, atau kredensial lain.'))
    const screen = await openPage({ memories: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Add memory' }).first())
    await userEvent.fill(screen.getByLabelText('Title'), 'Login')
    await userEvent.fill(screen.getByLabelText('Content'), 'password: hunter2hunter2')
    await userEvent.click(screen.getByRole('button', { name: 'Save memory' }))

    await expect.element(screen.getByRole('alert')).toHaveTextContent('Memory tampak berisi password')
    await expect.element(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    // The refused text is not written to the browser's storage.
    expect(JSON.stringify({ ...localStorage })).not.toContain('hunter2')
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('hunter2')
  })

  it('edits a memory and sends its id with the new values', async () => {
    mocks.updateMemory.mockResolvedValueOnce(memory({ title: 'Conelo backend' }))
    const screen = await openPage({ memories: [memory({ agent_id: 7 })] })
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    await expect.element(screen.getByRole('dialog')).toHaveTextContent('Edit memory')
    expect((screen.getByLabelText('Title').element() as HTMLInputElement).value).toBe('Conelo stack')
    expect((screen.getByLabelText('Scope').element() as HTMLSelectElement).value).toBe('7')
    await userEvent.fill(screen.getByLabelText('Title'), 'Conelo backend')
    await userEvent.click(screen.getByRole('button', { name: 'Save memory' }))

    await vi.waitFor(() => expect(mocks.updateMemory).toHaveBeenCalledTimes(1))
    expect(mocks.updateMemory).toHaveBeenCalledWith(1, { title: 'Conelo backend', content: 'Go, Gin and GORM backend', category: 'project', importance: 4, agent_id: 7 })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Memory updated.')
  })

  it('archives an active memory and restores an archived one', async () => {
    mocks.updateMemory.mockResolvedValue(memory())
    const screen = await openPage({ memories: [memory(), memory({ id: 2, title: 'Old note', status: 'archived' })] })
    await expect.element(screen.getByText('Old note')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    expect(mocks.updateMemory).toHaveBeenLastCalledWith(1, { status: 'archived' })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Memory archived.')

    await userEvent.click(screen.getByRole('button', { name: 'Restore' }))
    expect(mocks.updateMemory).toHaveBeenLastCalledWith(2, { status: 'active' })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Memory restored.')
  })

  it('asks before deleting, deletes nothing on cancel and the right memory on confirm', async () => {
    mocks.deleteMemory.mockResolvedValue(undefined)
    const screen = await openPage()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await expect.element(screen.getByRole('alertdialog')).toHaveTextContent('"Conelo stack" will be permanently deleted')

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mocks.deleteMemory).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('alertdialog').getByRole('button', { name: 'Delete' }))
    await vi.waitFor(() => expect(mocks.deleteMemory).toHaveBeenCalledExactlyOnceWith(1))
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Memory deleted.')
  })

  it('reports a failed action and keeps what is shown', async () => {
    mocks.updateMemory.mockRejectedValueOnce(new Error('Memory tidak ditemukan.'))
    const screen = await openPage()
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))

    await vi.waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Memory tidak ditemukan.'))
    await expect.element(screen.getByText('Conelo stack')).toBeInTheDocument()
  })

  it('shows the page in Indonesian when that is the language', async () => {
    await i18n.changeLanguage('id')
    const screen = await openPage({ enabled: false })
    await expect.element(screen.getByRole('heading', { name: 'Memori' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Tambah memori' }).first()).toBeInTheDocument()
    await expect.element(screen.getByTestId('memory-disabled-notice')).toHaveTextContent('Memori Persisten nonaktif')
    await i18n.changeLanguage('en')
  })

  it('has the same text keys in English and Indonesian', async () => {
    const en = (await import('@/i18n/locales/en.json')).default.memoryPage
    const id = (await import('@/i18n/locales/id.json')).default.memoryPage
    const keys = (value: unknown, prefix = ''): string[] =>
      Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => (typeof child === 'object' && child !== null ? keys(child, `${prefix}${key}.`) : [`${prefix}${key}`]))
    expect(keys(id).sort()).toEqual(keys(en).sort())
  })
})
