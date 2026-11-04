import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { RunProgress } from './run-progress'

const steps = [
  { key: 'goal', label: 'Understand' },
  { key: 'planning', label: 'Planning' },
  { key: 'coding', label: 'Working' },
  { key: 'testing', label: 'Testing' },
  { key: 'done', label: 'Completed' },
]

describe('RunProgress', () => {
  it('shows nothing when no run is going and no step is current', async () => {
    const screen = await render(<RunProgress steps={steps} currentIndex={-1} progress={0} status='' running={false} />)
    expect(screen.container.querySelector('[data-testid=run-progress]')).toBeNull()
  })

  it('names the step in words and ticks the ones already behind', async () => {
    const screen = await render(<RunProgress steps={steps} currentIndex={2} progress={55} status='Tool workspace.write_file selesai (1/8)' running />)
    await expect.element(screen.getByTestId('run-progress')).toHaveTextContent('55%')
    await expect.element(screen.getByTestId('run-progress')).toHaveTextContent('Tool workspace.write_file selesai (1/8)')
    const items = screen.getByRole('listitem').elements()
    expect(items.map((item) => item.getAttribute('aria-current'))).toEqual([null, null, 'step', null, null])
    // Two finished steps carry a tick, the later ones do not.
    expect(items.map((item) => item.querySelectorAll('svg').length)).toEqual([1, 1, 0, 0, 0])
  })

  it('stays visible after the run ends while a step is still current, so the finish is seen', async () => {
    const screen = await render(<RunProgress steps={steps} currentIndex={4} progress={100} status='' running={false} />)
    await expect.element(screen.getByTestId('run-progress')).toHaveTextContent('100%')
  })
})
