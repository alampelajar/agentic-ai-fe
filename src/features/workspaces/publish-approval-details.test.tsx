import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import { parseCloudToolCall } from './tool-runner'
import { WorkspaceApprovalDialog } from './workspace-approval-dialog'
import type { ToolApproval } from './data/api'

const approval = (extra: Record<string, unknown> = {}): ToolApproval => ({
  id: 'wsa-1',
  tool: 'workspace.publish',
  workspace_id: 3,
  workspace_name: 'Porto',
  summary: 'Send 3 changed file(s) to GitHub alampelajar/dumi-test on the new branch agentic/readme, with a pull request into main',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  arguments: {
    repository: 'alampelajar/dumi-test',
    base_branch: 'main',
    branch: 'agentic/readme',
    pull_request: true,
    message: 'Update README',
    file_count: 3,
    files: [
      { path: 'README.md', status: 'changed' },
      { path: 'old.txt', status: 'deleted' },
    ],
    ...extra,
  },
})

describe('publish approval', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows where the changes go, the message and the files, before anything is sent', async () => {
    const onDecision = vi.fn()
    const screen = await render(<WorkspaceApprovalDialog approval={approval()} agentName='Coding' onDecision={onDecision} />)
    const details = screen.getByTestId('publish-approval')

    await expect.element(details).toHaveTextContent('alampelajar/dumi-test')
    await expect.element(details).toHaveTextContent('agentic/readme')
    await expect.element(details).toHaveTextContent('Yes, into main')
    await expect.element(details).toHaveTextContent('Update README')
    await expect.element(details).toHaveTextContent('README.md')
    await expect.element(details).toHaveTextContent('old.txt')
    await expect.element(details).toHaveTextContent('3 file(s) will be sent')
    await expect.element(details).toHaveTextContent('and 1 more')
    expect(onDecision).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Allow once' }))
    expect(onDecision).toHaveBeenCalledWith('allow')
  })

  it('says when no pull request will be opened', async () => {
    const screen = await render(<WorkspaceApprovalDialog approval={approval({ pull_request: false })} agentName='Coding' onDecision={vi.fn()} />)
    await expect.element(screen.getByTestId('publish-approval')).toHaveTextContent('No, only the branch')
  })

  it('does not show publish details for other tools', async () => {
    const write = { ...approval(), tool: 'workspace.write_file', arguments: { path: 'a.txt', content_preview: 'x', content_characters: 1 } }
    const screen = await render(<WorkspaceApprovalDialog approval={write} agentName='Coding' onDecision={vi.fn()} />)
    await expect.element(screen.getByTestId('publish-approval')).not.toBeInTheDocument()
  })

  it('reads a workspace.publish call from the model', () => {
    expect(parseCloudToolCall('{"action":"workspace.publish","arguments":{"message":"Update README"}}', true)).toEqual({ tool: 'workspace.publish', args: { message: 'Update README' } })
  })
})
