import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { AgentsInviteDialog } from './agents-invite-dialog'

describe('AgentsInviteDialog', () => {
  it('renders the agent deployment form', async () => {
    const screen = await render(
      <AgentsInviteDialog open onOpenChange={vi.fn()} />
    )

    await expect.element(screen.getByRole('heading', { name: 'Deploy Agent' })).toBeInTheDocument()
    await expect.element(screen.getByRole('combobox', { name: 'Provider' })).toBeInTheDocument()
    await expect.element(screen.getByRole('textbox', { name: 'Model' })).toBeInTheDocument()
    await expect.element(screen.getByRole('textbox', { name: 'Description' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Deploy' })).toBeInTheDocument()
  })
})
