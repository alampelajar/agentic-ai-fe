import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import i18n from '@/i18n'
import { EditorShell } from './components/editor-shell'
import { DesignApiError } from './data/api'
import { createNode, createDocument, addNodes, getNode, updateNodes } from './model/document'
import { exportBlob, exportScope, importImage } from './model/export'
import { createEditorStore } from './model/store'
import type { Doc } from './model/types'
import { DesignProjectsPage } from './index'

const mocks = vi.hoisted(() => ({
  listDesignProjects: vi.fn(),
  createDesignProject: vi.fn(),
  getDesignProject: vi.fn(),
  saveDesignProject: vi.fn(),
  deleteDesignProject: vi.fn(),
  navigate: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess, info: mocks.toastInfo } }))
vi.mock('./data/api', async (importActual) => ({
  ...(await importActual<typeof import('./data/api')>()),
  listDesignProjects: mocks.listDesignProjects,
  createDesignProject: mocks.createDesignProject,
  getDesignProject: mocks.getDesignProject,
  saveDesignProject: mocks.saveDesignProject,
  deleteDesignProject: mocks.deleteDesignProject,
}))
vi.mock('@tanstack/react-router', async (importActual) => ({
  ...(await importActual<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mocks.navigate,
}))

const emptyPage = (): Doc => ({ ...createDocument(), nodes: [createNode('frame', { name: 'Desktop', x: 0, y: 0, width: 800, height: 600 })] })

async function openEditor(doc: Doc = emptyPage()) {
  const store = createEditorStore(doc)
  const screen = await render(<EditorShell store={store} projectId={7} initialName='My design' revision={3} startDirty={false} onReload={() => {}} />)
  await vi.waitFor(() => expect(store.getState().viewWidth).toBeGreaterThan(0))
  return { store, screen, canvas: document.querySelector('[data-testid="design-canvas"]') as HTMLElement }
}

/** Fires the same pointer events a mouse drag would, at page coordinates relative to the canvas. */
function drag(canvas: HTMLElement, from: { x: number; y: number }, to: { x: number; y: number }, init: PointerEventInit = {}) {
  const rect = canvas.getBoundingClientRect()
  const fire = (type: string, at: { x: number; y: number }) =>
    canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: rect.left + at.x, clientY: rect.top + at.y, ...init }))
  fire('pointerdown', from)
  fire('pointermove', { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 })
  fire('pointermove', to)
  fire('pointerup', to)
}

const worldToScreen = (store: ReturnType<typeof createEditorStore>, x: number, y: number) => {
  const { zoom, panX, panY } = store.getState()
  return { x: x * zoom + panX, y: y * zoom + panY }
}

describe('Design Studio editor', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    mocks.saveDesignProject.mockResolvedValue(4)
    localStorage.clear()
    await i18n.changeLanguage('en')
  })

  it('draws a rectangle with the tool, inside the frame, and undoes and redoes it', async () => {
    const { store, screen, canvas } = await openEditor()
    await screen.getByRole('button', { name: 'Rectangle (R)' }).click()
    expect(store.getState().tool).toBe('rect')

    drag(canvas, worldToScreen(store, 100, 100), worldToScreen(store, 300, 250))

    await vi.waitFor(() => expect(store.getState().history.present.nodes).toHaveLength(2))
    const rect = store.getState().history.present.nodes[1]
    expect(rect).toMatchObject({ type: 'rect', parentId: store.getState().history.present.nodes[0].id })
    expect(rect.width).toBeGreaterThan(150)
    expect(store.getState().selection).toEqual([rect.id])
    expect(store.getState().tool).toBe('select')

    await screen.getByRole('button', { name: 'Undo' }).click()
    expect(store.getState().history.present.nodes).toHaveLength(1)
    await screen.getByRole('button', { name: 'Redo' }).click()
    expect(store.getState().history.present.nodes).toHaveLength(2)
  })

  it('moves an element by dragging, as a single undo step', async () => {
    const rect = createNode('rect', { x: 100, y: 100, width: 100, height: 100 })
    const { store, canvas } = await openEditor(addNodes(emptyPage(), [rect]))
    drag(canvas, worldToScreen(store, 150, 150), worldToScreen(store, 350, 250), { ctrlKey: true })
    await vi.waitFor(() => expect(getNode(store.getState().history.present, rect.id)?.x).toBeGreaterThan(250))
    expect(store.getState().history.past).toHaveLength(1)
    store.getState().undo()
    expect(getNode(store.getState().history.present, rect.id)?.x).toBe(100)
  })

  it('resizes the selected element with a handle', async () => {
    const rect = createNode('rect', { x: 100, y: 100, width: 100, height: 100 })
    const { store, canvas } = await openEditor(addNodes(emptyPage(), [rect]))
    store.getState().select([rect.id])
    drag(canvas, worldToScreen(store, 200, 200), worldToScreen(store, 300, 260))
    await vi.waitFor(() => expect(getNode(store.getState().history.present, rect.id)?.width).toBeGreaterThan(150))
    expect(getNode(store.getState().history.present, rect.id)).toMatchObject({ x: 100, y: 100 })
  })

  it('a locked layer cannot be picked on the canvas, and a hidden one is not drawn', async () => {
    const rect = createNode('rect', { x: 100, y: 100, width: 100, height: 100, name: 'Box', fill: '#abcdef' })
    const { store, screen, canvas } = await openEditor(addNodes(emptyPage(), [rect]))

    await screen.getByRole('button', { name: 'Lock' }).first().click({ force: true })
    const lockedIds = store.getState().history.present.nodes.filter((node) => node.locked).map((node) => node.id)
    expect(lockedIds).toHaveLength(1)
    store.getState().apply((doc) => updateNodes(doc, lockedIds, { locked: false }))

    store.getState().apply((doc) => updateNodes(doc, [rect.id], { locked: true }))
    drag(canvas, worldToScreen(store, 150, 150), worldToScreen(store, 150, 150))
    expect(store.getState().selection).not.toContain(rect.id)

    expect(canvas.innerHTML).toContain('#abcdef')
    store.getState().apply((doc) => updateNodes(doc, [rect.id], { visible: false }))
    await vi.waitFor(() => expect(canvas.innerHTML).not.toContain('#abcdef'))
  })

  it('edits properties from the panel, and a token change reaches the element', async () => {
    const rect = createNode('rect', { x: 100, y: 100, width: 100, height: 100, fill: '#111111' })
    const { store, screen } = await openEditor(addNodes(emptyPage(), [rect]))
    store.getState().select([rect.id])

    const width = screen.getByRole('textbox', { name: 'W', exact: true })
    await width.fill('250')
    await userEvent.keyboard('{Enter}')
    await vi.waitFor(() => expect(getNode(store.getState().history.present, rect.id)?.width).toBe(250))

    await screen.getByLabelText('Fill color token').selectOptions('$color-primary')
    await vi.waitFor(() => expect(getNode(store.getState().history.present, rect.id)?.fill).toBe('$color-primary'))

    await screen.getByRole('tab', { name: 'Design' }).click()
    await expect.element(screen.getByText('Color tokens')).toBeVisible()
    await screen.getByRole('textbox', { name: 'Token name' }).first().fill('Brand')
    await vi.waitFor(() => expect(store.getState().history.present.tokens.colors[0].name).toBe('Brand'))
  })

  it('creates a component, and its instances follow the main copy', async () => {
    const rect = createNode('rect', { x: 100, y: 100, width: 100, height: 100, fill: '#ff0000', name: 'Chip' })
    const { store, canvas } = await openEditor(addNodes(emptyPage(), [rect]))
    store.getState().select([rect.id])
    store.getState().makeComponent()
    const [component] = store.getState().history.present.components
    expect(component.rootId).toBe(rect.id)
    store.getState().insert({ kind: 'component', id: component.id }, { x: 500, y: 300 })
    expect(store.getState().history.present.nodes.filter((node) => node.type === 'instance')).toHaveLength(1)
    await vi.waitFor(() => expect(canvas.querySelectorAll('[fill="#ff0000"]')).toHaveLength(2))

    store.getState().apply((doc) => updateNodes(doc, [rect.id], { fill: '#00ff00' }))
    await vi.waitFor(() => expect(canvas.querySelectorAll('[fill="#00ff00"]')).toHaveLength(2))
  })

  it('groups, ungroups, duplicates, and copies with the keyboard', async () => {
    const a = createNode('rect', { x: 10, y: 10, width: 20, height: 20 })
    const b = createNode('rect', { x: 60, y: 10, width: 20, height: 20 })
    const { store } = await openEditor(addNodes(emptyPage(), [a, b]))
    const press = (key: string, init: KeyboardEventInit = {}) => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }))

    store.getState().select([a.id, b.id])
    press('g', { ctrlKey: true })
    const groupId = store.getState().selection[0]
    expect(getNode(store.getState().history.present, groupId)?.type).toBe('group')
    press('g', { ctrlKey: true, shiftKey: true })
    expect(getNode(store.getState().history.present, groupId)).toBeUndefined()

    store.getState().select([a.id])
    press('d', { ctrlKey: true })
    expect(store.getState().history.present.nodes).toHaveLength(4)
    press('Delete')
    expect(store.getState().history.present.nodes).toHaveLength(3)
    store.getState().select([a.id])
    press('ArrowRight')
    expect(getNode(store.getState().history.present, a.id)?.x).toBe(11)
    press('z', { ctrlKey: true })
    expect(getNode(store.getState().history.present, a.id)?.x).toBe(10)
  })

  it('saves shortly after a change, and keeps a draft until the server has it', async () => {
    const { store, screen } = await openEditor()
    store.getState().insert({ kind: 'element', type: 'rect' })
    expect(localStorage.getItem('design-studio-draft-7')).toBeNull()
    await expect.element(screen.getByRole('status')).toHaveTextContent('Unsaved changes')

    await vi.waitFor(() => expect(mocks.saveDesignProject).toHaveBeenCalledTimes(1), { timeout: 4000 })
    const [id, body] = mocks.saveDesignProject.mock.calls[0]
    expect(id).toBe(7)
    expect(body).toMatchObject({ name: 'My design', revision: 3 })
    expect(JSON.parse(body.serialized).nodes).toHaveLength(2)
    await expect.element(screen.getByRole('status')).toHaveTextContent('All changes saved')
    expect(localStorage.getItem('design-studio-draft-7')).toBeNull()
  })

  it('stops saving and says so when another tab saved first', async () => {
    mocks.saveDesignProject.mockRejectedValue(new DesignApiError('changed', 409))
    const { store, screen } = await openEditor()
    store.getState().insert({ kind: 'element', type: 'rect' })
    await expect.element(screen.getByRole('alert')).toBeVisible()
    await expect.element(screen.getByRole('button', { name: 'Reload' })).toBeVisible()
    expect(localStorage.getItem('design-studio-draft-7')).not.toBeNull()
  })

  it('shows each frame in preview', async () => {
    const { screen } = await openEditor()
    await screen.getByRole('button', { name: 'Preview' }).click()
    await expect.element(screen.getByRole('dialog', { name: 'Preview' })).toBeVisible()
    await expect.element(screen.getByText('Desktop · 800 × 600')).toBeVisible()
    await screen.getByRole('button', { name: 'Close' }).click()
    await expect.element(screen.getByRole('dialog', { name: 'Preview' })).not.toBeInTheDocument()
  })
})

describe('export and import', () => {
  const pngFile = async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 40
    canvas.height = 20
    canvas.getContext('2d')!.fillRect(0, 0, 40, 20)
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), 'image/png'))
    return new File([blob], 'shot.png', { type: 'image/png' })
  }

  it('produces real PNG, JPG and SVG files, including imported images', async () => {
    const image = await importImage(await pngFile())
    expect(image.src.startsWith('data:image/')).toBe(true)
    expect([image.width, image.height]).toEqual([40, 20])

    const asset = { id: 'a1', name: 'shot', ...image }
    const frame = createNode('frame', { x: 0, y: 0, width: 200, height: 100, fill: '#ffffff' })
    const nodes = [
      frame,
      createNode('image', { assetId: 'a1', fill: '', parentId: frame.id, x: 10, y: 10, width: 80, height: 40 }),
      createNode('button', { parentId: frame.id, x: 100, y: 10, width: 80, height: 30, text: 'Go' }),
    ]
    const doc: Doc = { ...createDocument(), nodes, assets: [asset] }
    const scope = exportScope(doc, [frame.id])!

    const png = await exportBlob(doc, scope, 'png', 2, false)
    expect(png.type).toBe('image/png')
    const bitmap = await createImageBitmap(png)
    expect([bitmap.width, bitmap.height]).toEqual([400, 200])
    const pixel = document.createElement('canvas')
    pixel.width = 400
    pixel.height = 200
    const context = pixel.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    // The imported black image and the blue button both made it into the file.
    expect([...context.getImageData(60, 40, 1, 1).data.slice(0, 3)]).toEqual([0, 0, 0])
    expect([...context.getImageData(210, 30, 1, 1).data.slice(0, 3)]).toEqual([36, 73, 245])

    const jpg = await exportBlob(doc, scope, 'jpg', 1, false)
    expect(jpg.type).toBe('image/jpeg')
    expect((await createImageBitmap(jpg)).width).toBe(200)

    const svg = await exportBlob(doc, scope, 'svg', 1, false)
    expect(svg.type).toBe('image/svg+xml')
    expect(await svg.text()).toContain('<image')
  })

  it('refuses files that are not images', async () => {
    await expect(importImage(new File(['x'], 'notes.txt', { type: 'text/plain' }))).rejects.toMatchObject({ reason: 'type' })
  })
})

describe('Design projects page', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    await i18n.changeLanguage('en')
  })

  it('creates a project and opens it', async () => {
    mocks.listDesignProjects.mockResolvedValue([])
    mocks.createDesignProject.mockResolvedValue({ id: 5, name: 'Untitled design', revision: 1 })
    const screen = await render(<DesignProjectsPage />)
    await expect.element(screen.getByText('No designs yet')).toBeVisible()
    await screen.getByRole('button', { name: 'New design' }).click()
    await vi.waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: '/design-studio/$projectId', params: { projectId: '5' } }))
    expect(mocks.createDesignProject.mock.calls[0][1].nodes).toHaveLength(1)
  })

  it('deletes a project only after confirming', async () => {
    mocks.listDesignProjects.mockResolvedValue([{ id: 5, name: 'Landing', revision: 1, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' }])
    mocks.deleteDesignProject.mockResolvedValue(undefined)
    const screen = await render(<DesignProjectsPage />)
    await screen.getByRole('button', { name: 'Delete Landing' }).click({ force: true })
    expect(mocks.deleteDesignProject).not.toHaveBeenCalled()
    await screen.getByRole('button', { name: 'Delete', exact: true }).click()
    await vi.waitFor(() => expect(mocks.deleteDesignProject).toHaveBeenCalledWith(5))
    await expect.element(screen.getByText('Landing')).not.toBeInTheDocument()
  })
})
