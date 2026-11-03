import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import { buildDelegationContext, DELEGATION_CONTEXT_MAX } from './data/api'
import { DelegateDialog } from './delegate-dialog'

const mocks = vi.hoisted(() => ({ delegateToAgent: vi.fn(), getDelegationAgents: vi.fn() }))
vi.mock('./data/api', async (importActual) => ({
  ...(await importActual<typeof import('./data/api')>()),
  delegateToAgent: mocks.delegateToAgent,
  getDelegationAgents: mocks.getDelegationAgents,
}))

const agents = [
  { id: 7, name: 'Coding Agent' },
  { id: 8, name: 'Testing Agent' },
  { id: 9, name: 'Review Agent' },
]

async function openDialog(overrides: Partial<React.ComponentProps<typeof DelegateDialog>> = {}) {
  const onDelegated = vi.fn()
  const onOpenChange = vi.fn()
  const screen = await render(
    <DelegateDialog
      open
      onOpenChange={onOpenChange}
      currentAgentId={7}
      taskId={42}
      defaultInstruction='Review the login flow'
      context={'User: we use JWT\nAgent: noted'}
      onDelegated={onDelegated}
      {...overrides}
    />
  )
  return { screen, onDelegated, onOpenChange }
}

describe('Delegate dialog', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    mocks.getDelegationAgents.mockResolvedValue(agents)
    await i18n.changeLanguage('en')
  })

  it('offers the other agents but not the one the user is talking to', async () => {
    const { screen } = await openDialog()
    await expect.element(screen.getByRole('option', { name: 'Testing Agent' })).toBeInTheDocument()
    await expect.element(screen.getByRole('option', { name: 'Review Agent' })).toBeInTheDocument()
    await expect.element(screen.getByRole('option', { name: 'Coding Agent' })).not.toBeInTheDocument()
  })

  it('starts with the draft message as the instruction', async () => {
    const { screen } = await openDialog()
    await expect.element(screen.getByLabelText('What should it do?')).toHaveValue('Review the login flow')
  })

  it('sends the target, source, task, instruction and conversation, then reports the answer', async () => {
    mocks.delegateToAgent.mockResolvedValueOnce({ message: 'Looks fine.', delegation: { id: 1, to_agent_id: 8, status: 'completed', duration_ms: 5 } })
    const { screen, onDelegated } = await openDialog()
    await expect.element(screen.getByRole('option', { name: 'Testing Agent' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Agent', { exact: true }), '8')
    await userEvent.click(screen.getByRole('button', { name: 'Delegate' }))

    await vi.waitFor(() => expect(mocks.delegateToAgent).toHaveBeenCalledTimes(1))
    expect(mocks.delegateToAgent).toHaveBeenCalledWith({
      to_agent_id: 8,
      from_agent_id: 7,
      task_id: 42,
      instruction: 'Review the login flow',
      context: 'User: we use JWT\nAgent: noted',
    })
    expect(Object.keys(mocks.delegateToAgent.mock.calls[0][0])).not.toContain('user_id')
    await vi.waitFor(() => expect(onDelegated).toHaveBeenCalledExactlyOnceWith({ agent: { id: 8, name: 'Testing Agent' }, message: 'Looks fine.' }))
  })

  it('leaves the conversation out when the user unticks it', async () => {
    mocks.delegateToAgent.mockResolvedValueOnce({ message: 'ok', delegation: { id: 1, to_agent_id: 8, status: 'completed', duration_ms: 1 } })
    const { screen } = await openDialog()
    await expect.element(screen.getByRole('option', { name: 'Testing Agent' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Agent', { exact: true }), '8')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Delegate' }))
    await vi.waitFor(() => expect(mocks.delegateToAgent).toHaveBeenCalledTimes(1))
    expect(mocks.delegateToAgent.mock.calls[0][0].context).toBe('')
  })

  it('does not offer the conversation when there is none', async () => {
    const { screen } = await openDialog({ context: '' })
    await expect.element(screen.getByRole('checkbox')).toBeDisabled()
    await expect.element(screen.getByText('There is no conversation yet.')).toBeInTheDocument()
  })

  it('checks the form before sending anything', async () => {
    const { screen } = await openDialog({ defaultInstruction: '' })
    await expect.element(screen.getByRole('option', { name: 'Testing Agent' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delegate' }))
    await expect.element(screen.getByText('Choose which agent should do this.')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Agent', { exact: true }), '8')
    await userEvent.click(screen.getByRole('button', { name: 'Delegate' }))
    await expect.element(screen.getByText('Describe what the other agent should do.')).toBeInTheDocument()
    expect(mocks.delegateToAgent).not.toHaveBeenCalled()
  })

  it('keeps the dialog open and shows the server message when the delegation fails', async () => {
    mocks.delegateToAgent.mockRejectedValueOnce(new Error('Terlalu banyak delegasi. Coba lagi sebentar lagi.'))
    const { screen, onDelegated } = await openDialog()
    await expect.element(screen.getByRole('option', { name: 'Testing Agent' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Agent', { exact: true }), '8')
    await userEvent.click(screen.getByRole('button', { name: 'Delegate' }))

    await expect.element(screen.getByRole('alert')).toHaveTextContent('Terlalu banyak delegasi')
    await expect.element(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onDelegated).not.toHaveBeenCalled()
    await expect.element(screen.getByRole('button', { name: 'Delegate' })).toBeEnabled() // can try again
  })

  it('cannot be sent twice while waiting for the answer', async () => {
    let finish!: (value: unknown) => void
    mocks.delegateToAgent.mockReturnValueOnce(new Promise((done) => { finish = done }))
    const { screen, onDelegated } = await openDialog()
    await expect.element(screen.getByRole('option', { name: 'Testing Agent' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Agent', { exact: true }), '8')
    await userEvent.click(screen.getByRole('button', { name: 'Delegate' }))

    await expect.element(screen.getByRole('button', { name: 'Waiting for the answer...' })).toBeDisabled()
    expect(mocks.delegateToAgent).toHaveBeenCalledTimes(1)
    finish({ message: 'done', delegation: { id: 1, to_agent_id: 8, status: 'completed', duration_ms: 1 } })
    await vi.waitFor(() => expect(onDelegated).toHaveBeenCalledTimes(1))
  })

  it('says when agents cannot be loaded, or when there is no other agent', async () => {
    mocks.getDelegationAgents.mockRejectedValueOnce(new Error('Agent gagal dimuat.'))
    const failed = await openDialog()
    await expect.element(failed.screen.getByRole('alert')).toHaveTextContent('Agent gagal dimuat.')
    await failed.screen.unmount()

    mocks.getDelegationAgents.mockResolvedValueOnce([{ id: 7, name: 'Coding Agent' }])
    const alone = await openDialog()
    await expect.element(alone.screen.getByText('You have no other agent to delegate to.')).toBeInTheDocument()
    await expect.element(alone.screen.getByRole('button', { name: 'Delegate' })).toBeDisabled()
  })

  it('is shown in Indonesian when that is the language', async () => {
    await i18n.changeLanguage('id')
    const { screen } = await openDialog()
    await expect.element(screen.getByRole('button', { name: 'Delegasikan' })).toBeInTheDocument()
    await expect.element(screen.getByText('Apa yang harus dikerjakan?')).toBeInTheDocument()
    await i18n.changeLanguage('en')
  })

  it('has the same text keys in English and Indonesian', async () => {
    const en = (await import('@/i18n/locales/en.json')).default.delegation
    const id = (await import('@/i18n/locales/id.json')).default.delegation
    const keys = (value: unknown, prefix = ''): string[] =>
      Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => (typeof child === 'object' && child !== null ? keys(child, `${prefix}${key}.`) : [`${prefix}${key}`]))
    expect(keys(id).sort()).toEqual(keys(en).sort())
  })
})

describe('buildDelegationContext', () => {
  it('labels the last few messages and skips empty ones', () => {
    const text = buildDelegationContext([
      { role: 'user', content: 'one' },
      { role: 'agent', content: '   ' },
      { role: 'agent', content: 'two' },
    ])
    expect(text).toBe('User: one\nAgent: two')
  })

  it('keeps only the most recent messages', () => {
    const many = Array.from({ length: 10 }, (_, index) => ({ role: 'user' as const, content: `message ${index}` }))
    const text = buildDelegationContext(many, 3)
    expect(text).toBe('User: message 7\nUser: message 8\nUser: message 9')
  })

  it('stays within the size the server accepts, keeping the newest text', () => {
    const big = Array.from({ length: 6 }, (_, index) => ({ role: 'agent' as const, content: `${index}`.repeat(2000) }))
    const text = buildDelegationContext(big)
    expect(text.length).toBeLessThanOrEqual(DELEGATION_CONTEXT_MAX)
    expect(text.endsWith('5'.repeat(100))).toBe(true)
  })

  it('is empty for an empty conversation', () => {
    expect(buildDelegationContext([])).toBe('')
  })
})
