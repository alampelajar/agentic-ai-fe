import { beforeEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import i18n from '@/i18n'
import { RunProgress } from './run-progress'

describe('RunProgress', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows nothing before anything has run', async () => {
    const screen = await render(<RunProgress phase={null} trail={[]} startedAt={null} running={false} />)
    expect(screen.container.querySelector('[data-testid=run-progress]')).toBeNull()
  })

  it('says what the agent is doing right now, with the file it works on', async () => {
    const screen = await render(
      <RunProgress phase={{ kind: 'tool', tool: 'workspace.edit_file', detail: 'index.html' }} trail={[]} startedAt={Date.now()} running agentName='Coding Agent' />
    )
    await expect.element(screen.getByRole('status')).toHaveTextContent('Editing index.html')
    expect(screen.getByTestId('run-progress').element().getAttribute('data-motion')).toBe('working')
  })

  it('names the agent while the model thinks', async () => {
    const screen = await render(<RunProgress phase={{ kind: 'thinking' }} trail={[]} startedAt={Date.now()} running agentName='Coding Agent' />)
    await expect.element(screen.getByRole('status')).toHaveTextContent('Coding Agent is thinking')
  })

  it('counts the attached images', async () => {
    const screen = await render(<RunProgress phase={{ kind: 'images', count: 2 }} trail={[]} startedAt={Date.now()} running />)
    await expect.element(screen.getByRole('status')).toHaveTextContent('Looking at your 2 images')
  })

  it('holds still and says so while it waits for the person', async () => {
    const screen = await render(<RunProgress phase={{ kind: 'approval', tool: 'workspace.edit_file', detail: 'index.html' }} trail={[]} startedAt={Date.now()} running />)
    await expect.element(screen.getByRole('status')).toHaveTextContent('Waiting for your approval: index.html')
    expect(screen.getByTestId('run-progress').element().getAttribute('data-motion')).toBe('waiting')
    expect(screen.getByTestId('run-progress-bar').element().innerHTML).not.toContain('animate-progress-slide')
  })

  it('keeps the steps already done as a trail, and the time taken', async () => {
    const screen = await render(
      <RunProgress
        phase={{ kind: 'done' }}
        trail={[{ kind: 'understanding' }, { kind: 'tool', tool: 'workspace.read_file', detail: 'index.html' }]}
        startedAt={Date.now() - 65_000}
        running={false}
      />
    )
    const trail = screen.getByRole('list', { name: 'Steps done' })
    await expect.element(trail).toHaveTextContent('Understanding your request')
    await expect.element(trail).toHaveTextContent('Reading index.html')
    await expect.element(screen.getByRole('status')).toHaveTextContent('Done')
    await expect.element(screen.getByTestId('run-progress')).toHaveTextContent('1:05')
  })

  it('speaks Indonesian when the app does', async () => {
    await i18n.changeLanguage('id')
    const screen = await render(<RunProgress phase={{ kind: 'tool', tool: 'workspace.run_test' }} trail={[]} startedAt={Date.now()} running />)
    await expect.element(screen.getByRole('status')).toHaveTextContent('Menjalankan test')
  })
})
