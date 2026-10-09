import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { type Agent } from '../data/schema'
import { AgentsDeleteDialog } from './agents-delete-dialog'

vi.mock('@/lib/show-submitted-data', () => ({ showSubmittedData: vi.fn() }))

const AGENT: Agent = {
  id: 'agent-1',
  name: 'Coding Agent',
  provider: 'OpenAI',
  model: 'gpt-4o',
  status: 'running',
  tasks: 3,
  responseTime: '120ms',
  createdAt: '2026-10-09',
}

describe('AgentsDeleteDialog', () => {
  it('requires the agent name before enabling deletion', async () => {
    const onOpenChange = vi.fn()
    const screen = await render(
      <AgentsDeleteDialog open onOpenChange={onOpenChange} currentRow={AGENT} />
    )

    const input = screen.getByRole('textbox', { name: 'Agent Name' })
    const deleteButton = screen.getByRole('button', { name: 'Delete' })

    await expect.element(screen.getByRole('heading', { name: /Delete Agent/i })).toBeInTheDocument()
    await expect.element(deleteButton).toBeDisabled()
    await userEvent.fill(input, AGENT.name)
    await expect.element(deleteButton).toBeEnabled()
    await userEvent.click(deleteButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(showSubmittedData).toHaveBeenCalledWith(
      AGENT,
      'The following AI Agent has been deleted:'
    )
  })
})
