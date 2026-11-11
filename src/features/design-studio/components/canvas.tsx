import { useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  addNodes,
  canPlaceInstance,
  childrenOf,
  createNode,
  descendantIds,
  findFrameAt,
  getNode,
  moveNodes,
  resizeNode,
  resolveColor,
  resolveSpacing,
  resolveTypography,
  setParent,
  snapBounds,
  topLevelOf,
  updateNodes,
} from '../model/document'
import { INSERT_MIME, frameLabelAt, hitTest, marqueeHits, useDoc, useEditor, useEditorStore, type InsertSpec, type Tool } from '../model/store'
import type { Bounds, DesignNode, Point } from '../model/types'
import { fontStack } from '../model/render'
import { DocContent } from './svg-view'
import { useImportImages } from './use-import-images'

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const HANDLE_CURSOR: Record<Handle, string> = { nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize', se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize' }
const DRAG_THRESHOLD = 3
const SELECTION_COLOR = '#2563eb'
const COMPONENT_COLOR = '#9333ea'

const handlePoint = (box: Bounds, handle: Handle): Point => ({
  x: handle.includes('w') ? box.x : handle.includes('e') ? box.x + box.width : box.x + box.width / 2,
  y: handle.includes('n') ? box.y : handle.includes('s') ? box.y + box.height : box.y + box.height / 2,
})

function resized(base: Bounds, handle: Handle, dx: number, dy: number, keepRatio: boolean): Bounds {
  let left = base.x
  let top = base.y
  let right = base.x + base.width
  let bottom = base.y + base.height
  if (handle.includes('w')) left = Math.min(left + dx, right - 1)
  if (handle.includes('e')) right = Math.max(right + dx, left + 1)
  if (handle.includes('n')) top = Math.min(top + dy, bottom - 1)
  if (handle.includes('s')) bottom = Math.max(bottom + dy, top + 1)
  if (keepRatio && base.width > 0 && base.height > 0) {
    const ratio = base.width / base.height
    const width = right - left
    const height = bottom - top
    if (handle === 'n' || handle === 's' || width / height < ratio) {
      const nextWidth = height * ratio
      if (handle.includes('w')) left = right - nextWidth
      else right = left + nextWidth
    } else {
      const nextHeight = width / ratio
      if (handle.includes('n')) top = bottom - nextHeight
      else bottom = top + nextHeight
    }
  }
  return { x: Math.round(left), y: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top) }
}

type Drag =
  | { kind: 'pan'; lastX: number; lastY: number }
  | { kind: 'move'; start: Point; ids: string[]; startBounds: Bounds; others: Bounds[]; moved: boolean; dx: number; dy: number }
  | { kind: 'resize'; id: string; handle: Handle; start: Point; base: Bounds }
  | { kind: 'marquee'; start: Point; additive: string[] }
  | { kind: 'draw'; tool: Exclude<Tool, 'select' | 'hand'>; start: Point; id: string; moved: boolean; parentId: string | null }

const drawTypes = { frame: 'frame', rect: 'rect', ellipse: 'ellipse', line: 'line', text: 'text' } as const

export function Canvas() {
  const { t } = useTranslation()
  const store = useEditorStore()
  const doc = useDoc()
  const zoom = useEditor((state) => state.zoom)
  const panX = useEditor((state) => state.panX)
  const panY = useEditor((state) => state.panY)
  const tool = useEditor((state) => state.tool)
  const selection = useEditor((state) => state.selection)
  const guides = useEditor((state) => state.guides)
  const editingId = useEditor((state) => state.editingId)
  const importImages = useImportImages()

  const root = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const spaceHeld = useRef(false)
  const [spaceDown, setSpaceDown] = useState(false)
  const [panning, setPanning] = useState(false)
  const [hover, setHover] = useState<string | null>(null)
  const [marquee, setMarquee] = useState<Bounds | null>(null)

  const toScreen = (point: Point): Point => ({ x: point.x * zoom + panX, y: point.y * zoom + panY })
  const screenBox = (box: Bounds): Bounds => ({ ...toScreen(box), width: box.width * zoom, height: box.height * zoom })

  const eventPoint = (event: { clientX: number; clientY: number }) => {
    const rect = root.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const worldPoint = (event: { clientX: number; clientY: number }): Point => {
    const state = store.getState()
    const screen = eventPoint(event)
    return { x: (screen.x - state.panX) / state.zoom, y: (screen.y - state.panY) / state.zoom }
  }

  // Keep the store informed of the canvas size, and centre the design once.
  useEffect(() => {
    const element = root.current
    if (!element) return
    let fitted = false
    const observer = new ResizeObserver(([entry]) => {
      store.getState().setViewSize(entry.contentRect.width, entry.contentRect.height)
      if (!fitted && entry.contentRect.width > 0) {
        fitted = true
        store.getState().fitAll()
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [store])

  // The page must not scroll or zoom while the wheel is over the canvas.
  useEffect(() => {
    const element = root.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const state = store.getState()
      if (event.ctrlKey || event.metaKey) {
        const screen = eventPoint(event)
        state.zoomAt(state.zoom * Math.exp(-event.deltaY * 0.01), screen.x, screen.y)
      } else if (event.shiftKey) {
        state.panBy(-event.deltaY, 0)
      } else {
        state.panBy(-event.deltaX, -event.deltaY)
      }
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [store])

  useEffect(() => {
    const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !typing(event.target)) {
        event.preventDefault()
        spaceHeld.current = true
        setSpaceDown(true)
      }
    }
    const up = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spaceHeld.current = false
        setSpaceDown(false)
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = store.getState()
    if (state.editingId) {
      // Clicking away finishes the text; the textarea's blur does the saving.
      ;(document.activeElement as HTMLElement | null)?.blur()
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Only a nicety: a drag that leaves the canvas keeps working where capture is available.
    }
    const current = state.history.present
    const point = worldPoint(event)

    if (event.button === 1 || state.tool === 'hand' || spaceHeld.current) {
      drag.current = { kind: 'pan', lastX: event.clientX, lastY: event.clientY }
      setPanning(true)
      return
    }
    if (event.button !== 0) return

    if (state.tool !== 'select') {
      const parentId = state.tool === 'frame' ? null : (findFrameAt(current, point)?.id ?? null)
      drag.current = { kind: 'draw', tool: state.tool, start: point, id: '', moved: false, parentId }
      return
    }

    // A resize handle of the selected element wins over whatever lies below it.
    if (state.selection.length === 1) {
      const node = getNode(current, state.selection[0])
      if (node && !node.locked) {
        const reach = 7 / state.zoom
        // Zoomed out, several handles can be in reach of the pointer: take the nearest.
        let handle: Handle | null = null
        let nearest = Infinity
        for (const item of HANDLES) {
          const at = handlePoint(node, item)
          const distance = Math.max(Math.abs(at.x - point.x), Math.abs(at.y - point.y))
          if (distance <= reach && distance < nearest) {
            handle = item
            nearest = distance
          }
        }
        if (handle) {
          state.begin()
          drag.current = { kind: 'resize', id: node.id, handle, start: point, base: { x: node.x, y: node.y, width: node.width, height: node.height } }
          return
        }
      }
    }

    const deep = event.ctrlKey || event.metaKey
    const hit = frameLabelAt(current, point, state.zoom) ?? hitTest(current, point, state.zoom, deep)
    if (!hit) {
      drag.current = { kind: 'marquee', start: point, additive: event.shiftKey ? state.selection : [] }
      if (!event.shiftKey) state.select([])
      return
    }

    let selected = state.selection
    if (event.shiftKey) {
      if (selected.includes(hit)) {
        state.select(selected.filter((id) => id !== hit))
        return
      }
      selected = [...selected, hit]
      state.select(selected)
    } else if (!selected.includes(hit)) {
      selected = [hit]
      state.select(selected)
    }

    const ids = topLevelOf(current, selected).filter((id) => !getNode(current, id)?.locked)
    const nodes = ids.map((id) => getNode(current, id)!).filter(Boolean)
    if (nodes.length === 0) return
    const left = Math.min(...nodes.map((node) => node.x))
    const top = Math.min(...nodes.map((node) => node.y))
    const moving = new Set(ids.flatMap((id) => [id, ...descendantIds(current, id)]))
    drag.current = {
      kind: 'move',
      start: point,
      ids,
      startBounds: { x: left, y: top, width: Math.max(...nodes.map((node) => node.x + node.width)) - left, height: Math.max(...nodes.map((node) => node.y + node.height)) - top },
      others: current.nodes.filter((node) => node.visible && !moving.has(node.id) && node.type !== 'group'),
      moved: false,
      dx: 0,
      dy: 0,
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = store.getState()
    const active = drag.current
    const point = worldPoint(event)

    if (!active) {
      if (state.tool === 'select' && !spaceHeld.current) setHover(hitTest(state.history.present, point, state.zoom))
      return
    }

    switch (active.kind) {
      case 'pan':
        state.panBy(event.clientX - active.lastX, event.clientY - active.lastY)
        active.lastX = event.clientX
        active.lastY = event.clientY
        break
      case 'move': {
        const dxRaw = point.x - active.start.x
        const dyRaw = point.y - active.start.y
        if (!active.moved) {
          if (Math.hypot(dxRaw, dyRaw) * state.zoom < DRAG_THRESHOLD) return
          active.moved = true
          state.begin()
          setHover(null)
        }
        let dx = Math.round(dxRaw)
        let dy = Math.round(dyRaw)
        // Hold Ctrl or Cmd to move freely, without snapping.
        if (!(event.ctrlKey || event.metaKey)) {
          const snap = snapBounds({ ...active.startBounds, x: active.startBounds.x + dx, y: active.startBounds.y + dy }, active.others, 6 / state.zoom)
          dx += snap.dx
          dy += snap.dy
          state.setGuides(snap.guides)
        } else {
          state.setGuides([])
        }
        active.dx = dx
        active.dy = dy
        state.preview((base) => moveNodes(base, active.ids, dx, dy))
        break
      }
      case 'resize': {
        const next = resized(active.base, active.handle, point.x - active.start.x, point.y - active.start.y, event.shiftKey)
        state.preview((base) => resizeNode(base, active.id, next))
        break
      }
      case 'marquee': {
        const box = {
          x: Math.min(active.start.x, point.x),
          y: Math.min(active.start.y, point.y),
          width: Math.abs(point.x - active.start.x),
          height: Math.abs(point.y - active.start.y),
        }
        setMarquee(box)
        state.select([...new Set([...active.additive, ...marqueeHits(state.history.present, box)])])
        break
      }
      case 'draw': {
        const dx = point.x - active.start.x
        const dy = point.y - active.start.y
        if (!active.moved) {
          if (Math.hypot(dx, dy) * state.zoom < DRAG_THRESHOLD) return
          active.moved = true
          state.begin()
          active.id = createNode(drawTypes[active.tool]).id
        }
        const square = event.shiftKey && active.tool !== 'line'
        const width = square ? Math.max(Math.abs(dx), Math.abs(dy)) : Math.abs(dx)
        const height = square ? width : Math.abs(dy)
        const x = Math.round(dx < 0 ? active.start.x - width : active.start.x)
        const y = Math.round(dy < 0 ? active.start.y - height : active.start.y)
        const node = createNode(drawTypes[active.tool], {
          id: active.id,
          parentId: active.parentId,
          x,
          y,
          width: Math.max(1, Math.round(width)),
          height: active.tool === 'line' ? Math.round(height) : Math.max(1, Math.round(height)),
          flipY: active.tool === 'line' && dx * dy < 0,
        })
        state.preview((base) => addNodes(base, [node]))
        state.select([active.id])
        break
      }
    }
  }

  const onPointerUp = () => {
    const state = store.getState()
    const active = drag.current
    drag.current = null
    setPanning(false)
    if (!active) return
    switch (active.kind) {
      case 'move': {
        if (!active.moved) return
        // Dropping an element over a frame puts it in that frame.
        state.preview((base) => {
          let next = moveNodes(base, active.ids, active.dx, active.dy)
          for (const id of active.ids) {
            const node = getNode(next, id)
            if (!node || node.type === 'frame') continue
            const parent = node.parentId ? getNode(next, node.parentId) : null
            if (parent?.type === 'group') continue
            const target = findFrameAt(next, { x: node.x + node.width / 2, y: node.y + node.height / 2 }, [id])
            if (node.type === 'instance' && !canPlaceInstance(next, node.componentId, target?.id ?? null)) continue
            next = setParent(next, id, target?.id ?? null)
          }
          return next
        })
        state.end()
        break
      }
      case 'resize':
        state.end()
        break
      case 'marquee':
        setMarquee(null)
        break
      case 'draw':
        finishDraw(active)
        break
    }
  }

  const finishDraw = (active: Extract<Drag, { kind: 'draw' }>) => {
    const state = store.getState()
    if (active.moved) {
      state.end()
      state.setTool('select')
      state.select([active.id])
      if (active.tool === 'text') state.setEditing(active.id)
      return
    }
    // A plain click makes an element of the default size.
    const node = createNode(drawTypes[active.tool], { parentId: active.parentId })
    const placed = { ...node, x: Math.round(active.start.x - (active.tool === 'text' ? 0 : node.width / 2)), y: Math.round(active.start.y - (active.tool === 'text' ? 0 : node.height / 2)) }
    state.apply((current) => addNodes(current, [placed]))
    state.setTool('select')
    state.select([placed.id])
    if (active.tool === 'text') state.setEditing(placed.id)
  }

  const onDoubleClick = (event: React.MouseEvent) => {
    const state = store.getState()
    const point = worldPoint(event)
    const current = state.history.present
    const top = hitTest(current, point, state.zoom)
    const node = top ? getNode(current, top) : null
    if (node?.type === 'group') {
      const inner = hitTest(current, point, state.zoom, true)
      if (inner) state.select([inner])
      return
    }
    if (node && ['text', 'button', 'input', 'card'].includes(node.type)) {
      state.select([node.id])
      state.setEditing(node.id)
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const point = worldPoint(event)
    const files = [...event.dataTransfer.files]
    if (files.length > 0) {
      void importImages(files, point)
      return
    }
    const raw = event.dataTransfer.getData(INSERT_MIME)
    if (raw) store.getState().insert(JSON.parse(raw) as InsertSpec, point)
  }

  const selectedNodes = selection.map((id) => getNode(doc, id)).filter((node): node is DesignNode => !!node)
  const single = selectedNodes.length === 1 ? selectedNodes[0] : null
  const hoverNode = hover && !selection.includes(hover) ? getNode(doc, hover) : null
  const mainIds = new Set(doc.components.map((component) => component.rootId))
  const accentFor = (node: DesignNode) => (mainIds.has(node.id) || node.type === 'instance' ? COMPONENT_COLOR : SELECTION_COLOR)
  const editing = editingId ? getNode(doc, editingId) : null

  const cursor = panning ? 'grabbing' : tool === 'hand' || spaceDown ? 'grab' : tool !== 'select' ? 'crosshair' : 'default'

  return (
    <div
      ref={root}
      data-testid='design-canvas'
      role='application'
      aria-label={t('designStudio.canvas')}
      className='relative h-full w-full touch-none select-none overflow-hidden'
      style={{ background: resolveColor(doc, doc.background), cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => setHover(null)}
      onDoubleClick={onDoubleClick}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <svg className='absolute inset-0 h-full w-full' aria-hidden='true'>
        <g transform={`translate(${panX} ${panY}) scale(${zoom})`}>
          <DocContent doc={doc} scope='canvas-' />
        </g>

        {childrenOf(doc, null)
          .filter((node) => node.type === 'frame' && node.visible)
          .map((frame) => {
            const at = toScreen(frame)
            const selected = selection.includes(frame.id)
            return (
              <text key={frame.id} x={at.x} y={at.y - 6} fontSize={11} fontFamily='Inter, sans-serif' fill={selected ? accentFor(frame) : '#71717a'}>
                {frame.name}
              </text>
            )
          })}

        {hoverNode && (
          <rect {...screenBox(hoverNode)} fill='none' stroke={accentFor(hoverNode)} strokeWidth={1.5} pointerEvents='none' />
        )}

        {selectedNodes.map((node) => (
          <rect key={node.id} {...screenBox(node)} fill='none' stroke={accentFor(node)} strokeWidth={1} pointerEvents='none' />
        ))}

        {single && !single.locked && !editing && HANDLES.map((handle) => {
          const at = toScreen(handlePoint(single, handle))
          return (
            <rect
              key={handle}
              data-handle={handle}
              x={at.x - 4}
              y={at.y - 4}
              width={8}
              height={8}
              rx={1.5}
              fill='#ffffff'
              stroke={accentFor(single)}
              strokeWidth={1}
              style={{ cursor: HANDLE_CURSOR[handle] }}
            />
          )
        })}

        {guides.map((guide, index) =>
          guide.axis === 'x' ? (
            <line key={index} x1={guide.position * zoom + panX} x2={guide.position * zoom + panX} y1={0} y2='100%' stroke='#ef4444' strokeWidth={1} />
          ) : (
            <line key={index} y1={guide.position * zoom + panY} y2={guide.position * zoom + panY} x1={0} x2='100%' stroke='#ef4444' strokeWidth={1} />
          ),
        )}

        {marquee && <rect {...screenBox(marquee)} fill={`${SELECTION_COLOR}1a`} stroke={SELECTION_COLOR} strokeWidth={1} />}

        {single && !editing && (() => {
          const box = screenBox(single)
          return (
            <text x={box.x + box.width / 2} y={box.y + box.height + 18} fontSize={11} fontFamily='Inter, sans-serif' textAnchor='middle' fill={accentFor(single)}>
              {Math.round(single.width)} × {Math.round(single.height)}
            </text>
          )
        })()}
      </svg>

      {editing && <TextEditor key={editing.id} node={editing} box={screenBox(editing)} zoom={zoom} />}
    </div>
  )
}

function TextEditor({ node, box, zoom }: { node: DesignNode; box: Bounds; zoom: number }) {
  const { t } = useTranslation()
  const store = useEditorStore()
  const doc = useDoc()
  const type = resolveTypography(doc, node)
  const padding = resolveSpacing(doc, node.padding) * zoom
  const [value, setValue] = useState(node.text)
  const cancelled = useRef(false)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    area.current?.focus()
    area.current?.select()
  }, [])

  const finish = () => {
    const state = store.getState()
    state.setEditing(null)
    if (cancelled.current || value === node.text) return
    // A text box left empty has no reason to exist.
    if (node.type === 'text' && !value.trim()) {
      state.select([node.id])
      state.remove()
      return
    }
    state.apply((current) => updateNodes(current, [node.id], { text: value }))
  }

  return (
    <textarea
      ref={area}
      aria-label={t('designStudio.editText')}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={finish}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Escape') {
          cancelled.current = true
          event.currentTarget.blur()
        }
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) event.currentTarget.blur()
      }}
      className='absolute resize-none overflow-hidden border-0 bg-white/90 outline outline-2 outline-blue-600'
      style={{
        left: box.x,
        top: box.y,
        width: Math.max(box.width, 80),
        height: Math.max(box.height, type.fontSize * type.lineHeight * zoom + padding * 2),
        padding,
        fontFamily: fontStack(type.fontFamily),
        fontSize: type.fontSize * zoom,
        fontWeight: type.fontWeight,
        lineHeight: type.lineHeight,
        textAlign: node.textAlign,
        color: resolveColor(doc, node.textColor),
      }}
    />
  )
}
