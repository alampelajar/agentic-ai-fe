import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import { GitHubPublishButton } from './github-publish-dialog'
import type { Workspace } from './data/api'

const api = vi.hoisted(() => ({ getChanges: vi.fn(), publishToGitHub: vi.fn() }))
vi.mock('./data/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('./data/api')>()), ...api }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const workspace = {
  id: 7, name: 'Porto', github_owner: 'alampelajar', github_repo: 'dumi-test', base_branch: 'main', base_sha: 'abc',
} as unknown as Workspace

const outcome = (extra: Partial<{ base_moved: boolean; pull_request_url: string; pull_request_error: string }> = {}) => ({
  repository: 'alampelajar/dumi-test',
  file_count: 2,
  result: { branch: 'agentic/porto-1', commit_sha: 'c1', commit_url: 'https://github.com/x/commit/c1', pull_request_url: 'https://github.com/x/pull/3', base_moved: false, ...extra },
})

async function openDialog() {
  const screen = await render(<GitHubPublishButton workspace={workspace} />)
  await userEvent.click(screen.getByRole('button', { name: 'Send to GitHub' }))
  return screen
}

describe('GitHubPublishButton', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.clearAllMocks()
  })

  it('lists the changed files and names the repository and base branch', async () => {
    api.getChanges.mockResolvedValue([{ path: 'README.md', status: 'modified' }, { path: 'old.txt', status: 'deleted' }])
    const screen = await openDialog()
    await expect.element(screen.getByText('README.md')).toBeInTheDocument()
    await expect.element(screen.getByText('old.txt')).toBeInTheDocument()
    await expect.element(screen.getByText(/new branch of alampelajar\/dumi-test, with a pull request into main/)).toBeInTheDocument()
  })

  it('sends only once there is a commit message, with the chosen options', async () => {
    api.getChanges.mockResolvedValue([{ path: 'README.md', status: 'modified' }])
    api.publishToGitHub.mockResolvedValue(outcome())
    const screen = await openDialog()
    const send = screen.getByRole('button', { name: 'Send', exact: true })
    await expect.element(send).toBeDisabled()

    await userEvent.fill(screen.getByLabelText('Commit message'), 'Update README')
    await userEvent.fill(screen.getByLabelText('New branch'), 'agentic/readme')
    await userEvent.click(send)

    expect(api.publishToGitHub).toHaveBeenCalledWith(7, { branch: 'agentic/readme', message: 'Update README', create_pr: true, pr_title: '', pr_body: '' })
    await expect.element(screen.getByRole('link', { name: /Open the pull request/ })).toHaveAttribute('href', 'https://github.com/x/pull/3')
    await expect.element(screen.getByText('2 file(s) sent to the new branch agentic/porto-1.')).toBeInTheDocument()
  })

  it('warns when the base branch moved, and when the pull request could not be opened', async () => {
    api.getChanges.mockResolvedValue([{ path: 'a.txt', status: 'added' }])
    api.publishToGitHub.mockResolvedValue(outcome({ base_moved: true, pull_request_url: '', pull_request_error: 'the branch was pushed, but GitHub did not open the pull request' }))
    const screen = await openDialog()
    await userEvent.fill(screen.getByLabelText('Commit message'), 'Add a')
    await userEvent.click(screen.getByRole('button', { name: 'Send', exact: true }))

    await expect.element(screen.getByText(/main has new commits on GitHub since the import/)).toBeInTheDocument()
    await expect.element(screen.getByRole('alert')).toHaveTextContent('did not open the pull request')
  })

  it('shows the server message when sending fails, and keeps the form', async () => {
    api.getChanges.mockResolvedValue([{ path: 'a.txt', status: 'added' }])
    api.publishToGitHub.mockRejectedValue(new Error('a branch with this name already exists on GitHub: choose another name'))
    const screen = await openDialog()
    await userEvent.fill(screen.getByLabelText('Commit message'), 'Add a')
    await userEvent.click(screen.getByRole('button', { name: 'Send', exact: true }))

    await expect.element(screen.getByRole('alert')).toHaveTextContent('already exists')
    await expect.element(screen.getByLabelText('Commit message')).toHaveValue('Add a')
  })

  it('cannot send when nothing changed', async () => {
    api.getChanges.mockResolvedValue([])
    const screen = await openDialog()
    await expect.element(screen.getByText('There are no changes since the import.')).toBeInTheDocument()
    await userEvent.fill(screen.getByLabelText('Commit message'), 'Nothing')
    await expect.element(screen.getByRole('button', { name: 'Send', exact: true })).toBeDisabled()
  })
})
