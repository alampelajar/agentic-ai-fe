import { createContext, useContext } from 'react'
import { createStore, useStore, type StoreApi } from 'zustand'
import {
  FRAME_PRESETS,
  addAsset,
  addNodes,
  boundsOf,
  childrenOf,
  containsPoint,
  cloneNodes,
  createComponent,
  createInstance,
  createNode,
  deleteNodes,
  detachInstance,
  duplicateNodes,
  finalizeDocument,
  findFrameAt,
  getNode,
  groupNodes,
  intersects,
  newId,
  nextFrameOrigin,
  reorderNodes,
  ungroupNodes,
  unionBounds,
  type Guide,
  type ReorderMove,
} from './document'
import * as historyOps from './history'
import type { History } from './history'
import type { Bounds, DesignAsset, DesignNode, Doc, NodeType, Point } from './types'

export type Tool = 'select' | 'hand' | 'frame' | 'rect' | 'ellipse' | 'line' | 'text'

export type InsertSpec =
  | { kind: 'element'; type: NodeType }
  | { kind: 'icon'; icon: string }
  | { kind: 'frame'; preset: string }
  | { kind: 'component'; id: string }
  | { kind: 'asset'; id: string }

export const INSERT_MIME = 'application/x-design-insert'

const MIN_ZOOM = 0.05
const MAX_ZOOM = 8

export type EditorState = {
  history: History
  selection: string[]
  tool: Tool
  zoom: number
  panX: number
  panY: number
  viewWidth: number
  viewHeight: number
  editingId: string | null
  guides: Guide[]
  clipboard: DesignNode[]
  apply: (change: (doc: Doc) => Doc, key?: string) => void
  begin: () => void
  preview: (change: (base: Doc) => Doc) => void
  end: () => void
  undo: () => void
  redo: () => void
  select: (ids: string[]) => void
  setTool: (tool: Tool) => void
  setEditing: (id: string | null) => void
  setGuides: (guides: Guide[]) => void
  setViewSize: (width: number, height: number) => void
  panBy: (dx: number, dy: number) => void
  zoomAt: (zoom: number, screenX?: number, screenY?: number) => void
  fitTo: (bounds: Bounds | null) => void
  fitAll: () => void
  insert: (spec: InsertSpec, point?: Point) => void
  placeImage: (asset: { name: string; src: string; width: number; height: number }, point?: Point) => void
  group: () => void
  ungroup: () => void
  duplicate: () => void
  remove: () => void
  order: (move: ReorderMove) => void
  copy: () => void
  paste: () => void
  makeComponent: () => void
  detach: () => void
  selectAll: () => void
}

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

/** An image element for an asset, centred on a point, at a sensible size. */
function imageNode(asset: DesignAsset, at: Point, parentId: string | null): DesignNode {
  const scale = Math.min(1, 480 / Math.max(asset.width, asset.height))
  const width = Math.round(asset.width * scale)
  const height = Math.round(asset.height * scale)
  return createNode('image', { name: asset.name, assetId: asset.id, fill: '', width, height, parentId, x: Math.round(at.x - width / 2), y: Math.round(at.y - height / 2) })
}

const prune = (doc: Doc, ids: string[]) => ids.filter((id) => doc.nodes.some((node) => node.id === id))

/** The editable, unlocked elements among a list of ids. */
const editable = (doc: Doc, ids: string[]) => ids.filter((id) => getNode(doc, id)?.locked === false)

export function createEditorStore(initial: Doc): StoreApi<EditorState> {
  return createStore<EditorState>((set, get) => {
    const doc = () => get().history.present
    const center = (): Point => {
      const { panX, panY, zoom, viewWidth, viewHeight } = get()
      return { x: (viewWidth / 2 - panX) / zoom, y: (viewHeight / 2 - panY) / zoom }
    }
    /** Applies a change that also picks what is selected afterwards. */
    const applyAndSelect = (change: (current: Doc) => { doc: Doc; selection: string[] }) => {
      const result = change(doc())
      set((state) => {
        const next = finalizeDocument(result.doc)
        return {
          history: historyOps.commit(state.history, next),
          selection: prune(next, result.selection),
          tool: 'select',
        }
      })
    }

    return {
      history: historyOps.createHistory(initial),
      selection: [],
      tool: 'select',
      zoom: 0.5,
      panX: 80,
      panY: 80,
      // Zero until the canvas has been measured and the design fitted to it.
      viewWidth: 0,
      viewHeight: 0,
      editingId: null,
      guides: [],
      clipboard: [],

      apply: (change, key) =>
        set((state) => {
          const next = finalizeDocument(change(state.history.present))
          return { history: historyOps.commit(state.history, next, key ?? null), selection: prune(next, state.selection) }
        }),
      begin: () => set((state) => ({ history: historyOps.begin(state.history) })),
      preview: (change) =>
        set((state) => {
          const base = state.history.base ?? state.history.present
          return { history: historyOps.preview(state.history, finalizeDocument(change(base))) }
        }),
      end: () => set((state) => ({ history: historyOps.end(state.history), guides: [] })),
      undo: () =>
        set((state) => {
          const history = historyOps.undo(state.history)
          return { history, selection: prune(history.present, state.selection), editingId: null, guides: [] }
        }),
      redo: () =>
        set((state) => {
          const history = historyOps.redo(state.history)
          return { history, selection: prune(history.present, state.selection), editingId: null, guides: [] }
        }),
      select: (ids) => set({ selection: ids }),
      setTool: (tool) => set({ tool, selection: tool === 'select' || tool === 'hand' ? get().selection : [] }),
      setEditing: (editingId) => set({ editingId }),
      setGuides: (guides) => set({ guides }),
      setViewSize: (viewWidth, viewHeight) => set({ viewWidth, viewHeight }),
      panBy: (dx, dy) => set((state) => ({ panX: state.panX + dx, panY: state.panY + dy })),
      zoomAt: (target, screenX, screenY) =>
        set((state) => {
          const zoom = clampZoom(target)
          const x = screenX ?? state.viewWidth / 2
          const y = screenY ?? state.viewHeight / 2
          const worldX = (x - state.panX) / state.zoom
          const worldY = (y - state.panY) / state.zoom
          return { zoom, panX: x - worldX * zoom, panY: y - worldY * zoom }
        }),
      fitTo: (bounds) => {
        if (!bounds) return
        const { viewWidth, viewHeight } = get()
        const margin = 64
        const zoom = clampZoom(Math.min((viewWidth - margin * 2) / Math.max(1, bounds.width), (viewHeight - margin * 2) / Math.max(1, bounds.height), 1))
        set({
          zoom,
          panX: (viewWidth - bounds.width * zoom) / 2 - bounds.x * zoom,
          panY: (viewHeight - bounds.height * zoom) / 2 - bounds.y * zoom,
        })
      },
      fitAll: () => get().fitTo(unionBounds(childrenOf(doc(), null).filter((node) => node.visible))),

      insert: (spec, point) => {
        const current = doc()
        const at = point ?? center()
        const parent = findFrameAt(current, at)?.id ?? null
        const centered = (width: number, height: number) => ({ x: Math.round(at.x - width / 2), y: Math.round(at.y - height / 2) })
        if (spec.kind === 'frame') {
          const preset = FRAME_PRESETS.find((item) => item.id === spec.preset) ?? FRAME_PRESETS[0]
          const origin = point ? centered(preset.width, preset.height) : nextFrameOrigin(current)
          const frame = createNode('frame', { name: preset.name, width: preset.width, height: preset.height, ...origin })
          applyAndSelect((latest) => ({ doc: addNodes(latest, [frame]), selection: [frame.id] }))
          if (!point) get().fitTo(frame)
          return
        }
        if (spec.kind === 'component') {
          const component = current.components.find((item) => item.id === spec.id)
          const root = component && getNode(current, component.rootId)
          if (!root) return
          const placed = createInstance(current, spec.id, centered(root.width, root.height), parent)
          applyAndSelect(() => ({ doc: placed.doc, selection: placed.id ? [placed.id] : [] }))
          return
        }
        if (spec.kind === 'asset') {
          const asset = current.assets.find((item) => item.id === spec.id)
          if (!asset) return
          const image = imageNode(asset, at, parent)
          applyAndSelect((latest) => ({ doc: addNodes(latest, [image]), selection: [image.id] }))
          return
        }
        const fresh =
          spec.kind === 'icon'
            ? createNode('icon', { icon: spec.icon, name: spec.icon, parentId: parent })
            : createNode(spec.type, { parentId: parent })
        const node = { ...fresh, ...centered(fresh.width, fresh.height) }
        applyAndSelect((latest) => ({ doc: addNodes(latest, [node]), selection: [node.id] }))
      },

      placeImage: (image, point) => {
        const asset = { id: newId('a'), ...image }
        const at = point ?? center()
        applyAndSelect((current) => {
          const node = imageNode(asset, at, findFrameAt(current, at)?.id ?? null)
          return { doc: addNodes(addAsset(current, asset), [node]), selection: [node.id] }
        })
      },

      group: () => {
        const ids = editable(doc(), get().selection)
        if (ids.length < 2) return
        applyAndSelect((current) => {
          const result = groupNodes(current, ids)
          return { doc: result.doc, selection: result.id ? [result.id] : [] }
        })
      },
      ungroup: () => {
        const ids = editable(doc(), get().selection)
        if (!ids.some((id) => getNode(doc(), id)?.type === 'group')) return
        applyAndSelect((current) => {
          const result = ungroupNodes(current, ids)
          return { doc: result.doc, selection: result.ids }
        })
      },
      duplicate: () => {
        const ids = editable(doc(), get().selection)
        if (ids.length === 0) return
        applyAndSelect((current) => {
          const result = duplicateNodes(current, ids)
          return { doc: result.doc, selection: result.ids }
        })
      },
      remove: () => {
        const ids = editable(doc(), get().selection)
        if (ids.length === 0) return
        applyAndSelect((current) => ({ doc: deleteNodes(current, ids), selection: [] }))
      },
      order: (move) => {
        const ids = editable(doc(), get().selection)
        if (ids.length > 0) get().apply((current) => reorderNodes(current, ids, move))
      },
      copy: () => {
        const { selection } = get()
        if (selection.length > 0) set({ clipboard: cloneNodes(doc(), selection).nodes })
      },
      paste: () => {
        const { clipboard } = get()
        if (clipboard.length === 0) return
        const copies = new Map(clipboard.map((node) => [node.id, newId()]))
        const inClipboard = new Set(clipboard.map((node) => node.id))
        const current = doc()
        const roots = clipboard.filter((node) => !node.parentId || !inClipboard.has(node.parentId))
        const box = unionBounds(roots)
        const target = center()
        const dx = box ? Math.round(target.x - box.x - box.width / 2) : 0
        const dy = box ? Math.round(target.y - box.y - box.height / 2) : 0
        const frame = findFrameAt(current, target)?.id ?? null
        const nodes = clipboard.map((node) => ({
          ...node,
          id: copies.get(node.id)!,
          x: node.x + dx,
          y: node.y + dy,
          parentId: node.parentId && inClipboard.has(node.parentId) ? copies.get(node.parentId)! : node.type === 'frame' ? null : frame,
        }))
        applyAndSelect((latest) => ({ doc: addNodes(latest, nodes), selection: roots.map((node) => copies.get(node.id)!) }))
      },
      makeComponent: () => {
        const ids = editable(doc(), get().selection)
        if (ids.length === 0) return
        applyAndSelect((current) => {
          const result = createComponent(current, ids)
          return { doc: result.doc, selection: result.rootId ? [result.rootId] : ids }
        })
      },
      detach: () => {
        const ids = get().selection.filter((id) => getNode(doc(), id)?.type === 'instance')
        if (ids.length === 0) return
        applyAndSelect((current) => {
          let next = current
          const selection: string[] = []
          for (const id of ids) {
            const result = detachInstance(next, id)
            next = result.doc
            if (result.id) selection.push(result.id)
          }
          return { doc: next, selection }
        })
      },
      selectAll: () => set({ selection: childrenOf(doc(), null).filter((node) => node.visible && !node.locked).map((node) => node.id) }),
    }
  })
}

// ---------- finding elements under the pointer ----------

/**
 * The element under a point. Groups act as one element unless `deep` is set;
 * frames answer only when none of their children does. Locked or hidden elements
 * (and everything inside them) are transparent to the pointer.
 */
export function hitTest(doc: Doc, point: Point, zoom: number, deep = false): string | null {
  const walk = (parentId: string | null): string | null => {
    const kids = childrenOf(doc, parentId)
    for (let index = kids.length - 1; index >= 0; index -= 1) {
      const node = kids[index]
      if (!node.visible || node.locked) continue
      if (node.type === 'frame') {
        if (node.clip && !containsPoint(node, point)) continue
        const inner = walk(node.id)
        if (inner) return inner
        if (containsPoint(node, point)) return node.id
        continue
      }
      if (node.type === 'group') {
        const inner = walk(node.id)
        if (inner) return deep ? inner : node.id
        continue
      }
      if (containsPoint(node, point, node.type === 'line' ? 5 / zoom : 0)) return node.id
    }
    return null
  }
  return walk(null)
}

/** Screen-size label above a top-level frame: clicking it selects the frame. */
export function frameLabelAt(doc: Doc, point: Point, zoom: number): string | null {
  const height = 20 / zoom
  const frames = childrenOf(doc, null).filter((node) => node.type === 'frame' && node.visible && !node.locked)
  for (let index = frames.length - 1; index >= 0; index -= 1) {
    const frame = frames[index]
    if (containsPoint({ x: frame.x, y: frame.y - height, width: frame.width, height }, point)) return frame.id
  }
  return null
}

/** What a marquee selects: frames entirely inside it, or the elements it touches. */
export function marqueeHits(doc: Doc, box: Bounds): string[] {
  const inside = (node: Bounds) => node.x >= box.x && node.y >= box.y && node.x + node.width <= box.x + box.width && node.y + node.height <= box.y + box.height
  const walk = (parentId: string | null): string[] =>
    childrenOf(doc, parentId).flatMap((node) => {
      if (!node.visible || node.locked) return []
      if (node.type === 'frame') return inside(node) ? [node.id] : walk(node.id)
      return intersects(node, box) ? [node.id] : []
    })
  return walk(null)
}

export const selectionBounds = (doc: Doc, ids: string[]) => boundsOf(doc, ids)

// ---------- React access ----------

export const EditorContext = createContext<StoreApi<EditorState> | null>(null)

export function useEditorStore(): StoreApi<EditorState> {
  const store = useContext(EditorContext)
  if (!store) throw new Error('useEditorStore must be used inside the Design Studio editor')
  return store
}

export function useEditor<T>(selector: (state: EditorState) => T): T {
  return useStore(useEditorStore(), selector)
}

export const useDoc = () => useEditor((state) => state.history.present)
