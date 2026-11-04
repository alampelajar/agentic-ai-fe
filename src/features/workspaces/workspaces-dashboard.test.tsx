import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import type { Workspace } from './data/api'
import { WorkspacesPage } from './index'

const mocks = vi.hoisted(() => ({ getWorkspaces: vi.fn(), createWorkspace: vi.fn(), deleteWorkspace: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock('@tanstack/react-router', async (importActual) => ({
  ...(await importActual<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to, params }: { children?: React.ReactNode; to: string; params?: Record<string, string> }) => (
    <a href={to.replace('$workspaceId', params?.workspaceId ?? '')}>{children}</a>
  ),
}))
vi.mock('./data/api', async (importActual) => ({
  ...(await importActual<typeof import('./data/api')>()),
  getWorkspaces: mocks.getWorkspaces,
  createWorkspace: mocks.createWorkspace,
  deleteWorkspace: mocks.deleteWorkspace,
}))

const workspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: 1,
  name: 'Library app',
  description: 'React and Go',
  source_type: 'empty',
  source_url: '',
  status: 'ready',
  default_runtime: 'go',
  file_count: 12,
  size_bytes: 20480,
  created_at: '2026-11-01T10:00:00Z',
  updated_at: '2026-11-02T10:00:00Z',
  last_accessed_at: '2026-11-02T11:00:00Z',
  ...overrides,
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('Workspace dashboard', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    await i18n.changeLanguage('en')
  })

  it('shows a loading message, then each workspace with its status, files and source', async () => {
    const pending = deferred<Workspace[]>()
    mocks.getWorkspaces.mockReturnValueOnce(pending.promise)
    const screen = await render(<WorkspacesPage />)
    await expect.element(screen.getByText('Loading workspaces...')).toBeInTheDocument()

    pending.resolve([workspace(), workspace({ id: 2, name: 'Imported', source_type: 'github', source_url: 'https://github.com/octo/repo', file_count: 1, size_bytes: 10, status: 'creating', last_accessed_at: null })])
    await expect.element(screen.getByText('Library app')).toBeInTheDocument()
    await expect.element(screen.getByText('12 files · 20.0 KB')).toBeInTheDocument()
    await expect.element(screen.getByText('Imported')).toBeInTheDocument()
    await expect.element(screen.getByText('1 file · 10 B')).toBeInTheDocument()
    await expect.element(screen.getByText('GitHub · octo/repo')).toBeInTheDocument()
    await expect.element(screen.getByText('Never')).toBeInTheDocument()
    await expect.element(screen.getByText('Ready')).toBeInTheDocument()
    await expect.element(screen.getByText('Creating')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open' }).first().element().getAttribute('href')).toBe('/workspaces/1')
  })

  it('shows an empty state with a way forward', async () => {
    mocks.getWorkspaces.mockResolvedValueOnce([])
    const screen = await render(<WorkspacesPage />)
    await expect.element(screen.getByText('No workspaces yet')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'New workspace' })).toBeInTheDocument()
  })

  it('says the load failed, instead of claiming there are none, and retries', async () => {
    mocks.getWorkspaces.mockRejectedValueOnce(new Error('Gagal mengambil workspace.')).mockResolvedValueOnce([workspace()])
    const screen = await render(<WorkspacesPage />)
    await expect.element(screen.getByText('Workspaces could not be loaded')).toBeInTheDocument()
    await expect.element(screen.getByText('Gagal mengambil workspace.')).toBeInTheDocument()
    await expect.element(screen.getByText('No workspaces yet')).not.toBeInTheDocument()
    expect(mocks.toastError).toHaveBeenCalledWith('Gagal mengambil workspace.')

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await expect.element(screen.getByText('Library app')).toBeInTheDocument()
  })

  it('creates an empty workspace', async () => {
    mocks.getWorkspaces.mockResolvedValueOnce([]).mockResolvedValueOnce([workspace()])
    mocks.createWorkspace.mockResolvedValueOnce(workspace())
    const screen = await render(<WorkspacesPage />)
    await userEvent.click(screen.getByRole('button', { name: 'New workspace' }).first())
    await userEvent.fill(screen.getByLabelText('Name'), '  Library app  ')
    await userEvent.selectOptions(screen.getByLabelText('Default runtime'), 'go')
    await userEvent.click(screen.getByRole('button', { name: 'Create workspace' }))

    await vi.waitFor(() => expect(mocks.createWorkspace).toHaveBeenCalledTimes(1))
    expect(mocks.createWorkspace).toHaveBeenCalledWith({ source: 'empty', name: 'Library app', description: '', default_runtime: 'go' })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Workspace "Library app" created.')
    await expect.element(screen.getByTestId('workspace-card')).toBeInTheDocument()
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
  })

  it('uploads a ZIP, after checking the file', async () => {
    mocks.getWorkspaces.mockResolvedValue([])
    mocks.createWorkspace.mockResolvedValueOnce(workspace({ source_type: 'zip' }))
    const screen = await render(<WorkspacesPage />)
    await userEvent.click(screen.getByRole('button', { name: 'New workspace' }).first())
    await userEvent.click(screen.getByLabelText('ZIP file', { exact: true }).first())
    await userEvent.fill(screen.getByLabelText('Name'), 'From zip')

    await userEvent.click(screen.getByRole('button', { name: 'Create workspace' }))
    await expect.element(screen.getByText('Choose a ZIP file.')).toBeInTheDocument()

    const input = screen.getByLabelText('ZIP file', { exact: true }).last().element() as HTMLInputElement
    const transfer = new DataTransfer()
    transfer.items.add(new File(['x'], 'notes.txt'))
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Create workspace' }))
    await expect.element(screen.getByText('The file must be a .zip archive.')).toBeInTheDocument()
    expect(mocks.createWorkspace).not.toHaveBeenCalled()

    const good = new DataTransfer()
    const archive = new File(['PK'], 'project.zip', { type: 'application/zip' })
    good.items.add(archive)
    input.files = good.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Create workspace' }))
    await vi.waitFor(() => expect(mocks.createWorkspace).toHaveBeenCalledTimes(1))
    const sent = mocks.createWorkspace.mock.calls[0][0]
    expect(sent.source).toBe('zip')
    expect(sent.file).toBe(archive)
  })

  it('imports a public GitHub repository, and refuses anything else', async () => {
    mocks.getWorkspaces.mockResolvedValue([])
    mocks.createWorkspace.mockResolvedValueOnce(workspace({ source_type: 'github' }))
    const screen = await render(<WorkspacesPage />)
    await userEvent.click(screen.getByRole('button', { name: 'New workspace' }).first())
    await userEvent.click(screen.getByLabelText('GitHub'))
    await userEvent.fill(screen.getByLabelText('Name'), 'Imported')

    for (const bad of ['', 'http://github.com/a/b', 'https://evil.example/a/b', 'https://user:pass@github.com/a/b', 'git@github.com:a/b.git', 'https://github.com/a']) {
      await userEvent.fill(screen.getByLabelText('Repository URL'), bad)
      await userEvent.click(screen.getByRole('button', { name: 'Create workspace' }))
      await expect.element(screen.getByText('Use a link like https://github.com/owner/repository.')).toBeInTheDocument()
    }
    expect(mocks.createWorkspace).not.toHaveBeenCalled()

    await userEvent.fill(screen.getByLabelText('Repository URL'), 'https://github.com/octo/repo')
    await userEvent.click(screen.getByRole('button', { name: 'Create workspace' }))
    await vi.waitFor(() => expect(mocks.createWorkspace).toHaveBeenCalledTimes(1))
    expect(mocks.createWorkspace.mock.calls[0][0]).toMatchObject({ source: 'github', url: 'https://github.com/octo/repo', name: 'Imported' })
  })

  it('keeps the dialog open with the server message when creating fails', async () => {
    mocks.getWorkspaces.mockResolvedValue([])
    mocks.createWorkspace.mockRejectedValueOnce(new Error('Arsip ditolak: unsafe path in archive'))
    const screen = await render(<WorkspacesPage />)
    await userEvent.click(screen.getByRole('button', { name: 'New workspace' }).first())
    await userEvent.fill(screen.getByLabelText('Name'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Create workspace' }))
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Arsip ditolak')
    await expect.element(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    await expect.element(screen.getByRole('button', { name: 'Create workspace' })).toBeEnabled()
  })

  it('asks before deleting, deletes nothing on cancel and the right workspace on confirm', async () => {
    mocks.getWorkspaces.mockResolvedValue([workspace()])
    mocks.deleteWorkspace.mockResolvedValue(undefined)
    const screen = await render(<WorkspacesPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await expect.element(screen.getByRole('alertdialog')).toHaveTextContent('"Library app" and all of its files will be permanently deleted')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mocks.deleteWorkspace).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('alertdialog').getByRole('button', { name: 'Delete' }))
    await vi.waitFor(() => expect(mocks.deleteWorkspace).toHaveBeenCalledExactlyOnceWith(1))
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Workspace deleted.')
  })

  it('reports a delete the server refuses and keeps the workspace', async () => {
    mocks.getWorkspaces.mockResolvedValue([workspace()])
    mocks.deleteWorkspace.mockRejectedValueOnce(new Error('Masih ada job yang berjalan. Batalkan job terlebih dahulu.'))
    const screen = await render(<WorkspacesPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('alertdialog').getByRole('button', { name: 'Delete' }))
    await vi.waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Masih ada job yang berjalan. Batalkan job terlebih dahulu.'))
    await expect.element(screen.getByText('Library app')).toBeInTheDocument()
  })

  it('is shown in Indonesian when that is the language', async () => {
    await i18n.changeLanguage('id')
    mocks.getWorkspaces.mockResolvedValueOnce([workspace()])
    const screen = await render(<WorkspacesPage />)
    await expect.element(screen.getByRole('heading', { name: 'Workspace Cloud' })).toBeInTheDocument()
    await expect.element(screen.getByText('12 file · 20.0 KB')).toBeInTheDocument()
    await expect.element(screen.getByText('Siap')).toBeInTheDocument()
    await i18n.changeLanguage('en')
  })

  it('has the same text keys in English and Indonesian', async () => {
    const en = (await import('@/i18n/locales/en.json')).default.workspacePage
    const id = (await import('@/i18n/locales/id.json')).default.workspacePage
    const keys = (value: unknown, prefix = ''): string[] =>
      Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => (typeof child === 'object' && child !== null ? keys(child, `${prefix}${key}.`) : [`${prefix}${key}`]))
    expect(keys(id).sort()).toEqual(keys(en).sort())
  })
})
