import { describe, expect, it } from 'vitest'
import {
  addNodes,
  addToken,
  applyAutoLayout,
  createComponent,
  createDocument,
  createInstance,
  createNode,
  canPlaceInstance,
  deleteNodes,
  detachInstance,
  duplicateNodes,
  finalizeDocument,
  findFrameAt,
  getNode,
  groupNodes,
  moveLayer,
  moveNodes,
  normalizeDocument,
  removeToken,
  reorderNodes,
  resizeNode,
  resolveColor,
  snapBounds,
  ungroupNodes,
  updateToken,
} from './document'
import { begin, commit, createHistory, end, preview, redo, undo } from './history'
import { elToString, exportScope, toSvgString } from './export'
import { renderDocument } from './render'
import type { Doc } from './types'

const emptyDoc = (): Doc => ({ ...createDocument(), nodes: [] })

describe('elements', () => {
  it('moves a frame with everything inside it', () => {
    const frame = createNode('frame', { x: 0, y: 0, width: 400, height: 400 })
    const child = createNode('rect', { x: 10, y: 10, parentId: frame.id })
    const doc = moveNodes(addNodes(emptyDoc(), [frame, child]), [frame.id], 50, 20)
    expect(getNode(doc, frame.id)).toMatchObject({ x: 50, y: 20 })
    expect(getNode(doc, child.id)).toMatchObject({ x: 60, y: 30 })
  })

  it('stretches the children of a resized group', () => {
    const a = createNode('rect', { x: 0, y: 0, width: 50, height: 50 })
    const b = createNode('rect', { x: 50, y: 50, width: 50, height: 50 })
    const grouped = groupNodes(addNodes(emptyDoc(), [a, b]), [a.id, b.id])
    const doc = resizeNode(grouped.doc, grouped.id!, { x: 0, y: 0, width: 200, height: 200 })
    expect(getNode(doc, b.id)).toMatchObject({ x: 100, y: 100, width: 100, height: 100 })
  })

  it('groups and ungroups, keeping the elements', () => {
    const a = createNode('rect', { x: 0, y: 0, width: 10, height: 10 })
    const b = createNode('rect', { x: 90, y: 40, width: 10, height: 10 })
    const grouped = groupNodes(addNodes(emptyDoc(), [a, b]), [a.id, b.id])
    expect(getNode(grouped.doc, grouped.id!)).toMatchObject({ x: 0, y: 0, width: 100, height: 50 })
    const released = ungroupNodes(grouped.doc, [grouped.id!])
    expect(released.ids.sort()).toEqual([a.id, b.id].sort())
    expect(getNode(released.doc, grouped.id!)).toBeUndefined()
    expect(getNode(released.doc, a.id)?.parentId).toBeNull()
  })

  it('removes a group that lost all its children', () => {
    const a = createNode('rect')
    const grouped = groupNodes(addNodes(emptyDoc(), [a]), [a.id])
    const doc = finalizeDocument(deleteNodes(grouped.doc, [a.id]))
    expect(doc.nodes).toHaveLength(0)
  })

  it('duplicates a subtree with new ids', () => {
    const frame = createNode('frame')
    const child = createNode('rect', { parentId: frame.id, x: 5, y: 5 })
    const result = duplicateNodes(addNodes(emptyDoc(), [frame, child]), [frame.id, child.id])
    expect(result.ids).toHaveLength(1)
    expect(result.doc.nodes).toHaveLength(4)
    const copyChild = result.doc.nodes.find((node) => node.parentId === result.ids[0])
    expect(copyChild).toMatchObject({ x: 25, y: 25 })
    expect(copyChild?.id).not.toBe(child.id)
  })

  it('changes paint order among siblings', () => {
    const a = createNode('rect', { name: 'a' })
    const b = createNode('rect', { name: 'b' })
    const c = createNode('rect', { name: 'c' })
    const doc = addNodes(emptyDoc(), [a, b, c])
    const names = (next: Doc) => next.nodes.map((node) => node.name).join('')
    expect(names(reorderNodes(doc, [a.id], 'front'))).toBe('bca')
    expect(names(reorderNodes(doc, [c.id], 'back'))).toBe('cab')
    expect(names(reorderNodes(doc, [a.id], 'forward'))).toBe('bac')
    expect(names(reorderNodes(doc, [c.id], 'backward'))).toBe('acb')
  })

  it('moves a layer into a frame but never into itself', () => {
    const frame = createNode('frame')
    const inner = createNode('group', { parentId: frame.id })
    const rect = createNode('rect')
    const doc = addNodes(emptyDoc(), [frame, inner, rect])
    expect(getNode(moveLayer(doc, rect.id, frame.id, 'inside'), rect.id)?.parentId).toBe(frame.id)
    expect(moveLayer(doc, frame.id, inner.id, 'inside')).toBe(doc)
    expect(moveLayer(doc, frame.id, rect.id, 'inside')).toBe(doc)
  })

  it('finds the innermost frame under a point', () => {
    const outer = createNode('frame', { x: 0, y: 0, width: 500, height: 500 })
    const inner = createNode('frame', { x: 100, y: 100, width: 100, height: 100, parentId: outer.id })
    const doc = addNodes(emptyDoc(), [outer, inner])
    expect(findFrameAt(doc, { x: 150, y: 150 })?.id).toBe(inner.id)
    expect(findFrameAt(doc, { x: 10, y: 10 })?.id).toBe(outer.id)
    expect(findFrameAt(doc, { x: 900, y: 900 })).toBeNull()
    expect(findFrameAt(doc, { x: 150, y: 150 }, [inner.id])?.id).toBe(outer.id)
  })

  it('lays out auto-layout children using padding and gap', () => {
    const frame = createNode('frame', { x: 100, y: 100, layout: 'vertical', padding: 10, gap: 5 })
    const a = createNode('rect', { parentId: frame.id, width: 50, height: 20 })
    const b = createNode('rect', { parentId: frame.id, width: 50, height: 30 })
    const doc = applyAutoLayout(addNodes(emptyDoc(), [frame, a, b]))
    expect(getNode(doc, a.id)).toMatchObject({ x: 110, y: 110 })
    expect(getNode(doc, b.id)).toMatchObject({ x: 110, y: 135 })
  })

  it('snaps to the nearest edge and reports a guide', () => {
    const result = snapBounds({ x: 103, y: 500, width: 10, height: 10 }, [{ x: 100, y: 0, width: 50, height: 50 }], 5)
    expect(result.dx).toBe(-3)
    expect(result.dy).toBe(0)
    expect(result.guides).toEqual([{ axis: 'x', position: 100 }])
  })
})

describe('components', () => {
  const withComponent = () => {
    const main = createNode('rect', { x: 0, y: 0, width: 100, height: 50, fill: '#ff0000', name: 'Badge' })
    const created = createComponent(addNodes(emptyDoc(), [main]), [main.id])
    return { doc: created.doc, mainId: main.id, componentId: created.componentId! }
  }

  it('instances follow their main component', () => {
    const { doc, mainId, componentId } = withComponent()
    const placed = createInstance(doc, componentId, { x: 200, y: 0 }, null)
    const before = renderDocument(placed.doc, [placed.id!]).map(elToString).join('')
    expect(before).toContain('#ff0000')
    const edited = { ...placed.doc, nodes: placed.doc.nodes.map((node) => (node.id === mainId ? { ...node, fill: '#00ff00' } : node)) }
    expect(renderDocument(edited, [placed.id!]).map(elToString).join('')).toContain('#00ff00')
  })

  it('detaches an instance into an editable copy at the same place', () => {
    const { doc, componentId } = withComponent()
    const placed = createInstance(doc, componentId, { x: 200, y: 10 }, null)
    const detached = detachInstance(placed.doc, placed.id!)
    expect(getNode(detached.doc, placed.id!)).toBeUndefined()
    expect(getNode(detached.doc, detached.id!)).toMatchObject({ type: 'rect', x: 200, y: 10, width: 100, height: 50 })
  })

  it('keeps instances as copies when the main component is deleted', () => {
    const { doc, mainId, componentId } = withComponent()
    const placed = createInstance(doc, componentId, { x: 200, y: 0 }, null)
    const next = deleteNodes(placed.doc, [mainId])
    expect(next.components).toHaveLength(0)
    expect(next.nodes).toHaveLength(1)
    expect(next.nodes[0]).toMatchObject({ type: 'rect', x: 200 })
  })

  it('does not allow an instance inside its own main component', () => {
    const frame = createNode('frame', { width: 300, height: 300 })
    const created = createComponent(addNodes(emptyDoc(), [frame]), [frame.id])
    expect(canPlaceInstance(created.doc, created.componentId!, frame.id)).toBe(false)
    expect(canPlaceInstance(created.doc, created.componentId!, null)).toBe(true)
    const placed = createInstance(created.doc, created.componentId!, { x: 0, y: 0 }, frame.id)
    expect(getNode(placed.doc, placed.id!)?.parentId).toBeNull()
  })
})

describe('design tokens', () => {
  it('changing a token changes every element that uses it', () => {
    const rect = createNode('rect', { fill: '$color-primary' })
    const doc = addNodes(emptyDoc(), [rect])
    const next = updateToken(doc, 'colors', 'color-primary', { value: '#123456' })
    expect(resolveColor(next, '$color-primary')).toBe('#123456')
    expect(renderDocument(next).map(elToString).join('')).toContain('#123456')
  })

  it('removing a token keeps the look by baking in its value', () => {
    const rect = createNode('rect', { fill: '$color-primary', radius: '$radius-lg', x: 0, y: 0 })
    const doc = addNodes(emptyDoc(), [rect])
    const noColor = removeToken(doc, 'colors', 'color-primary')
    expect(getNode(noColor, rect.id)?.fill).toBe('#2449f5')
    const noRadius = removeToken(doc, 'radius', 'radius-lg')
    expect(getNode(noRadius, rect.id)?.radius).toBe(16)
  })

  it('adds a token of each kind', () => {
    for (const kind of ['colors', 'spacing', 'radius', 'typography'] as const) {
      const doc = addToken(emptyDoc(), kind)
      expect(doc.tokens[kind].length).toBe(emptyDoc().tokens[kind].length + 1)
    }
  })
})

describe('history', () => {
  it('undoes and redoes commits', () => {
    const a = emptyDoc()
    const b = { ...a, background: '#000000' }
    let history = commit(createHistory(a), b)
    expect(history.present).toBe(b)
    history = undo(history)
    expect(history.present).toBe(a)
    history = redo(history)
    expect(history.present).toBe(b)
  })

  it('turns a whole drag into one undo step', () => {
    const a = emptyDoc()
    let history = begin(createHistory(a))
    history = preview(history, { ...a, background: '#111111' })
    history = preview(history, { ...a, background: '#222222' })
    history = end(history)
    expect(history.past).toHaveLength(1)
    expect(undo(history).present).toBe(a)
  })

  it('merges quick edits with the same key, but not others', () => {
    const a = emptyDoc()
    let history = commit(createHistory(a), { ...a, background: '#111111' }, 'fill', 1000)
    history = commit(history, { ...a, background: '#222222' }, 'fill', 1200)
    expect(history.past).toHaveLength(1)
    history = commit(history, { ...a, background: '#333333' }, 'fill', 5000)
    expect(history.past).toHaveLength(2)
  })

  it('drops the redo steps after a new edit', () => {
    const a = emptyDoc()
    let history = undo(commit(createHistory(a), { ...a, background: '#111111' }))
    history = commit(history, { ...a, background: '#222222' })
    expect(history.future).toHaveLength(0)
  })
})

describe('export', () => {
  it('writes the selected elements to SVG, cropped to them', () => {
    const rect = createNode('rect', { x: 100, y: 200, width: 50, height: 60, fill: '#abcdef' })
    const other = createNode('rect', { x: 900, y: 900, width: 10, height: 10, fill: '#fedcba' })
    const doc = addNodes(emptyDoc(), [rect, other])
    const { svg, width, height } = toSvgString(doc, exportScope(doc, [rect.id])!)
    expect(svg).toContain('viewBox="100 200 50 60"')
    expect(svg).toContain('#abcdef')
    expect(svg).not.toContain('#fedcba')
    expect([width, height]).toEqual([50, 60])
    expect(new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror')).toBeNull()
  })

  it('escapes text, so it cannot break out of the SVG', () => {
    const label = createNode('text', { text: '<script>alert(1)</script> & "x"', width: 900 })
    const doc = addNodes(emptyDoc(), [label])
    const { svg } = toSvgString(doc, exportScope(doc, [label.id])!)
    expect(svg).not.toContain('<script>')
    expect(new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror')).toBeNull()
  })

  it('exports the whole page when nothing is selected', () => {
    const doc = addNodes(emptyDoc(), [createNode('rect', { x: 0, y: 0, width: 10, height: 10 }), createNode('rect', { x: 90, y: 40, width: 10, height: 10 })])
    expect(exportScope(doc, [])?.bounds).toEqual({ x: 0, y: 0, width: 100, height: 50 })
    expect(exportScope(emptyDoc(), [])).toBeNull()
  })

  it('renders hidden elements as nothing', () => {
    const rect = createNode('rect', { visible: false })
    expect(renderDocument(addNodes(emptyDoc(), [rect]))).toHaveLength(0)
  })
})

describe('loading saved documents', () => {
  it('falls back to a new document for anything unusable', () => {
    for (const raw of [null, 'x', 42, {}, { nodes: 'no' }]) {
      expect(normalizeDocument(raw).nodes.length).toBe(1)
    }
  })

  it('repairs broken references and drops unknown elements', () => {
    const doc = normalizeDocument({
      nodes: [
        { id: 'a', type: 'rect', parentId: 'missing', x: 'nope', fill: 'url(https://example.test/x)' },
        { id: 'b', type: 'rect', parentId: 'c' },
        { id: 'c', type: 'group', parentId: 'b' },
        { id: 'd', type: 'hacker' },
        { id: 'a', type: 'ellipse' },
      ],
      components: [{ id: 'x', rootId: 'gone' }],
    })
    expect(doc.nodes.map((node) => node.id)).toEqual(['a', 'b', 'c'])
    expect(doc.nodes[0]).toMatchObject({ parentId: null, x: 0 })
    expect(doc.nodes[0].fill).not.toContain('url')
    expect(doc.nodes.some((node) => node.parentId === null && node.id !== 'a')).toBe(true)
    expect(doc.components).toHaveLength(0)
  })

  it('keeps only embedded images', () => {
    const doc = normalizeDocument({
      nodes: [],
      assets: [
        { id: 'ok', src: 'data:image/png;base64,AAAA' },
        { id: 'bad', src: 'https://example.test/tracker.png' },
      ],
    })
    expect(doc.assets.map((asset) => asset.id)).toEqual(['ok'])
  })

  it('survives a round trip through JSON', () => {
    const doc = addNodes(createDocument(), [createNode('button', { x: 5, y: 6 })])
    expect(normalizeDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
  })
})
