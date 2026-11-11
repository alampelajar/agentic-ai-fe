import {
  NODE_TYPES,
  type Bounds,
  type ColorValue,
  type DesignAsset,
  type DesignComponent,
  type DesignNode,
  type DesignTokens,
  type Doc,
  type NodeType,
  type Point,
  type SizeValue,
} from './types'

export const FRAME_PRESETS = [
  { id: 'desktop', name: 'Desktop', width: 1440, height: 900 },
  { id: 'laptop', name: 'Laptop', width: 1280, height: 800 },
  { id: 'tablet', name: 'Tablet', width: 768, height: 1024 },
  { id: 'mobile', name: 'Mobile', width: 390, height: 844 },
] as const

export const FONT_FAMILIES = ['Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS'] as const

let idCounter = 0
export function newId(prefix = 'n'): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

const defaultName: Record<NodeType, string> = {
  frame: 'Frame',
  group: 'Group',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  text: 'Text',
  image: 'Image',
  icon: 'Icon',
  button: 'Button',
  input: 'Input',
  card: 'Card',
  instance: 'Instance',
}

const typeDefaults: Record<NodeType, Partial<DesignNode>> = {
  frame: { width: 1440, height: 900, fill: '#ffffff', clip: true },
  group: { fill: '' },
  rect: { width: 160, height: 120, fill: '$color-surface-muted' },
  ellipse: { width: 120, height: 120, fill: '$color-primary' },
  line: { width: 200, height: 0, fill: '', stroke: '$color-text', strokeWidth: 2 },
  text: { width: 240, height: 32, fill: '', text: 'Text', padding: 0 },
  image: { width: 240, height: 180, fill: '$color-surface-muted' },
  icon: { width: 32, height: 32, fill: '', stroke: '$color-text', strokeWidth: 2, icon: 'star' },
  button: { width: 140, height: 44, fill: '$color-primary', text: 'Button', textColor: '#ffffff', textAlign: 'center', radius: '$radius-md', fontWeight: 600, padding: '$space-md' },
  input: { width: 280, height: 44, fill: '#ffffff', stroke: '$color-border', strokeWidth: 1, text: 'Placeholder', textColor: '$color-text-muted', radius: '$radius-md', padding: '$space-md' },
  card: { width: 320, height: 180, fill: '#ffffff', stroke: '$color-border', strokeWidth: 1, text: 'Card title\nA short description of this card.', radius: '$radius-lg', padding: '$space-lg' },
  instance: { fill: '' },
}

export function createNode(type: NodeType, overrides: Partial<DesignNode> = {}): DesignNode {
  return {
    id: newId(),
    type,
    name: defaultName[type],
    parentId: null,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    visible: true,
    locked: false,
    opacity: 1,
    fill: '',
    stroke: '',
    strokeWidth: 0,
    radius: 0,
    padding: 0,
    text: '',
    textColor: '$color-text',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.4,
    textAlign: 'left',
    textStyle: '',
    layout: 'none',
    gap: 0,
    clip: false,
    flipY: false,
    assetId: '',
    icon: '',
    componentId: '',
    ...typeDefaults[type],
    ...overrides,
  }
}

export function defaultTokens(): DesignTokens {
  return {
    colors: [
      { id: 'color-primary', name: 'Primary', value: '#2449f5' },
      { id: 'color-text', name: 'Text', value: '#18181b' },
      { id: 'color-text-muted', name: 'Text muted', value: '#71717a' },
      { id: 'color-border', name: 'Border', value: '#e4e4e7' },
      { id: 'color-surface-muted', name: 'Surface muted', value: '#d9d9d9' },
    ],
    spacing: [
      { id: 'space-sm', name: 'Small', value: 8 },
      { id: 'space-md', name: 'Medium', value: 16 },
      { id: 'space-lg', name: 'Large', value: 24 },
    ],
    radius: [
      { id: 'radius-sm', name: 'Small', value: 4 },
      { id: 'radius-md', name: 'Medium', value: 8 },
      { id: 'radius-lg', name: 'Large', value: 16 },
    ],
    typography: [
      { id: 'type-heading', name: 'Heading', fontFamily: 'Inter', fontSize: 32, fontWeight: 700, lineHeight: 1.2 },
      { id: 'type-subheading', name: 'Subheading', fontFamily: 'Inter', fontSize: 20, fontWeight: 600, lineHeight: 1.3 },
      { id: 'type-body', name: 'Body', fontFamily: 'Inter', fontSize: 16, fontWeight: 400, lineHeight: 1.5 },
    ],
  }
}

export function createDocument(): Doc {
  return {
    version: 1,
    background: '#f4f4f5',
    nodes: [createNode('frame', { name: 'Desktop', x: 0, y: 0, width: 1440, height: 900 })],
    components: [],
    assets: [],
    tokens: defaultTokens(),
  }
}

// ---------- reading ----------

export const getNode = (doc: Doc, id: string) => doc.nodes.find((node) => node.id === id)
export const childrenOf = (doc: Doc, parentId: string | null) => doc.nodes.filter((node) => node.parentId === parentId)

export function descendantIds(doc: Doc, id: string): string[] {
  const result: string[] = []
  for (const child of childrenOf(doc, id)) result.push(child.id, ...descendantIds(doc, child.id))
  return result
}

export function ancestorIds(doc: Doc, id: string): string[] {
  const result: string[] = []
  const seen = new Set([id])
  let current = getNode(doc, id)?.parentId ?? null
  while (current && !seen.has(current)) {
    seen.add(current)
    result.push(current)
    current = getNode(doc, current)?.parentId ?? null
  }
  return result
}

/** Drops ids whose ancestor is also listed, so a subtree is handled once. */
export function topLevelOf(doc: Doc, ids: string[]): string[] {
  const set = new Set(ids)
  return ids.filter((id) => !ancestorIds(doc, id).some((ancestor) => set.has(ancestor)))
}

export function unionBounds(items: Bounds[]): Bounds | null {
  if (items.length === 0) return null
  const left = Math.min(...items.map((b) => b.x))
  const top = Math.min(...items.map((b) => b.y))
  const right = Math.max(...items.map((b) => b.x + b.width))
  const bottom = Math.max(...items.map((b) => b.y + b.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

export function boundsOf(doc: Doc, ids: string[]): Bounds | null {
  return unionBounds(ids.map((id) => getNode(doc, id)).filter((node): node is DesignNode => !!node))
}

export const intersects = (a: Bounds, b: Bounds) => a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
export const containsPoint = (b: Bounds, p: Point, slop = 0) => p.x >= b.x - slop && p.x <= b.x + b.width + slop && p.y >= b.y - slop && p.y <= b.y + b.height + slop

// ---------- tokens ----------

const tokenId = (value: unknown) => (typeof value === 'string' && value.startsWith('$') ? value.slice(1) : null)

export function resolveColor(doc: Doc, value: ColorValue): string {
  const id = tokenId(value)
  if (id === null) return value
  return doc.tokens.colors.find((token) => token.id === id)?.value ?? ''
}

export function resolveSpacing(doc: Doc, value: SizeValue): number {
  const id = tokenId(value)
  if (id === null) return Number(value) || 0
  return doc.tokens.spacing.find((token) => token.id === id)?.value ?? 0
}

export function resolveRadius(doc: Doc, value: SizeValue): number {
  const id = tokenId(value)
  if (id === null) return Number(value) || 0
  return doc.tokens.radius.find((token) => token.id === id)?.value ?? 0
}

export function resolveTypography(doc: Doc, node: DesignNode) {
  const style = node.textStyle ? doc.tokens.typography.find((token) => token.id === node.textStyle) : undefined
  return {
    fontFamily: style?.fontFamily ?? node.fontFamily,
    fontSize: style?.fontSize ?? node.fontSize,
    fontWeight: style?.fontWeight ?? node.fontWeight,
    lineHeight: style?.lineHeight ?? node.lineHeight,
  }
}

export type TokenKind = keyof DesignTokens

export function updateToken(doc: Doc, kind: TokenKind, id: string, patch: Record<string, unknown>): Doc {
  const list = doc.tokens[kind] as { id: string }[]
  return { ...doc, tokens: { ...doc.tokens, [kind]: list.map((token) => (token.id === id ? { ...token, ...patch } : token)) } }
}

export function addToken(doc: Doc, kind: TokenKind): Doc {
  const id = newId(kind)
  const count = doc.tokens[kind].length + 1
  const fresh =
    kind === 'colors' ? { id, name: `Color ${count}`, value: '#2449f5' }
    : kind === 'typography' ? { id, name: `Style ${count}`, fontFamily: 'Inter', fontSize: 16, fontWeight: 400, lineHeight: 1.5 }
    : { id, name: `Size ${count}`, value: 8 }
  return { ...doc, tokens: { ...doc.tokens, [kind]: [...doc.tokens[kind], fresh] } }
}

/** Removing a token keeps every element looking the same: uses become plain values. */
export function removeToken(doc: Doc, kind: TokenKind, id: string): Doc {
  const ref = `$${id}`
  const nodes = doc.nodes.map((node) => {
    const next = { ...node }
    if (kind === 'colors') {
      const value = resolveColor(doc, ref)
      if (next.fill === ref) next.fill = value
      if (next.stroke === ref) next.stroke = value
      if (next.textColor === ref) next.textColor = value
    } else if (kind === 'spacing') {
      const value = resolveSpacing(doc, ref)
      if (next.padding === ref) next.padding = value
      if (next.gap === ref) next.gap = value
    } else if (kind === 'radius') {
      if (next.radius === ref) next.radius = resolveRadius(doc, ref)
    } else if (next.textStyle === id) {
      const type = resolveTypography(doc, next)
      Object.assign(next, type, { textStyle: '' })
    }
    return next
  })
  const list = doc.tokens[kind] as { id: string }[]
  return { ...doc, nodes, tokens: { ...doc.tokens, [kind]: list.filter((token) => token.id !== id) } }
}

// ---------- changing nodes ----------

export function addNodes(doc: Doc, nodes: DesignNode[]): Doc {
  return { ...doc, nodes: [...doc.nodes, ...nodes] }
}

export function updateNodes(doc: Doc, ids: string[], patch: Partial<DesignNode>): Doc {
  const set = new Set(ids)
  return { ...doc, nodes: doc.nodes.map((node) => (set.has(node.id) ? { ...node, ...patch } : node)) }
}

export function moveNodes(doc: Doc, ids: string[], dx: number, dy: number): Doc {
  if (dx === 0 && dy === 0) return doc
  const moving = new Set<string>()
  for (const id of ids) {
    moving.add(id)
    for (const child of descendantIds(doc, id)) moving.add(child)
  }
  return { ...doc, nodes: doc.nodes.map((node) => (moving.has(node.id) ? { ...node, x: node.x + dx, y: node.y + dy } : node)) }
}

/** Frames keep their children in place; groups stretch them along. */
export function resizeNode(doc: Doc, id: string, next: Bounds): Doc {
  const node = getNode(doc, id)
  if (!node) return doc
  const width = Math.max(1, next.width)
  const height = node.type === 'line' ? Math.max(0, next.height) : Math.max(1, next.height)
  if (node.type === 'group') {
    const sx = node.width ? width / node.width : 1
    const sy = node.height ? height / node.height : 1
    const inside = new Set(descendantIds(doc, id))
    return {
      ...doc,
      nodes: doc.nodes.map((item) =>
        item.id === id ? { ...item, x: next.x, y: next.y, width, height }
        : inside.has(item.id) ? { ...item, x: next.x + (item.x - node.x) * sx, y: next.y + (item.y - node.y) * sy, width: item.width * sx, height: item.height * sy }
        : item,
      ),
    }
  }
  return updateNodes(doc, [id], { x: next.x, y: next.y, width, height })
}

/** Removes the elements and everything inside them. Instances of a removed main component become plain copies. */
export function deleteNodes(doc: Doc, ids: string[]): Doc {
  let current = doc
  const remove = new Set<string>()
  for (const id of ids) {
    remove.add(id)
    for (const child of descendantIds(doc, id)) remove.add(child)
  }
  for (const component of doc.components.filter((item) => remove.has(item.rootId))) {
    current = detachAllInstances(current, component.id, remove)
  }
  return {
    ...current,
    nodes: current.nodes.filter((node) => !remove.has(node.id)),
    components: current.components.filter((component) => !remove.has(component.rootId)),
  }
}

function detachAllInstances(doc: Doc, componentId: string, skip: Set<string>): Doc {
  let current = doc
  for (const node of doc.nodes) {
    if (node.type === 'instance' && node.componentId === componentId && !skip.has(node.id)) {
      current = detachInstance(current, node.id).doc
    }
  }
  return current
}

function cloneSubtree(doc: Doc, rootId: string, map: Map<string, string> = new Map()): DesignNode[] {
  const root = getNode(doc, rootId)
  if (!root) return []
  const ids = [rootId, ...descendantIds(doc, rootId)]
  for (const id of ids) map.set(id, newId())
  return doc.nodes
    .filter((node) => map.has(node.id))
    .map((node) => ({ ...node, id: map.get(node.id)!, parentId: node.parentId ? (map.get(node.parentId) ?? node.parentId) : null }))
}

/** Copies whole subtrees, for duplicate and paste. Returns the copies of the given roots. */
export function cloneNodes(doc: Doc, ids: string[]): { roots: string[]; nodes: DesignNode[] } {
  const roots: string[] = []
  const nodes: DesignNode[] = []
  for (const id of topLevelOf(doc, ids)) {
    const map = new Map<string, string>()
    nodes.push(...cloneSubtree(doc, id, map))
    roots.push(map.get(id)!)
  }
  return { roots, nodes }
}

export function duplicateNodes(doc: Doc, ids: string[], offset = 20): { doc: Doc; ids: string[] } {
  const { roots, nodes } = cloneNodes(doc, ids)
  const shifted = nodes.map((node) => ({ ...node, x: node.x + offset, y: node.y + offset }))
  return { doc: addNodes(doc, shifted), ids: roots }
}

// ---------- layer order and nesting ----------

export type ReorderMove = 'front' | 'back' | 'forward' | 'backward'

export function reorderNodes(doc: Doc, ids: string[], move: ReorderMove): Doc {
  let nodes = doc.nodes
  const ordered = move === 'forward' || move === 'back' ? [...ids].reverse() : ids
  for (const id of ordered) {
    const node = nodes.find((item) => item.id === id)
    if (!node) continue
    const siblings = nodes.filter((item) => item.parentId === node.parentId)
    const position = siblings.findIndex((item) => item.id === id)
    const target =
      move === 'front' ? siblings.length - 1
      : move === 'back' ? 0
      : move === 'forward' ? Math.min(siblings.length - 1, position + 1)
      : Math.max(0, position - 1)
    if (target === position) continue
    const without = nodes.filter((item) => item.id !== id)
    const anchor = siblings[target]
    const anchorIndex = without.findIndex((item) => item.id === anchor.id)
    nodes = [...without.slice(0, anchorIndex + (target > position ? 1 : 0)), node, ...without.slice(anchorIndex + (target > position ? 1 : 0))]
  }
  return nodes === doc.nodes ? doc : { ...doc, nodes }
}

/** Moves a layer next to another one, or inside a frame or group. */
export function moveLayer(doc: Doc, id: string, targetId: string, position: 'above' | 'below' | 'inside'): Doc {
  if (id === targetId) return doc
  const node = getNode(doc, id)
  const target = getNode(doc, targetId)
  if (!node || !target) return doc
  if (descendantIds(doc, id).includes(targetId)) return doc
  if (position === 'inside' && target.type !== 'frame' && target.type !== 'group') return doc
  const parentId = position === 'inside' ? target.id : target.parentId
  const without = doc.nodes.filter((item) => item.id !== id)
  const moved = { ...node, parentId }
  let index: number
  if (position === 'inside') {
    index = without.length
  } else {
    const targetIndex = without.findIndex((item) => item.id === targetId)
    // Layers list the top of the stack first, so "above" paints later.
    index = position === 'above' ? targetIndex + 1 : targetIndex
  }
  return { ...doc, nodes: [...without.slice(0, index), moved, ...without.slice(index)] }
}

export function setParent(doc: Doc, id: string, parentId: string | null): Doc {
  const node = getNode(doc, id)
  if (!node || node.parentId === parentId || id === parentId) return doc
  if (parentId && descendantIds(doc, id).includes(parentId)) return doc
  const without = doc.nodes.filter((item) => item.id !== id)
  return { ...doc, nodes: [...without, { ...node, parentId }] }
}

/** The topmost visible frame under a point, ignoring the given elements. */
export function findFrameAt(doc: Doc, point: Point, excludeIds: string[] = []): DesignNode | null {
  const excluded = new Set<string>()
  for (const id of excludeIds) {
    excluded.add(id)
    for (const child of descendantIds(doc, id)) excluded.add(child)
  }
  let found: DesignNode | null = null
  const visit = (parentId: string | null) => {
    for (const node of childrenOf(doc, parentId)) {
      if (!node.visible || excluded.has(node.id)) continue
      if (node.type === 'frame' && containsPoint(node, point)) {
        found = node
        visit(node.id)
      } else if (node.type === 'group') {
        visit(node.id)
      }
    }
  }
  visit(null)
  return found
}

export function groupNodes(doc: Doc, ids: string[]): { doc: Doc; id: string | null } {
  const roots = topLevelOf(doc, ids)
  const bounds = boundsOf(doc, roots)
  if (roots.length === 0 || !bounds) return { doc, id: null }
  const parentId = getNode(doc, roots[0])?.parentId ?? null
  const group = createNode('group', { ...bounds, parentId })
  const set = new Set(roots)
  const anchorIndex = doc.nodes.reduce((last, node, index) => (set.has(node.id) ? index : last), 0)
  const nodes = doc.nodes.map((node) => (set.has(node.id) ? { ...node, parentId: group.id } : node))
  return { doc: { ...doc, nodes: [...nodes.slice(0, anchorIndex), group, ...nodes.slice(anchorIndex)] }, id: group.id }
}

export function ungroupNodes(doc: Doc, ids: string[]): { doc: Doc; ids: string[] } {
  let current = doc
  const released: string[] = []
  for (const id of ids) {
    const node = getNode(current, id)
    if (node?.type !== 'group') {
      released.push(id)
      continue
    }
    const kids = childrenOf(current, id).map((child) => child.id)
    released.push(...kids)
    const set = new Set(kids)
    current = {
      ...current,
      nodes: current.nodes.filter((item) => item.id !== id).map((item) => (set.has(item.id) ? { ...item, parentId: node.parentId } : item)),
      components: current.components.filter((component) => component.rootId !== id),
    }
  }
  return { doc: current, ids: released }
}

// ---------- components ----------

export function createComponent(doc: Doc, ids: string[]): { doc: Doc; componentId: string | null; rootId: string | null } {
  let current = doc
  const roots = topLevelOf(doc, ids)
  if (roots.length === 0) return { doc, componentId: null, rootId: null }
  let rootId = roots[0]
  if (roots.length > 1) {
    const grouped = groupNodes(current, roots)
    current = grouped.doc
    rootId = grouped.id!
  }
  const root = getNode(current, rootId)
  if (!root || root.type === 'instance') return { doc, componentId: null, rootId: null }
  const existing = current.components.find((component) => component.rootId === rootId)
  if (existing) return { doc: current, componentId: existing.id, rootId }
  const component: DesignComponent = { id: newId('c'), name: root.name === 'Group' ? `Component ${current.components.length + 1}` : root.name, rootId }
  return { doc: { ...current, components: [...current.components, component] }, componentId: component.id, rootId }
}

/** True when a component's main subtree contains an instance of the other component, directly or not. */
function componentUses(doc: Doc, componentId: string, target: string, seen = new Set<string>()): boolean {
  if (componentId === target) return true
  if (seen.has(componentId)) return false
  seen.add(componentId)
  const component = doc.components.find((item) => item.id === componentId)
  if (!component) return false
  return [component.rootId, ...descendantIds(doc, component.rootId)].some((id) => {
    const node = getNode(doc, id)
    return node?.type === 'instance' && componentUses(doc, node.componentId, target, seen)
  })
}

/** An instance may not be placed inside its own main component. */
export function canPlaceInstance(doc: Doc, componentId: string, parentId: string | null): boolean {
  if (!parentId) return true
  const chain = [parentId, ...ancestorIds(doc, parentId)]
  return !doc.components.some((component) => chain.includes(component.rootId) && componentUses(doc, componentId, component.id))
}

export function createInstance(doc: Doc, componentId: string, point: Point, parentId: string | null): { doc: Doc; id: string | null } {
  const component = doc.components.find((item) => item.id === componentId)
  const root = component && getNode(doc, component.rootId)
  if (!component || !root) return { doc, id: null }
  const safeParent = canPlaceInstance(doc, componentId, parentId) ? parentId : null
  const instance = createNode('instance', { name: component.name, componentId, parentId: safeParent, x: point.x, y: point.y, width: root.width, height: root.height })
  return { doc: addNodes(doc, [instance]), id: instance.id }
}

/** Turns an instance into an ordinary editable copy of its main component. */
export function detachInstance(doc: Doc, id: string): { doc: Doc; id: string | null } {
  const node = getNode(doc, id)
  if (node?.type !== 'instance') return { doc, id: null }
  const component = doc.components.find((item) => item.id === node.componentId)
  const root = component && getNode(doc, component.rootId)
  if (!root) return { doc: { ...doc, nodes: doc.nodes.filter((item) => item.id !== id) }, id: null }
  const map = new Map<string, string>()
  const copies = cloneSubtree(doc, root.id, map)
  const sx = root.width ? node.width / root.width : 1
  const sy = root.height ? node.height / root.height : 1
  const placed = copies.map((copy) => ({
    ...copy,
    x: node.x + (copy.x - root.x) * sx,
    y: node.y + (copy.y - root.y) * sy,
    width: copy.width * sx,
    height: copy.height * sy,
    parentId: copy.id === map.get(root.id) ? node.parentId : copy.parentId,
    name: copy.id === map.get(root.id) ? node.name : copy.name,
    opacity: copy.id === map.get(root.id) ? node.opacity : copy.opacity,
  }))
  const index = doc.nodes.findIndex((item) => item.id === id)
  return {
    doc: { ...doc, nodes: [...doc.nodes.slice(0, index), ...placed, ...doc.nodes.slice(index + 1)] },
    id: map.get(root.id) ?? null,
  }
}

/** Removes a component definition. Its main stays on the canvas; instances become plain copies. */
export function deleteComponent(doc: Doc, componentId: string): Doc {
  const detached = detachAllInstances(doc, componentId, new Set())
  return { ...detached, components: detached.components.filter((component) => component.id !== componentId) }
}

// ---------- assets ----------

export function assetInUse(doc: Doc, assetId: string): boolean {
  return doc.nodes.some((node) => node.assetId === assetId)
}

export function addAsset(doc: Doc, asset: DesignAsset): Doc {
  return { ...doc, assets: [...doc.assets, asset] }
}

// ---------- keeping the document consistent ----------

function refreshGroups(doc: Doc): Doc {
  let nodes = doc.nodes
  let changed = false
  const depth = (id: string) => ancestorIds(doc, id).length
  const groups = doc.nodes.filter((node) => node.type === 'group').sort((a, b) => depth(b.id) - depth(a.id))
  for (const group of groups) {
    const kids = nodes.filter((node) => node.parentId === group.id)
    if (kids.length === 0) {
      nodes = nodes.filter((node) => node.id !== group.id)
      changed = true
      continue
    }
    const bounds = unionBounds(kids)!
    const current = nodes.find((node) => node.id === group.id)!
    if (current.x !== bounds.x || current.y !== bounds.y || current.width !== bounds.width || current.height !== bounds.height) {
      nodes = nodes.map((node) => (node.id === group.id ? { ...node, ...bounds } : node))
      changed = true
    }
  }
  return changed ? { ...doc, nodes, components: doc.components.filter((component) => nodes.some((node) => node.id === component.rootId)) } : doc
}

/** Places the children of auto-layout frames, using the frame's padding and gap. */
export function applyAutoLayout(doc: Doc): Doc {
  let current = doc
  for (const frame of doc.nodes) {
    if (frame.type !== 'frame' || frame.layout === 'none') continue
    const padding = resolveSpacing(current, frame.padding)
    const gap = resolveSpacing(current, frame.gap)
    const live = getNode(current, frame.id)!
    let cursor = padding
    for (const child of childrenOf(current, frame.id).filter((node) => node.visible)) {
      const targetX = frame.layout === 'horizontal' ? live.x + cursor : live.x + padding
      const targetY = frame.layout === 'vertical' ? live.y + cursor : live.y + padding
      current = moveNodes(current, [child.id], targetX - child.x, targetY - child.y)
      cursor += (frame.layout === 'horizontal' ? child.width : child.height) + gap
    }
  }
  return current
}

/** Runs after every edit: keeps group bounds and auto layout correct. */
export function finalizeDocument(doc: Doc): Doc {
  return refreshGroups(applyAutoLayout(doc))
}

// ---------- loading saved documents ----------

const COLOR_PATTERN = /^(#[0-9a-f]{3,8}|\$[\w-]+)?$/i

const finite = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)
const text = (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback)
const color = (value: unknown, fallback: string) => (typeof value === 'string' && COLOR_PATTERN.test(value) ? value : fallback)
const size = (value: unknown, fallback: SizeValue): SizeValue =>
  typeof value === 'number' && Number.isFinite(value) ? value
  : typeof value === 'string' && value.startsWith('$') ? value
  : fallback

function normalizeNode(raw: Record<string, unknown>): DesignNode | null {
  const type = raw.type as NodeType
  if (!NODE_TYPES.includes(type) || typeof raw.id !== 'string' || !raw.id) return null
  const base = createNode(type)
  const align = raw.textAlign
  const layout = raw.layout
  return {
    ...base,
    id: raw.id,
    name: text(raw.name, base.name),
    parentId: typeof raw.parentId === 'string' ? raw.parentId : null,
    x: finite(raw.x, 0),
    y: finite(raw.y, 0),
    width: Math.max(0, finite(raw.width, base.width)),
    height: Math.max(0, finite(raw.height, base.height)),
    visible: raw.visible !== false,
    locked: raw.locked === true,
    opacity: Math.min(1, Math.max(0, finite(raw.opacity, 1))),
    fill: color(raw.fill, base.fill),
    stroke: color(raw.stroke, base.stroke),
    strokeWidth: Math.max(0, finite(raw.strokeWidth, base.strokeWidth)),
    radius: size(raw.radius, base.radius),
    padding: size(raw.padding, base.padding),
    text: text(raw.text, base.text),
    textColor: color(raw.textColor, base.textColor),
    fontFamily: text(raw.fontFamily, base.fontFamily),
    fontSize: Math.max(1, finite(raw.fontSize, base.fontSize)),
    fontWeight: finite(raw.fontWeight, base.fontWeight),
    lineHeight: Math.max(0.5, finite(raw.lineHeight, base.lineHeight)),
    textAlign: align === 'center' || align === 'right' ? align : 'left',
    textStyle: text(raw.textStyle, ''),
    layout: layout === 'vertical' || layout === 'horizontal' ? layout : 'none',
    gap: size(raw.gap, 0),
    clip: raw.clip === true,
    flipY: raw.flipY === true,
    assetId: text(raw.assetId, ''),
    icon: text(raw.icon, base.icon),
    componentId: text(raw.componentId, ''),
  }
}

function list<T>(value: unknown, read: (item: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const parsed = read(item as Record<string, unknown>)
    return parsed ? [parsed] : []
  })
}

/** Reads a stored document defensively, so a damaged file cannot break the editor. */
export function normalizeDocument(raw: unknown): Doc {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as Doc).nodes)) return createDocument()
  const source = raw as Record<string, unknown>
  const seen = new Set<string>()
  const nodes = list(source.nodes, normalizeNode).filter((node) => {
    if (seen.has(node.id)) return false
    seen.add(node.id)
    return true
  })
  // A parent that is missing, or a loop of parents, would hide elements for good.
  for (const node of nodes) {
    if (node.parentId && !seen.has(node.parentId)) node.parentId = null
    const visited = new Set([node.id])
    let parent = node.parentId
    while (parent) {
      if (visited.has(parent)) {
        node.parentId = null
        break
      }
      visited.add(parent)
      parent = nodes.find((item) => item.id === parent)?.parentId ?? null
    }
  }
  const tokens = (source.tokens ?? {}) as Record<string, unknown>
  const defaults = defaultTokens()
  const named = (item: Record<string, unknown>) => (typeof item.id === 'string' ? { id: item.id, name: text(item.name, item.id) } : null)
  const sizes = (value: unknown, fallback: DesignTokens['spacing']) =>
    Array.isArray(value)
      ? list(value, (item) => {
          const base = named(item)
          return base && { ...base, value: Math.max(0, finite(item.value, 0)) }
        })
      : fallback
  return {
    version: 1,
    background: color(source.background, '#f4f4f5') || '#f4f4f5',
    nodes,
    components: list(source.components, (item) =>
      typeof item.id === 'string' && typeof item.rootId === 'string' && seen.has(item.rootId) ? { id: item.id, name: text(item.name, 'Component'), rootId: item.rootId } : null,
    ),
    // Only embedded images: a saved file must never make the browser call out.
    assets: list(source.assets, (item) =>
      typeof item.id === 'string' && typeof item.src === 'string' && item.src.startsWith('data:image/')
        ? { id: item.id, name: text(item.name, 'Image'), src: item.src, width: finite(item.width, 100), height: finite(item.height, 100) }
        : null,
    ),
    tokens: {
      colors: Array.isArray(tokens.colors)
        ? list(tokens.colors, (item) => {
            const base = named(item)
            return base && { ...base, value: color(item.value, '#000000') || '#000000' }
          })
        : defaults.colors,
      spacing: sizes(tokens.spacing, defaults.spacing),
      radius: sizes(tokens.radius, defaults.radius),
      typography: Array.isArray(tokens.typography)
        ? list(tokens.typography, (item) => {
            const base = named(item)
            return (
              base && {
                ...base,
                fontFamily: text(item.fontFamily, 'Inter'),
                fontSize: Math.max(1, finite(item.fontSize, 16)),
                fontWeight: finite(item.fontWeight, 400),
                lineHeight: Math.max(0.5, finite(item.lineHeight, 1.4)),
              }
            )
          })
        : defaults.typography,
    },
  }
}

// ---------- snapping ----------

export type Guide = { axis: 'x' | 'y'; position: number }

/** Finds how far to nudge moving bounds so an edge or centre lines up with another element. */
export function snapBounds(moving: Bounds, others: Bounds[], threshold: number): { dx: number; dy: number; guides: Guide[] } {
  const stops = (b: Bounds, axis: 'x' | 'y') =>
    axis === 'x' ? [b.x, b.x + b.width / 2, b.x + b.width] : [b.y, b.y + b.height / 2, b.y + b.height]
  const solve = (axis: 'x' | 'y') => {
    let best: { delta: number; position: number } | null = null
    for (const other of others) {
      for (const target of stops(other, axis)) {
        for (const edge of stops(moving, axis)) {
          const delta = target - edge
          if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, position: target }
        }
      }
    }
    return best as { delta: number; position: number } | null
  }
  const x = solve('x')
  const y = solve('y')
  const guides: Guide[] = []
  if (x) guides.push({ axis: 'x', position: x.position })
  if (y) guides.push({ axis: 'y', position: y.position })
  return { dx: x?.delta ?? 0, dy: y?.delta ?? 0, guides }
}

/** Where to put a new top-level frame: to the right of everything. */
export function nextFrameOrigin(doc: Doc): Point {
  const roots = childrenOf(doc, null)
  const bounds = unionBounds(roots)
  return bounds ? { x: bounds.x + bounds.width + 80, y: bounds.y } : { x: 0, y: 0 }
}

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

/** Lines the elements up with the edges or centre of their combined bounds. */
export function alignNodes(doc: Doc, ids: string[], mode: AlignMode): Doc {
  const roots = topLevelOf(doc, ids)
  const box = boundsOf(doc, roots)
  if (!box || roots.length < 2) return doc
  let current = doc
  for (const id of roots) {
    const node = getNode(current, id)!
    const dx =
      mode === 'left' ? box.x - node.x
      : mode === 'center' ? box.x + box.width / 2 - (node.x + node.width / 2)
      : mode === 'right' ? box.x + box.width - (node.x + node.width)
      : 0
    const dy =
      mode === 'top' ? box.y - node.y
      : mode === 'middle' ? box.y + box.height / 2 - (node.y + node.height / 2)
      : mode === 'bottom' ? box.y + box.height - (node.y + node.height)
      : 0
    current = moveNodes(current, [id], Math.round(dx), Math.round(dy))
  }
  return current
}
