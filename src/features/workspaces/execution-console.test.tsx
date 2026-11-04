import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import type { ExecutionJob } from './data/api'
import { ExecutionConsole, POLL_INTERVAL_MS } from './execution-console'

const mocks = vi.hoisted(() => ({ getExecutions: vi.fn(), startExecution: vi.fn(), cancelExecution: vi.fn(), toastError: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: vi.fn() } }))
vi.mock('./data/api', async (importActual) => ({
  ...(await importActual<typeof import('./data/api')>()),
  getExecutions: mocks.getExecutions,
  startExecution: mocks.startExecution,
  cancelExecution: mocks.cancelExecution,
}))

const job = (overrides: Partial<ExecutionJob> = {}): ExecutionJob => ({
  id: 1,
  workspace_id: 3,
  job_type: 'go-test',
  command: 'go test ./...',
  runtime: 'go',
  status: 'completed',
  cancel_requested: false,
  exit_code: 0,
  stdout: 'PASS\nok  example 0.1s',
  stderr: '',
  error: '',
  timeout_seconds: 180,
  duration_ms: 2500,
  created_at: '2026-11-03T10:00:00Z',
  started_at: '2026-11-03T10:00:01Z',
  completed_at: '2026-11-03T10:00:03Z',
  ...overrides,
})

describe('Execution console', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    await i18n.changeLanguage('en')
  })
  afterEach(() => vi.useRealTimers())

  it('lists jobs and shows the command, status, exit code, duration and output of the selected one', async () => {
    mocks.getExecutions.mockResolvedValueOnce({
      executionEnabled: true,
      jobs: [job(), job({ id: 2, command: 'go build ./...', status: 'failed', exit_code: 2, stdout: '', stderr: 'main.go:3: undefined: x', error: '', duration_ms: 800 })],
    })
    const screen = await render(<ExecutionConsole workspaceId={3} />)
    await expect.element(screen.getByTestId('job-detail')).toHaveTextContent('go test ./...')
    await expect.element(screen.getByTestId('job-detail')).toHaveTextContent('exit code 0')
    await expect.element(screen.getByTestId('job-detail')).toHaveTextContent('2.5 s')
    await expect.element(screen.getByTestId('job-stdout')).toHaveTextContent('PASS')

    await userEvent.click(screen.getByTestId('job-item').nth(1))
    await expect.element(screen.getByTestId('job-detail')).toHaveTextContent('go build ./...')
    await expect.element(screen.getByTestId('job-stderr')).toHaveTextContent('undefined: x')
    await expect.element(screen.getByTestId('job-detail')).toHaveTextContent('exit code 2')
  })

  it('shows empty, loading and error states', async () => {
    let finish!: (value: unknown) => void
    mocks.getExecutions.mockReturnValueOnce(new Promise((done) => { finish = done }))
    const screen = await render(<ExecutionConsole workspaceId={3} />)
    await expect.element(screen.getByText('Loading jobs...')).toBeInTheDocument()
    finish({ jobs: [], executionEnabled: true })
    await expect.element(screen.getByText(/No jobs yet/)).toBeInTheDocument()
    await screen.unmount()

    mocks.getExecutions.mockRejectedValueOnce(new Error('Workspace tidak ditemukan.')).mockResolvedValueOnce({ jobs: [job()], executionEnabled: true })
    const failed = await render(<ExecutionConsole workspaceId={3} />)
    await expect.element(failed.getByText('Jobs could not be loaded')).toBeInTheDocument()
    await expect.element(failed.getByText('Workspace tidak ditemukan.')).toBeInTheDocument()
    await userEvent.click(failed.getByRole('button', { name: 'Try again' }))
    await expect.element(failed.getByTestId('job-detail')).toBeInTheDocument()
  })

  it('says when running code is not turned on, and does not let the user try', async () => {
    mocks.getExecutions.mockResolvedValueOnce({ jobs: [], executionEnabled: false })
    const screen = await render(<ExecutionConsole workspaceId={3} />)
    await expect.element(screen.getByTestId('execution-disabled')).toHaveTextContent('not turned on')
    await expect.element(screen.getByRole('button', { name: 'Run' })).toBeDisabled()
    expect(mocks.startExecution).not.toHaveBeenCalled()
  })

  it('starts the chosen command and selects the new job', async () => {
    mocks.getExecutions.mockResolvedValueOnce({ jobs: [], executionEnabled: true }).mockResolvedValue({ jobs: [job({ id: 9, command: 'npm run build', status: 'queued', exit_code: null, stdout: '' })], executionEnabled: true })
    mocks.startExecution.mockResolvedValueOnce(job({ id: 9, status: 'queued' }))
    const screen = await render(<ExecutionConsole workspaceId={3} />)
    await userEvent.selectOptions(screen.getByLabelText('Command'), 'npm-build')
    await userEvent.click(screen.getByRole('button', { name: 'Run' }))
    await vi.waitFor(() => expect(mocks.startExecution).toHaveBeenCalledExactlyOnceWith(3, 'npm-build'))
    await expect.element(screen.getByTestId('job-detail')).toHaveTextContent('npm run build')
    await expect.element(screen.getByTestId('job-detail')).toHaveTextContent('Queued')
  })

  it('offers the install commands, explains them, and starts the one chosen', async () => {
    mocks.getExecutions.mockResolvedValue({ jobs: [], executionEnabled: true })
    mocks.startExecution.mockResolvedValueOnce(job({ id: 4, job_type: 'npm-install', command: 'npm install --ignore-scripts', status: 'queued', exit_code: null, stdout: '' }))
    const screen = await render(<ExecutionConsole workspaceId={3} />)
    await expect.element(screen.getByTestId('install-hint')).not.toBeInTheDocument()
    for (const label of ['Go: install dependencies', 'Node: install dependencies', 'Python: install dependencies']) {
      await expect.element(screen.getByRole('option', { name: label })).toBeInTheDocument()
    }
    await userEvent.selectOptions(screen.getByLabelText('Command'), 'npm-install')
    await expect.element(screen.getByTestId('install-hint')).toHaveTextContent(/package registries only and runs no project scripts/)
    await userEvent.click(screen.getByRole('button', { name: 'Run' }))
    await vi.waitFor(() => expect(mocks.startExecution).toHaveBeenCalledExactlyOnceWith(3, 'npm-install'))
    await userEvent.selectOptions(screen.getByLabelText('Command'), 'go-test')
    await expect.element(screen.getByTestId('install-hint')).not.toBeInTheDocument()
  })

  it('shows the reason when a job cannot be started', async () => {
    mocks.getExecutions.mockResolvedValue({ jobs: [], executionEnabled: true })
    mocks.startExecution.mockRejectedValueOnce(new Error('this workspace has no go.mod'))
    const screen = await render(<ExecutionConsole workspaceId={3} />)
    await userEvent.click(screen.getByRole('button', { name: 'Run' }))
    await expect.element(screen.getByRole('alert')).toHaveTextContent('no go.mod')
    await expect.element(screen.getByRole('button', { name: 'Run' })).toBeEnabled()
  })

  it('cancels a running job', async () => {
    mocks.getExecutions
      .mockResolvedValueOnce({ jobs: [job({ status: 'running', exit_code: null, stdout: 'working' })], executionEnabled: true })
      .mockResolvedValue({ jobs: [job({ status: 'running', cancel_requested: true, exit_code: null, stdout: 'working' })], executionEnabled: true })
    mocks.cancelExecution.mockResolvedValueOnce(job({ status: 'running', cancel_requested: true, exit_code: null }))
    const screen = await render(<ExecutionConsole workspaceId={3} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await vi.waitFor(() => expect(mocks.cancelExecution).toHaveBeenCalledExactlyOnceWith(1))
    await expect.element(screen.getByRole('button', { name: 'Cancelling...' })).toBeDisabled()
  })

  it('offers no cancel button for a finished job', async () => {
    mocks.getExecutions.mockResolvedValueOnce({ jobs: [job()], executionEnabled: true })
    const screen = await render(<ExecutionConsole workspaceId={3} />)
    await expect.element(screen.getByTestId('job-detail')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })

  it('refreshes a running job until it finishes, then stops polling and leaves no timer', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
    mocks.getExecutions
      .mockResolvedValueOnce({ jobs: [job({ status: 'running', exit_code: null, stdout: 'step 1' })], executionEnabled: true })
      .mockResolvedValueOnce({ jobs: [job({ status: 'running', exit_code: null, stdout: 'step 1\nstep 2' })], executionEnabled: true })
      .mockResolvedValue({ jobs: [job({ status: 'completed', stdout: 'step 1\nstep 2\ndone' })], executionEnabled: true })
    const screen = await render(<ExecutionConsole workspaceId={3} />)
    await expect.element(screen.getByTestId('job-stdout')).toHaveTextContent('step 1')
    expect(vi.getTimerCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    await expect.element(screen.getByTestId('job-stdout')).toHaveTextContent('step 2')
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    await expect.element(screen.getByTestId('job-stdout')).toHaveTextContent('done')
    await expect.element(screen.getByTestId('job-detail')).toHaveTextContent('Completed')
    expect(vi.getTimerCount()).toBe(0) // nothing left to poll

    const calls = mocks.getExecutions.mock.calls.length
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5)
    expect(mocks.getExecutions.mock.calls.length).toBe(calls)
  })

  it('stops polling when the console is closed', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
    mocks.getExecutions.mockResolvedValue({ jobs: [job({ status: 'running', exit_code: null })], executionEnabled: true })
    const screen = await render(<ExecutionConsole workspaceId={3} />)
    await expect.element(screen.getByTestId('job-detail')).toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(1)
    await screen.unmount()
    expect(vi.getTimerCount()).toBe(0)
    const calls = mocks.getExecutions.mock.calls.length
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)
    expect(mocks.getExecutions.mock.calls.length).toBe(calls)
  })

  it('a refresh that fails while polling does not replace the output on screen', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
    mocks.getExecutions
      .mockResolvedValueOnce({ jobs: [job({ status: 'running', exit_code: null, stdout: 'still here' })], executionEnabled: true })
      .mockRejectedValue(new Error('offline'))
    const screen = await render(<ExecutionConsole workspaceId={3} />)
    await expect.element(screen.getByTestId('job-stdout')).toHaveTextContent('still here')
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2)
    await expect.element(screen.getByTestId('job-stdout')).toHaveTextContent('still here')
    expect(screen.getByText('Jobs could not be loaded').elements()).toHaveLength(0)
  })
})
