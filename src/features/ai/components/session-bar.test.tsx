import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import { SessionBar, type SessionStatus } from './session-bar'

describe('SessionBar', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('names the screen with one heading and holds the session controls', async () => {
    const screen = await render(
      <SessionBar status='ready' onNewChat={vi.fn()}>
        <button type='button'>Coding Agent</button>
        <select aria-label='Cloud workspace'>
          <option>Portfolio test</option>
        </select>
      </SessionBar>
    )
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Agentic' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Coding Agent' })).toBeInTheDocument()
    await expect.element(screen.getByLabelText('Cloud workspace')).toBeInTheDocument()
  })

  it('says how the session stands, in words, for every state', async () => {
    const words: Record<SessionStatus, string> = { ready: 'Ready', working: 'Working', chooseAgent: 'Choose an agent', chooseModel: 'Choose a model' }
    for (const [status, text] of Object.entries(words)) {
      const screen = await render(
        <SessionBar status={status as SessionStatus} onNewChat={vi.fn()}>
          {null}
        </SessionBar>
      )
      const line = screen.getByTestId('session-status')
      await expect.element(line).toHaveTextContent(text)
      expect(line.element().getAttribute('data-status')).toBe(status)
      await screen.unmount()
    }
  })

  it('starts a new chat, unless a run is in progress', async () => {
    const onNewChat = vi.fn()
    const screen = await render(
      <SessionBar status='ready' onNewChat={onNewChat}>
        {null}
      </SessionBar>
    )
    await userEvent.click(screen.getByRole('button', { name: 'New Chat' }))
    expect(onNewChat).toHaveBeenCalledOnce()
    await screen.unmount()

    const busy = await render(
      <SessionBar status='working' onNewChat={onNewChat} newChatDisabled>
        {null}
      </SessionBar>
    )
    await expect.element(busy.getByRole('button', { name: 'New Chat' })).toBeDisabled()
  })
})
