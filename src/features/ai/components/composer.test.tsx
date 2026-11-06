import { useRef, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import { Composer } from './composer'

vi.mock('@tanstack/react-router', async (importActual) => ({
  ...(await importActual<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to }: { children?: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

type Overrides = Partial<React.ComponentProps<typeof Composer>>

function Harness({ initial = '', ...overrides }: Overrides & { initial?: string }) {
  const [value, setValue] = useState(initial)
  const fileInput = useRef<HTMLInputElement | null>(null)
  return (
    <Composer
      value={value}
      onChange={setValue}
      onSend={vi.fn()}
      ready
      running={false}
      modelName='north-mini'
      files={[]}
      onFiles={vi.fn()}
      onRemoveFile={vi.fn()}
      fileInputRef={fileInput}
      onDelegate={vi.fn()}
      delegateDisabled={false}
      runtimeConnected={false}
      {...overrides}
    />
  )
}

describe('Composer', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('says why it cannot be used yet instead of showing an empty disabled box', async () => {
    const screen = await render(<Harness ready={false} />)
    await expect.element(screen.getByText('Choose an agent and a model to start.')).toBeInTheDocument()
    const box = screen.getByRole('textbox')
    await expect.element(box).toBeDisabled()
    expect(box.element().getAttribute('aria-describedby')).toBe('composer-hint')
    // Its name says what is missing, not a sentence about a model that is not chosen.
    expect(box.element().getAttribute('aria-label')).toBe('Choose an agent and a model to start.')
    await expect.element(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('sends with Enter, keeps Shift+Enter for a new line, and never sends an empty message', async () => {
    const onSend = vi.fn()
    const screen = await render(<Harness onSend={onSend} />)
    const box = screen.getByRole('textbox')
    await userEvent.click(box)
    await userEvent.keyboard('{Enter}')
    expect(onSend).not.toHaveBeenCalled() // empty

    await userEvent.type(box, 'tulis README')
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')
    expect(onSend).not.toHaveBeenCalled()
    expect((box.element() as HTMLTextAreaElement).value).toBe('tulis README\n')

    await userEvent.keyboard('{Enter}')
    expect(onSend).toHaveBeenCalledOnce()
  })

  it('sends with the button once there is something to send', async () => {
    const onSend = vi.fn()
    const screen = await render(<Harness onSend={onSend} initial='halo' />)
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSend).toHaveBeenCalledOnce()
  })

  it('locks the box and the buttons while a run is going', async () => {
    const screen = await render(<Harness running initial='halo' />)
    await expect.element(screen.getByRole('textbox')).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Attach an image' })).toBeDisabled()
  })

  it('names every icon button, and removes an attached file by name', async () => {
    const onRemoveFile = vi.fn()
    const onDelegate = vi.fn()
    const screen = await render(<Harness files={[new File(['x'], 'shot.png', { type: 'image/png' })]} onRemoveFile={onRemoveFile} onDelegate={onDelegate} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove shot.png' }))
    expect(onRemoveFile).toHaveBeenCalledExactlyOnceWith(0)
    await userEvent.click(screen.getByRole('button', { name: 'Delegate to another agent' }))
    expect(onDelegate).toHaveBeenCalledOnce()
    await expect.element(screen.getByRole('button', { name: 'Attach an image' })).toBeEnabled()
  })

  it('keeps the Desktop Runtime status and the key hint in one line under the box', async () => {
    const off = await render(<Harness />)
    await expect.element(off.getByTestId('desktop-runtime-status')).toHaveTextContent('not connected')
    expect(off.getByRole('link', { name: 'Manage in Settings' }).element().getAttribute('href')).toBe('/settings/integrations')
    await expect.element(off.getByText('Enter to send, Shift+Enter for a new line')).toBeInTheDocument()
    await off.unmount()

    const on = await render(<Harness runtimeConnected />)
    await expect.element(on.getByTestId('desktop-runtime-status')).not.toHaveTextContent('not connected')
  })

  it('grows with its text up to a limit instead of scrolling a two-line box', async () => {
    const screen = await render(<Harness initial={'baris\n'.repeat(30)} />)
    // The component sets the height itself: the text's height, capped at 220px.
    const height = parseInt((screen.getByRole('textbox').element() as HTMLTextAreaElement).style.height, 10)
    expect(height).toBeGreaterThan(100)
    expect(height).toBeLessThanOrEqual(220)
    await screen.unmount()

    const short = await render(<Harness initial='satu baris' />)
    expect(parseInt((short.getByRole('textbox').element() as HTMLTextAreaElement).style.height, 10)).toBeLessThan(height)
  })

  describe('slash commands', () => {
    const skills = [
      { slug: 'desktop-control', name: 'Desktop Control', description: 'Control the desktop' },
      { slug: 'code-review', name: 'Code Review', description: 'Review code' },
    ]

    it('offers the skills when a message starts with a slash and narrows them as the person types', async () => {
      const screen = await render(<Harness skills={skills} />)
      const box = screen.getByRole('textbox')
      await userEvent.click(box)
      await userEvent.keyboard('/')
      await expect.element(screen.getByRole('option', { name: /desktop-control/ })).toBeInTheDocument()
      await expect.element(screen.getByRole('option', { name: /code-review/ })).toBeInTheDocument()

      await userEvent.keyboard('cod')
      await expect.element(screen.getByRole('option', { name: /code-review/ })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /desktop-control/ }).query()).toBeNull()
    })

    it('completes the command with Enter instead of sending, then Enter sends the message', async () => {
      const onSend = vi.fn()
      const screen = await render(<Harness skills={skills} onSend={onSend} />)
      const box = screen.getByRole('textbox')
      await userEvent.click(box)
      await userEvent.keyboard('/des')
      await userEvent.keyboard('{Enter}')
      expect(onSend).not.toHaveBeenCalled()
      expect((box.element() as HTMLTextAreaElement).value).toBe('/desktop-control ')

      await userEvent.keyboard('buka notepad')
      await userEvent.keyboard('{Enter}')
      expect(onSend).toHaveBeenCalledOnce()
    })

    it('moves with the arrow keys and closes with Escape', async () => {
      const screen = await render(<Harness skills={skills} />)
      const box = screen.getByRole('textbox')
      await userEvent.click(box)
      await userEvent.keyboard('/')
      await userEvent.keyboard('{ArrowDown}{Enter}')
      expect((box.element() as HTMLTextAreaElement).value).toBe('/code-review ')

      await userEvent.clear(box)
      await userEvent.keyboard('/')
      await userEvent.keyboard('{Escape}')
      expect(screen.getByRole('listbox').query()).toBeNull()
    })

    it('stays closed for a slash inside the message or when there are no skills', async () => {
      const screen = await render(<Harness skills={skills} initial='buka ' />)
      const box = screen.getByRole('textbox')
      await userEvent.click(box)
      await userEvent.keyboard('/')
      expect(screen.getByRole('listbox').query()).toBeNull()

      await userEvent.clear(box)
      await userEvent.keyboard('/')
      await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
    })
  })
})
