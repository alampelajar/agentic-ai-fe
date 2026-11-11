import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import type { TreeEntry, Workspace } from './data/api'
import { WorkspaceDetailPage } from './workspace-detail'

const mocks = vi.hoisted(() => ({
  getWorkspace: vi.fn(),
  getTree: vi.fn(),
  getChanges: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exportWorkspace: vi.fn(),
  getExecutions: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock('@tanstack/react-router', async (importActual) => ({
  ...(await importActual<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to }: { children?: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))
vi.mock('./data/api', async (importActual) => ({
  ...(await importActual<typeof import('./data/api')>()),
  getWorkspace: mocks.getWorkspace,
  getTree: mocks.getTree,
  getChanges: mocks.getChanges,
  readFile: mocks.readFile,
  writeFile: mocks.writeFile,
  exportWorkspace: mocks.exportWorkspace,
  getExecutions: mocks.getExecutions,
}))

const workspace: Workspace = {
  id: 3,
  name: 'Library app',
  description: '',
  source_type: 'empty',
  source_url: '',
  status: 'ready',
  default_runtime: 'go',
  file_count: 3,
  size_bytes: 2048,
  created_at: '2026-11-01T10:00:00Z',
  updated_at: '2026-11-02T10:00:00Z',
  last_accessed_at: null,
}
const entries: TreeEntry[] = [
  { path: 'src', name: 'src', type: 'dir', size: 0 },
  { path: 'README.md', name: 'README.md', type: 'file', size: 10 },
  { path: 'src/main.go', name: 'main.go', type: 'file', size: 14 },
  { path: '.env', name: '.env', type: 'file', size: 20, sensitive: true },
]

async function openPage() {
  mocks.getWorkspace.mockResolvedValue(workspace)
  mocks.getTree.mockResolvedValue({ entries, truncated: false })
  mocks.getChanges.mockResolvedValue([])
  mocks.getExecutions.mockResolvedValue({ jobs: [], executionEnabled: false })
  const screen = await render(<WorkspaceDetailPage workspaceId={3} />)
  await expect.element(screen.getByRole('heading', { name: 'Library app' })).toBeInTheDocument()
  return screen
}

describe('Workspace explorer', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    await i18n.changeLanguage('en')
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows the workspace, its tree with folders collapsed, and marks protected files', async () => {
    const screen = await openPage()
    await expect.element(screen.getByText('2 files')).not.toBeInTheDocument() // count comes from the workspace record
    await expect.element(screen.getByText(/3 files · 2\.0 KB · go/)).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'main.go' })).not.toBeInTheDocument() // inside the collapsed folder
    await expect.element(screen.getByText('protected')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'src' }))
    await expect.element(screen.getByRole('button', { name: 'main.go' })).toBeInTheDocument()
  })

  it('shows a dependency folder as a closed, labelled entry that cannot be opened', async () => {
    mocks.getWorkspace.mockResolvedValue(workspace)
    mocks.getTree.mockResolvedValue({ entries: [...entries, { path: 'node_modules', name: 'node_modules', type: 'dir', size: 0, generated: true }], truncated: false })
    mocks.getChanges.mockResolvedValue([])
    mocks.getExecutions.mockResolvedValue({ jobs: [], executionEnabled: false })
    const screen = await render(<WorkspaceDetailPage workspaceId={3} />)
    const folder = screen.getByTestId('generated-folder')
    await expect.element(folder).toHaveTextContent('node_modules')
    await expect.element(folder).toHaveTextContent('dependencies')
    // Not a button: clicking it must not try to list or open anything inside.
    await expect.element(screen.getByRole('button', { name: /node_modules/ })).not.toBeInTheDocument()
    await userEvent.click(folder)
    expect(mocks.getTree).toHaveBeenCalledTimes(1)
    expect(mocks.readFile).not.toHaveBeenCalled()
  })

  it('opens a file, edits it and saves it', async () => {
    mocks.readFile.mockResolvedValueOnce({ path: 'README.md', content: '# Hello', size: 7 })
    mocks.writeFile.mockResolvedValueOnce({ created: false, size: 12, workspace })
    const screen = await openPage()
    await userEvent.click(screen.getByRole('button', { name: 'README.md' }))
    const editor = screen.getByLabelText('File editor')
    await expect.element(editor).toHaveValue('# Hello')
    await expect.element(screen.getByRole('button', { name: 'Save' })).toBeDisabled() // nothing changed yet

    await userEvent.fill(editor, '# Hello world')
    await expect.element(screen.getByText('unsaved')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await vi.waitFor(() => expect(mocks.writeFile).toHaveBeenCalledExactlyOnceWith(3, 'README.md', '# Hello world'))
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Saved README.md.')
    await expect.element(screen.getByText('unsaved')).not.toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('shows what changed in an unsaved edit, and can revert it', async () => {
    mocks.readFile.mockResolvedValueOnce({ path: 'README.md', content: 'one\ntwo\nthree', size: 13 })
    const screen = await openPage()
    await userEvent.click(screen.getByRole('button', { name: 'README.md' }))
    await userEvent.fill(screen.getByLabelText('File editor'), 'one\n2\nthree')
    await userEvent.click(screen.getByRole('button', { name: 'Show changes' }))
    const diff = screen.getByTestId('diff-view')
    await expect.element(diff).toHaveTextContent('- two')
    await expect.element(diff).toHaveTextContent('+ 2')

    await userEvent.click(screen.getByRole('button', { name: 'Revert' }))
    await expect.element(screen.getByLabelText('File editor')).toHaveValue('one\ntwo\nthree')
    await expect.element(screen.getByTestId('diff-view')).not.toBeInTheDocument()
  })

  it('keeps the edit and says why when saving fails', async () => {
    mocks.readFile.mockResolvedValueOnce({ path: 'README.md', content: 'a', size: 1 })
    mocks.writeFile.mockRejectedValueOnce(new Error('Kuota penyimpanan terlampaui.'))
    const screen = await openPage()
    await userEvent.click(screen.getByRole('button', { name: 'README.md' }))
    await userEvent.fill(screen.getByLabelText('File editor'), 'abc')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Kuota penyimpanan terlampaui.')
    await expect.element(screen.getByLabelText('File editor')).toHaveValue('abc')
    await expect.element(screen.getByText('unsaved')).toBeInTheDocument()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it('explains a file that cannot be shown instead of showing an empty editor', async () => {
    mocks.readFile.mockRejectedValueOnce(new Error('File ini mungkin berisi rahasia dan tidak tersedia lewat workspace.'))
    const screen = await openPage()
    await userEvent.click(screen.getByRole('button', { name: /\.env/ }))
    await expect.element(screen.getByRole('alert')).toHaveTextContent('mungkin berisi rahasia')
    await expect.element(screen.getByLabelText('File editor')).not.toBeInTheDocument()
  })

  it('asks before throwing away unsaved edits when another file is opened', async () => {
    mocks.readFile.mockImplementation(async (_id: number, path: string) => ({ path, content: path === 'README.md' ? 'readme' : 'package main', size: 6 }))
    const screen = await openPage()
    await userEvent.click(screen.getByRole('button', { name: 'README.md' }))
    await userEvent.fill(screen.getByLabelText('File editor'), 'changed')
    await userEvent.click(screen.getByRole('button', { name: 'src' }))
    await userEvent.click(screen.getByRole('button', { name: 'main.go' }))

    // The app's own dialog asks, not window.confirm.
    const dialog = screen.getByRole('alertdialog')
    await expect.element(dialog.getByText('You have unsaved changes. Discard them?')).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }))
    await expect.element(screen.getByLabelText('File editor')).toHaveValue('changed') // declined: still the edited file
    expect(mocks.readFile).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'main.go' }))
    await userEvent.click(screen.getByRole('alertdialog').getByRole('button', { name: 'Discard' }))
    await expect.element(screen.getByLabelText('File editor')).toHaveValue('package main')
  })

  it('creates a new file that is saved with the first Save', async () => {
    mocks.writeFile.mockResolvedValueOnce({ created: true, size: 4, workspace })
    const screen = await openPage()
    await userEvent.fill(screen.getByLabelText('New file path'), '/docs/notes.md')
    await userEvent.click(screen.getByRole('button', { name: 'New file' }))
    await expect.element(screen.getByText('new', { exact: true })).toBeInTheDocument()
    await userEvent.fill(screen.getByLabelText('File editor'), 'todo')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await vi.waitFor(() => expect(mocks.writeFile).toHaveBeenCalledExactlyOnceWith(3, 'docs/notes.md', 'todo'))
  })

  it('lists changes with their status and opens a changed file', async () => {
    mocks.readFile.mockResolvedValueOnce({ path: 'README.md', content: 'x', size: 1 })
    const screen = await openPage()
    mocks.getChanges.mockResolvedValue([
      { path: 'README.md', status: 'modified' },
      { path: 'new.go', status: 'added' },
      { path: 'old.go', status: 'deleted' },
    ])
    await userEvent.click(screen.getByRole('tab', { name: /Changes/ }))
    const list = screen.getByRole('list', { name: 'Changes' })
    await expect.element(list).toHaveTextContent('Modified')
    await expect.element(list).toHaveTextContent('Added')
    await expect.element(list).toHaveTextContent('Deleted')
    expect(list.getByRole('button', { name: 'Open' }).elements()).toHaveLength(2) // a deleted file cannot be opened

    await userEvent.click(list.getByRole('button', { name: 'Open' }).first())
    await expect.element(screen.getByLabelText('File editor')).toHaveValue('x')
  })

  it('says so when nothing changed', async () => {
    const screen = await openPage()
    await userEvent.click(screen.getByRole('tab', { name: 'Changes' }))
    await expect.element(screen.getByText('No files have changed since this workspace was created.')).toBeInTheDocument()
  })

  it('downloads the project as a ZIP and reports a failure', async () => {
    const created: string[] = []
    vi.stubGlobal('URL', { ...URL, createObjectURL: (blob: Blob) => { created.push(String(blob.size)); return 'blob:test' }, revokeObjectURL: vi.fn() })
    mocks.exportWorkspace.mockResolvedValueOnce(new Blob(['zipdata'])).mockRejectedValueOnce(new Error('Workspace terlalu besar untuk diekspor.'))
    const screen = await openPage()
    await userEvent.click(screen.getByRole('button', { name: 'Download ZIP' }))
    await vi.waitFor(() => expect(created).toEqual(['7']))
    await userEvent.click(screen.getByRole('button', { name: 'Download ZIP' }))
    await vi.waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Workspace terlalu besar untuk diekspor.'))
  })

  it('shows an empty tree and a tree that failed to load', async () => {
    mocks.getWorkspace.mockResolvedValue(workspace)
    mocks.getChanges.mockResolvedValue([])
    mocks.getTree.mockResolvedValueOnce({ entries: [], truncated: false })
    const empty = await render(<WorkspaceDetailPage workspaceId={3} />)
    await expect.element(empty.getByText(/has no files yet/)).toBeInTheDocument()
    await empty.unmount()

    mocks.getTree.mockRejectedValueOnce(new Error('Workspace belum siap.')).mockResolvedValueOnce({ entries, truncated: true })
    const failed = await render(<WorkspaceDetailPage workspaceId={3} />)
    await expect.element(failed.getByRole('alert')).toHaveTextContent('Workspace belum siap.')
    await userEvent.click(failed.getByRole('button', { name: 'Try again' }))
    await expect.element(failed.getByRole('button', { name: 'README.md' })).toBeInTheDocument()
    await expect.element(failed.getByText('The list is shortened. Open a folder path to see more.')).toBeInTheDocument()
  })

  it('says the workspace cannot be opened when it is missing or not the user\'s', async () => {
    mocks.getWorkspace.mockRejectedValue(new Error('Workspace tidak ditemukan.'))
    const screen = await render(<WorkspaceDetailPage workspaceId={99} />)
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Workspace tidak ditemukan.')
    await expect.element(screen.getByRole('link', { name: 'Back to workspaces' })).toBeInTheDocument()
    expect(mocks.getTree).not.toHaveBeenCalled()
    expect(mocks.readFile).not.toHaveBeenCalled()
  })

  it('has a console tab that shows the sandbox is off', async () => {
    const screen = await openPage()
    await userEvent.click(screen.getByRole('tab', { name: 'Console' }))
    await expect.element(screen.getByTestId('execution-disabled')).toBeInTheDocument()
  })
})
