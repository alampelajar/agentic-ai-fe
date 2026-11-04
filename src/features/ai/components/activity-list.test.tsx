import { beforeEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import i18n from '@/i18n'
import { ActivityList } from './activity-list'
import type { ActivityItem } from './activity'

const items: ActivityItem[] = [
  { id: 1, tool: 'workspace.list_files', detail: '', state: 'done' },
  { id: 2, tool: 'workspace.write_file', detail: 'src/handlers/executions_test.go', state: 'denied' },
  { id: 3, tool: 'workspace.run_test', detail: 'go', state: 'running' },
  { id: 4, tool: 'workspace.build', detail: 'node', state: 'failed' },
  { id: 5, tool: 'go-test', detail: '', state: 'expired' },
]

describe('ActivityList', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows each call with what it did, on what, and how it ended', async () => {
    const screen = await render(<ActivityList items={items} />)
    const rows = screen.getByRole('listitem')
    await expect.element(rows.nth(0)).toHaveTextContent('Listed files')
    await expect.element(rows.nth(0)).toHaveTextContent('Done')
    await expect.element(rows.nth(1)).toHaveTextContent('Write file')
    await expect.element(rows.nth(1)).toHaveTextContent('src/handlers/executions_test.go')
    await expect.element(rows.nth(1)).toHaveTextContent('Not allowed')
    await expect.element(rows.nth(2)).toHaveTextContent('Working')
    await expect.element(rows.nth(3)).toHaveTextContent('Failed')
    await expect.element(rows.nth(4)).toHaveTextContent('Expired')
  })

  it('names a tool it has no translation for by its own name', async () => {
    const screen = await render(<ActivityList items={items} />)
    await expect.element(screen.getByRole('listitem').nth(4)).toHaveTextContent('go-test')
  })

  it('marks the state of each row so it can be checked without colour', async () => {
    const screen = await render(<ActivityList items={items} />)
    const states = screen.getByRole('listitem').elements().map((element) => element.getAttribute('data-state'))
    expect(states).toEqual(['done', 'denied', 'running', 'failed', 'expired'])
  })

  it('announces changes politely and gives a long path its full text on hover', async () => {
    const screen = await render(<ActivityList items={items} />)
    expect(screen.getByRole('list').element().getAttribute('aria-live')).toBe('polite')
    expect(screen.getByText('src/handlers/executions_test.go').element().getAttribute('title')).toBe('src/handlers/executions_test.go')
  })

  it('renders nothing before the first call', async () => {
    const screen = await render(<ActivityList items={[]} />)
    expect(screen.container.querySelector('[data-testid=agent-activity]')).toBeNull()
  })
})
