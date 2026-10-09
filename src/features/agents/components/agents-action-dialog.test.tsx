import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { type Agent } from '../data/schema'
import { AgentsActionDialog } from './agents-action-dialog'

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

describe('AgentsActionDialog', () => {
  it('renders fields for creating an agent', async () => {
    const screen = await render(
      <AgentsActionDialog open onOpenChange={vi.fn()} />
    )

    await expect.element(screen.getByRole('heading', { name: 'New Agent' })).toBeInTheDocument()
    await expect.element(screen.getByRole('textbox', { name: 'Agent Name' })).toBeInTheDocument()
    await expect.element(screen.getByRole('textbox', { name: 'Model' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Save Agent' })).toBeInTheDocument()
  })

  it('prefills fields when editing an agent', async () => {
    const screen = await render(
      <AgentsActionDialog open currentRow={AGENT} onOpenChange={vi.fn()} />
    )

    await expect.element(screen.getByRole('heading', { name: 'Edit Agent' })).toBeInTheDocument()
    await expect.element(screen.getByRole('textbox', { name: 'Agent Name' })).toHaveValue(AGENT.name)
    await expect.element(screen.getByRole('textbox', { name: 'Model' })).toHaveValue(AGENT.model)
  })
})
