import { boundsOf, childrenOf, getNode, resolveColor, topLevelOf } from './document'
import { renderDocument, type SvgEl } from './render'
import type { Bounds, Doc } from './types'

export type ExportFormat = 'png' | 'jpg' | 'svg'

const MAX_RASTER_SIDE = 8192
const MAX_IMPORT_BYTES = 20 * 1024 * 1024
const MAX_IMPORT_SIDE = 1600
export const IMPORT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export function elToString(el: SvgEl): string {
  const attrs = Object.entries(el.attrs)
    .filter(([name]) => name !== 'data-node')
    .map(([name, value]) => ` ${name}="${escapeXml(String(value))}"`)
    .join('')
  const inner = (el.text !== undefined ? escapeXml(el.text) : '') + (el.children ?? []).map(elToString).join('')
  return `<${el.tag}${attrs}>${inner}</${el.tag}>`
}

export type ExportScope = { ids: string[]; bounds: Bounds }

/** What an export covers: the selection, or the whole page when nothing is selected. */
export function exportScope(doc: Doc, ids: string[]): ExportScope | null {
  const roots = ids.length ? topLevelOf(doc, ids) : childrenOf(doc, null).filter((node) => node.visible).map((node) => node.id)
  const bounds = boundsOf(doc, roots)
  return bounds && bounds.width > 0 && bounds.height >= 0 ? { ids: roots, bounds } : null
}

/** A line can have zero height, and a pure line still needs room for its stroke. */
function paddedBounds(doc: Doc, scope: ExportScope): Bounds {
  const extra = Math.max(0, ...scope.ids.map((id) => {
    const node = getNode(doc, id)
    return node ? node.strokeWidth / 2 : 0
  }))
  const pad = Math.ceil(extra)
  return { x: scope.bounds.x - pad, y: scope.bounds.y - pad, width: scope.bounds.width + pad * 2, height: Math.max(1, scope.bounds.height) + pad * 2 }
}

export function toSvgString(doc: Doc, scope: ExportScope, withBackground = false): { svg: string; width: number; height: number } {
  const box = paddedBounds(doc, scope)
  const background = withBackground ? `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${escapeXml(resolveColor(doc, doc.background))}"></rect>` : ''
  const content = renderDocument(doc, scope.ids).map(elToString).join('')
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">${background}${content}</svg>`,
    width: box.width,
    height: box.height,
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image'))
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('export'))), type, quality)
  })
}

export async function exportBlob(doc: Doc, scope: ExportScope, format: ExportFormat, scale: number, withBackground: boolean): Promise<Blob> {
  const { svg, width, height } = toSvgString(doc, scope, withBackground)
  const svgBlob = new Blob([svg], { type: 'image/svg+xml' })
  if (format === 'svg') return svgBlob
  const safeScale = Math.min(scale, MAX_RASTER_SIDE / Math.max(width, height))
  const url = URL.createObjectURL(svgBlob)
  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * safeScale))
    canvas.height = Math.max(1, Math.round(height * safeScale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('export')
    if (format === 'jpg') {
      // JPG has no transparency.
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await canvasToBlob(canvas, format === 'png' ? 'image/png' : 'image/jpeg', 0.92)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const safeFileName = (name: string) => name.trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').slice(0, 80) || 'design'

export class ImportError extends Error {
  constructor(public reason: 'type' | 'size' | 'read') {
    super(reason)
  }
}

/**
 * Reads an image file into an embedded data URL, resized so the design stays
 * small enough to save. Images are drawn to a canvas first, so a file's own
 * content (an SVG's scripts, for one) never reaches the document.
 */
export async function importImage(file: File): Promise<{ src: string; width: number; height: number }> {
  if (!IMPORT_TYPES.includes(file.type)) throw new ImportError('type')
  if (file.size > MAX_IMPORT_BYTES) throw new ImportError('size')
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url).catch(() => {
      throw new ImportError('read')
    })
    const naturalWidth = image.naturalWidth || 512
    const naturalHeight = image.naturalHeight || 512
    const ratio = Math.min(1, MAX_IMPORT_SIDE / Math.max(naturalWidth, naturalHeight))
    const width = Math.max(1, Math.round(naturalWidth * ratio))
    const height = Math.max(1, Math.round(naturalHeight * ratio))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new ImportError('read')
    context.drawImage(image, 0, 0, width, height)
    return { src: canvas.toDataURL('image/webp', 0.85), width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}
