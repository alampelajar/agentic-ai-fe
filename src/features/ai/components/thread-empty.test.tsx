import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import { ThreadEmpty } from './thread-empty'

const agent = { name: 'Coding Agent' }
const model = { name: 'cohere/north-mini-code:free', provider: { name: 'OpenRouter' } }

describe('ThreadEmpty', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('asks for an agent first, then for a model, and offers nothing else yet', async () => {
    const first = await render(<ThreadEmpty agent={null} model={null} workspaceName={null} onPick={vi.fn()} />)
    await expect.element(first.getByRole('heading', { name: 'Choose an agent to begin' })).toBeInTheDocument()
    await expect.element(first.getByText(/Each agent has a role/)).toBeInTheDocument()
    expect(first.container.querySelectorAll('button').length).toBe(0)
    await first.unmount()

    const second = await render(<ThreadEmpty agent={agent} model={null} workspaceName={null} onPick={vi.fn()} />)
    await expect.element(second.getByRole('heading', { name: 'Choose a model for Coding Agent' })).toBeInTheDocument()
    expect(second.container.querySelectorAll('button').length).toBe(0)
  })

  it('spells out the session once it is set up, and says plainly when there is no workspace', async () => {
    const screen = await render(<ThreadEmpty agent={agent} model={model} workspaceName={null} onPick={vi.fn()} />)
    await expect.element(screen.getByRole('heading', { name: 'What should Coding Agent work on?' })).toBeInTheDocument()
    const facts = screen.getByTestId('thread-empty')
    await expect.element(facts).toHaveTextContent('cohere/north-mini-code:free')
    await expect.element(facts).toHaveTextContent('OpenRouter')
    await expect.element(facts).toHaveTextContent('cannot read or change files')
    // Without a workspace there is nothing to propose work on.
    expect(screen.container.querySelectorAll('button').length).toBe(0)
  })

  it('explains the approval rule and offers starting tasks when a workspace is selected', async () => {
    const onPick = vi.fn()
    const screen = await render(<ThreadEmpty agent={agent} model={model} workspaceName='Portfolio test' onPick={onPick} />)
    const facts = screen.getByTestId('thread-empty')
    await expect.element(facts).toHaveTextContent('Portfolio test')
    await expect.element(facts).toHaveTextContent('asks for your approval first')
    expect(screen.container.querySelectorAll('button').length).toBe(3)
    await userEvent.click(screen.getByRole('button', { name: 'Describe the structure of this project.' }))
    expect(onPick).toHaveBeenCalledExactlyOnceWith('Describe the structure of this project.')
  })

  it('speaks Indonesian when the language is Indonesian', async () => {
    await i18n.changeLanguage('id')
    const screen = await render(<ThreadEmpty agent={null} model={null} workspaceName={null} onPick={vi.fn()} />)
    await expect.element(screen.getByRole('heading', { name: 'Pilih agen untuk memulai' })).toBeInTheDocument()
  })
})
