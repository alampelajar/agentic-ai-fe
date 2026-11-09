import { childrenOf, descendantIds, getNode, resolveColor, resolveRadius, resolveSpacing, resolveTypography } from './document'
import { ICONS } from './icons'
import type { Bounds, DesignNode, Doc } from './types'

/**
 * Rendering produces a small SVG description. The canvas turns it into React
 * elements and export turns it into a string, so what you see is what you export.
 */
export type SvgEl = { tag: string; attrs: Record<string, string | number>; children?: SvgEl[]; text?: string }

let measureContext: CanvasRenderingContext2D | null | undefined

function measure(value: string, font: string, fontSize: number): number {
  if (measureContext === undefined) {
    measureContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  }
  if (!measureContext) return value.length * fontSize * 0.55
  measureContext.font = font
  return measureContext.measureText(value).width
}

/** Breaks text into lines that fit, keeping the line breaks the author typed. */
export function wrapText(value: string, maxWidth: number, font: string, fontSize: number): string[] {
  const lines: string[] = []
  for (const paragraph of value.split('\n')) {
    const words = paragraph.split(' ')
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (line && measure(candidate, font, fontSize) > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    lines.push(line)
  }
  return lines
}

const SERIF_FONTS = ['Georgia', 'Times New Roman']
const MONO_FONTS = ['Courier New']

/** A font with a fallback of the same kind, for machines that do not have it. */
export function fontStack(family: string): string {
  const generic = SERIF_FONTS.includes(family) ? 'serif' : MONO_FONTS.includes(family) ? 'monospace' : 'sans-serif'
  return `'${family.replace(/'/g, '')}', ${generic}`
}

type TextBlock = {
  value: string
  box: Bounds
  color: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  lineHeight: number
  align: 'left' | 'center' | 'right'
  vertical: 'top' | 'middle'
}

function textEl(block: TextBlock): SvgEl {
  const stack = fontStack(block.fontFamily)
  const font = `${block.fontWeight} ${block.fontSize}px ${stack}`
  const lines = wrapText(block.value, Math.max(1, block.box.width), font, block.fontSize)
  const step = block.fontSize * block.lineHeight
  const total = lines.length * step
  const top = block.vertical === 'middle' ? block.box.y + (block.box.height - total) / 2 : block.box.y
  const firstBaseline = top + (step - block.fontSize) / 2 + block.fontSize * 0.82
  const x = block.align === 'center' ? block.box.x + block.box.width / 2 : block.align === 'right' ? block.box.x + block.box.width : block.box.x
  return {
    tag: 'text',
    attrs: {
      'font-family': stack,
      'font-size': block.fontSize,
      'font-weight': block.fontWeight,
      fill: block.color || 'none',
      'text-anchor': block.align === 'center' ? 'middle' : block.align === 'right' ? 'end' : 'start',
    },
    children: lines.map((line, index) => ({ tag: 'tspan', attrs: { x, y: firstBaseline + index * step }, text: line || ' ' })),
  }
}

type Context = { doc: Doc; nextClip: () => string; expanding: Set<string> }

function boxAttrs(doc: Doc, node: DesignNode): Record<string, string | number> {
  const stroke = resolveColor(doc, node.stroke)
  return {
    fill: resolveColor(doc, node.fill) || 'none',
    ...(stroke && node.strokeWidth > 0 ? { stroke, 'stroke-width': node.strokeWidth } : {}),
  }
}

function roundedRect(doc: Doc, node: DesignNode): SvgEl {
  const radius = Math.min(resolveRadius(doc, node.radius), node.width / 2, node.height / 2)
  return {
    tag: 'rect',
    attrs: { x: node.x, y: node.y, width: node.width, height: node.height, ...(radius > 0 ? { rx: radius, ry: radius } : {}), ...boxAttrs(doc, node) },
  }
}

function innerBox(doc: Doc, node: DesignNode): Bounds {
  const padding = resolveSpacing(doc, node.padding)
  return { x: node.x + padding, y: node.y + padding, width: Math.max(1, node.width - padding * 2), height: Math.max(1, node.height - padding * 2) }
}

function clipDefs(id: string, shape: SvgEl): SvgEl {
  return { tag: 'defs', attrs: {}, children: [{ tag: 'clipPath', attrs: { id }, children: [{ tag: shape.tag, attrs: { ...shape.attrs, fill: '#000', stroke: 'none' } }] }] }
}

function withOpacity(node: DesignNode, content: SvgEl[]): SvgEl {
  return { tag: 'g', attrs: { 'data-node': node.id, ...(node.opacity < 1 ? { opacity: node.opacity } : {}) }, children: content }
}

function renderChildren(context: Context, id: string): SvgEl[] {
  return childrenOf(context.doc, id).flatMap((child) => {
    const el = renderNode(context, child)
    return el ? [el] : []
  })
}

function renderNode(context: Context, node: DesignNode): SvgEl | null {
  if (!node.visible) return null
  const { doc } = context
  const type = resolveTypography(doc, node)
  const textColor = resolveColor(doc, node.textColor)
  const block = (value: string, box: Bounds, vertical: 'top' | 'middle', overrides: Partial<TextBlock> = {}): SvgEl =>
    textEl({ value, box, color: textColor, ...type, align: node.textAlign, vertical, ...overrides })

  switch (node.type) {
    case 'frame': {
      const shape = roundedRect(doc, node)
      const children = renderChildren(context, node.id)
      if (!node.clip) return withOpacity(node, [shape, ...children])
      const clip = context.nextClip()
      return withOpacity(node, [clipDefs(clip, shape), shape, { tag: 'g', attrs: { 'clip-path': `url(#${clip})` }, children }])
    }
    case 'group':
      return withOpacity(node, renderChildren(context, node.id))
    case 'rect':
      return withOpacity(node, [roundedRect(doc, node)])
    case 'ellipse':
      return withOpacity(node, [{
        tag: 'ellipse',
        attrs: { cx: node.x + node.width / 2, cy: node.y + node.height / 2, rx: node.width / 2, ry: node.height / 2, ...boxAttrs(doc, node) },
      }])
    case 'line':
      return withOpacity(node, [{
        tag: 'line',
        attrs: {
          x1: node.x,
          y1: node.flipY ? node.y + node.height : node.y,
          x2: node.x + node.width,
          y2: node.flipY ? node.y : node.y + node.height,
          stroke: resolveColor(doc, node.stroke) || '#000000',
          'stroke-width': Math.max(1, node.strokeWidth),
          'stroke-linecap': 'round',
        },
      }])
    case 'text': {
      const fill = resolveColor(doc, node.fill)
      return withOpacity(node, [...(fill ? [roundedRect(doc, node)] : []), block(node.text, innerBox(doc, node), 'top')])
    }
    case 'image': {
      const asset = doc.assets.find((item) => item.id === node.assetId)
      const shape = roundedRect(doc, node)
      if (!asset) return withOpacity(node, [shape])
      const clip = context.nextClip()
      return withOpacity(node, [
        clipDefs(clip, shape),
        {
          tag: 'image',
          attrs: { x: node.x, y: node.y, width: node.width, height: node.height, href: asset.src, preserveAspectRatio: 'xMidYMid slice', 'clip-path': `url(#${clip})` },
        },
      ])
    }
    case 'icon': {
      const paths = ICONS[node.icon] ?? ICONS.star
      const stroke = resolveColor(doc, node.stroke) || '#000000'
      const scaleX = node.width / 24
      const scaleY = node.height / 24
      return withOpacity(node, [{
        tag: 'g',
        attrs: {
          transform: `translate(${node.x} ${node.y}) scale(${scaleX} ${scaleY})`,
          fill: resolveColor(doc, node.fill) || 'none',
          stroke,
          'stroke-width': node.strokeWidth || 2,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        },
        children: paths.map((d) => ({ tag: 'path', attrs: { d } })),
      }])
    }
    case 'button':
      return withOpacity(node, [roundedRect(doc, node), block(node.text, innerBox(doc, node), 'middle')])
    case 'input': {
      const padding = resolveSpacing(doc, node.padding)
      const box = { x: node.x + padding, y: node.y, width: Math.max(1, node.width - padding * 2), height: node.height }
      return withOpacity(node, [roundedRect(doc, node), block(node.text, box, 'middle')])
    }
    case 'card': {
      const [title = '', ...rest] = node.text.split('\n')
      const box = innerBox(doc, node)
      const titleSize = type.fontSize * 1.25
      const titleHeight = titleSize * type.lineHeight
      return withOpacity(node, [
        roundedRect(doc, node),
        block(title, { ...box, height: titleHeight }, 'top', { fontSize: titleSize, fontWeight: 600 }),
        ...(rest.length ? [block(rest.join('\n'), { ...box, y: box.y + titleHeight + 6, height: box.height - titleHeight - 6 }, 'top')] : []),
      ])
    }
    case 'instance': {
      const component = doc.components.find((item) => item.id === node.componentId)
      const root = component && getNode(doc, component.rootId)
      // A component that (somehow) contains itself must not recurse forever.
      if (!component || !root || context.expanding.has(component.id)) {
        return withOpacity(node, [{ tag: 'rect', attrs: { x: node.x, y: node.y, width: node.width, height: node.height, fill: 'none', stroke: '#ef4444', 'stroke-dasharray': '4 4' } }])
      }
      context.expanding.add(component.id)
      const inner = renderNode(context, { ...root, visible: true })
      context.expanding.delete(component.id)
      const sx = root.width ? node.width / root.width : 1
      const sy = root.height ? node.height / root.height : 1
      return withOpacity(node, [{
        tag: 'g',
        attrs: { transform: `translate(${node.x} ${node.y}) scale(${sx} ${sy}) translate(${-root.x} ${-root.y})` },
        children: inner ? [inner] : [],
      }])
    }
    default:
      return null
  }
}

/** Renders the given elements (default: the whole page) in paint order. */
export function renderDocument(doc: Doc, rootIds?: string[]): SvgEl[] {
  let clipCount = 0
  const context: Context = { doc, nextClip: () => `clip${++clipCount}`, expanding: new Set() }
  const roots = rootIds ? rootIds.map((id) => getNode(doc, id)).filter((node): node is DesignNode => !!node) : childrenOf(doc, null)
  return roots.flatMap((node) => {
    const el = renderNode(context, node)
    return el ? [el] : []
  })
}

/** True when a node sits inside a main component, so edits reach its instances. */
export function isInsideComponent(doc: Doc, id: string): boolean {
  return doc.components.some((component) => component.rootId === id || descendantIds(doc, component.rootId).includes(id))
}
