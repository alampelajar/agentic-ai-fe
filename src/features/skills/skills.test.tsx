import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import type { Skill } from './data/api'
import { Skills } from './index'

const mocks = vi.hoisted(() => ({
  getSkills: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
  validateSkill: vi.fn(),
  createSkill: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock('./data/api', () => ({
  getSkills: mocks.getSkills,
  updateSkill: mocks.updateSkill,
  deleteSkill: mocks.deleteSkill,
  validateSkill: mocks.validateSkill,
  createSkill: mocks.createSkill,
  importSkillGithub: vi.fn(),
  importSkillZip: vi.fn(),
}))

const skill = (overrides: Partial<Skill> = {}): Skill => ({
  id: 1,
  slug: 'reader',
  name: 'Reader',
  description: 'Reads windows',
  author: '',
  source: 'created',
  status: 'installed',
  is_enabled: false,
  current_version: '1.0.0',
  validation_status: 'valid',
  tools: ['desktop.status'],
  requested_permissions: [],
  ...overrides,
})

/** A promise a test settles itself, to answer requests out of order. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('Skills manager', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    await i18n.changeLanguage('id')
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows a loading message, then the skills with their tools', async () => {
    const pending = deferred<Skill[]>()
    mocks.getSkills.mockReturnValueOnce(pending.promise)
    const screen = await render(<Skills />)
    await expect.element(screen.getByText('Memuat skill…')).toBeInTheDocument()

    pending.resolve([skill(), skill({ id: 2, slug: 'typer', name: 'Typer', tools: ['desktop.type'] })])
    await expect.element(screen.getByText('Reader', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText('Typer', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText('desktop.type')).toBeInTheDocument()
    await expect.element(screen.getByText('Memuat skill…')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no skills', async () => {
    mocks.getSkills.mockResolvedValueOnce([])
    const screen = await render(<Skills />)
    await expect.element(screen.getByText('Belum ada skill')).toBeInTheDocument()
  })

  it('says the load failed, instead of claiming there are no skills, and retries', async () => {
    mocks.getSkills.mockRejectedValueOnce(new Error('Server error')).mockResolvedValueOnce([skill()])
    const screen = await render(<Skills />)

    await expect.element(screen.getByText('Skill gagal dimuat')).toBeInTheDocument()
    await expect.element(screen.getByText('Server error')).toBeInTheDocument()
    await expect.element(screen.getByText('Belum ada skill')).not.toBeInTheDocument()
    expect(mocks.toastError).toHaveBeenCalledWith('Server error')

    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))
    await expect.element(screen.getByText('Reader', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText('Skill gagal dimuat')).not.toBeInTheDocument()
  })

  it('a slow answer to an older search does not replace the newest result', async () => {
    const first = deferred<Skill[]>()
    const second = deferred<Skill[]>()
    mocks.getSkills.mockResolvedValueOnce([skill()]) // initial load
    const screen = await render(<Skills />)
    await expect.element(screen.getByText('Reader', { exact: true })).toBeInTheDocument()

    mocks.getSkills.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    await userEvent.type(screen.getByPlaceholder('Cari nama, slug, atau deskripsi'), 'ty')

    second.resolve([skill({ id: 2, slug: 'typer', name: 'Typer' })]) // the newest search answers first
    await expect.element(screen.getByText('Typer', { exact: true })).toBeInTheDocument()
    first.resolve([skill({ id: 3, slug: 'old', name: 'Old result' })]) // then the older one, late
    await new Promise((done) => setTimeout(done, 50))
    await expect.element(screen.getByText('Typer', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText('Old result', { exact: true })).not.toBeInTheDocument()
  })

  it('enables a skill and reloads the list', async () => {
    mocks.getSkills.mockResolvedValueOnce([skill()]).mockResolvedValueOnce([skill({ is_enabled: true, status: 'enabled' })])
    mocks.updateSkill.mockResolvedValueOnce({})
    const screen = await render(<Skills />)
    await userEvent.click(screen.getByRole('button', { name: 'Aktifkan' }))

    expect(mocks.updateSkill).toHaveBeenCalledWith(1, { is_enabled: true })
    await expect.element(screen.getByRole('button', { name: 'Nonaktifkan' })).toBeInTheDocument()
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Skill diaktifkan.')
  })

  it('asks before deleting, and deletes nothing when the user cancels', async () => {
    mocks.getSkills.mockResolvedValue([skill()])
    mocks.deleteSkill.mockResolvedValue({})
    const screen = await render(<Skills />)

    await userEvent.click(screen.getByRole('button', { name: 'Hapus' }))
    const dialog = screen.getByRole('alertdialog')
    await expect.element(dialog.getByText('Hapus skill Reader?')).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Batal' }))
    await expect.element(screen.getByRole('alertdialog')).not.toBeInTheDocument()
    expect(mocks.deleteSkill).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Hapus' }))
    await userEvent.click(screen.getByRole('alertdialog').getByRole('button', { name: 'Hapus' }))
    await vi.waitFor(() => expect(mocks.deleteSkill).toHaveBeenCalledExactlyOnceWith(1))
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Skill dihapus.')
  })

  it('reports a failed operation and keeps the list', async () => {
    mocks.getSkills.mockResolvedValue([skill()])
    mocks.updateSkill.mockRejectedValueOnce(new Error('Skill tidak ditemukan.'))
    const screen = await render(<Skills />)
    await userEvent.click(screen.getByRole('button', { name: 'Aktifkan' }))

    await vi.waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Skill tidak ditemukan.'))
    await expect.element(screen.getByText('Reader', { exact: true })).toBeInTheDocument()
  })

  it('shows why a skill is invalid', async () => {
    mocks.getSkills.mockResolvedValueOnce([skill({ validation_status: 'error', validation_error: 'Tool tidak dikenal' })])
    const screen = await render(<Skills />)
    await expect.element(screen.getByText('Tool tidak dikenal')).toBeInTheDocument()
  })

  it('creates a skill with the tools that were ticked', async () => {
    await i18n.changeLanguage('en')
    mocks.getSkills.mockResolvedValue([])
    mocks.createSkill.mockResolvedValue({ skill: skill() })
    const screen = await render(<Skills />)
    await userEvent.click(screen.getByRole('tab', { name: 'Create skill' }))
    await userEvent.fill(screen.getByLabelText('Slug / ID'), 'reader')
    await userEvent.fill(screen.getByLabelText('Name'), 'Reader')
    await userEvent.fill(screen.getByLabelText('SKILL.md'), '# Reader')
    await userEvent.click(screen.getByRole('checkbox', { name: 'workspace.read_file' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'workspace.write_file' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'workspace.write_file' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save skill' }))

    await vi.waitFor(() => expect(mocks.createSkill).toHaveBeenCalledTimes(1))
    expect(mocks.createSkill.mock.calls[0][0]).toMatchObject({ id: 'reader', name: 'Reader', tools: ['workspace.read_file'] })
  })

  it('names where a skill came from in the chosen language', async () => {
    await i18n.changeLanguage('en')
    mocks.getSkills.mockResolvedValue([skill()])
    const screen = await render(<Skills />)
    await expect.element(screen.getByText('Created here')).toBeInTheDocument()
  })
})
