import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import { GitHubCard } from './github-card'

const api = vi.hoisted(() => ({
  getGitHubConnection: vi.fn(),
  startGitHubConnect: vi.fn(),
  disconnectGitHub: vi.fn(),
}))
vi.mock('@/lib/api-github', () => api)
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('sonner', () => ({ toast: toasts }))

describe('GitHubCard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/')
  })

  it('says so when the server has no GitHub OAuth App configured', async () => {
    api.getGitHubConnection.mockResolvedValue({ configured: false, connected: false })
    const screen = await render(<GitHubCard />)
    await expect.element(screen.getByText(/GitHub is not set up on this server/)).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Connect GitHub' })).not.toBeInTheDocument()
  })

  it('sends the browser to GitHub when the user connects', async () => {
    api.getGitHubConnection.mockResolvedValue({ configured: true, connected: false })
    api.startGitHubConnect.mockResolvedValue('https://github.com/login/oauth/authorize?state=abc')
    const goTo = vi.fn()
    const screen = await render(<GitHubCard goTo={goTo} />)

    await userEvent.click(screen.getByRole('button', { name: 'Connect GitHub' }))
    await vi.waitFor(() => expect(goTo).toHaveBeenCalledWith('https://github.com/login/oauth/authorize?state=abc'))
  })

  it('shows the connected account and disconnects', async () => {
    api.getGitHubConnection.mockResolvedValue({ configured: true, connected: true, githubLogin: 'rina', scope: 'repo', connectedAt: '' })
    api.disconnectGitHub.mockResolvedValue(undefined)
    const screen = await render(<GitHubCard />)

    await expect.element(screen.getByText('@rina')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(api.disconnectGitHub).toHaveBeenCalledTimes(1)
    await expect.element(screen.getByRole('button', { name: 'Connect GitHub' })).toBeInTheDocument()
    expect(toasts.success).toHaveBeenCalledWith('GitHub disconnected.')
  })

  it('reports the result GitHub put in the address, then cleans the address', async () => {
    window.history.replaceState(null, '', '/settings/integrations?github=connected')
    api.getGitHubConnection.mockResolvedValue({ configured: true, connected: true, githubLogin: 'rina', scope: 'repo', connectedAt: '' })
    await render(<GitHubCard />)

    await vi.waitFor(() => expect(toasts.success).toHaveBeenCalledWith('GitHub connected.'))
    expect(window.location.search).toBe('')
  })

  it('tells the user when the status cannot be read', async () => {
    api.getGitHubConnection.mockRejectedValue(new Error('down'))
    const screen = await render(<GitHubCard />)
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Could not read the GitHub status')
  })
})
