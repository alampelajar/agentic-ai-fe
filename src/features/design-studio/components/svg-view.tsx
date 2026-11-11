import { createElement, memo, type ReactNode } from 'react'
import { boundsOf } from '../model/document'
import { renderDocument, type SvgEl } from '../model/render'
import type { Doc } from '../model/types'

const camelCache = new Map<string, string>()
function reactAttr(name: string): string {
  if (name.startsWith('data-')) return name
  let camel = camelCache.get(name)
  if (!camel) {
    camel = name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
    camelCache.set(name, camel)
  }
  return camel
}

function toReact(el: SvgEl, key: number, scope: string): ReactNode {
  const props: Record<string, string | number> = { key }
  for (const [name, value] of Object.entries(el.attrs)) {
    // Clip ids must stay unique when several SVGs are on the page at once.
    if (name === 'id') props.id = `${scope}${value}`
    else if (name === 'clip-path') props.clipPath = String(value).replace('url(#', `url(#${scope}`)
    else props[reactAttr(name)] = value
  }
  const children = el.children?.map((child, index) => toReact(child, index, scope))
  return createElement(el.tag, props, el.text ?? children)
}

/** Draws the elements as SVG. `scope` keeps clip ids apart between views. */
export const DocContent = memo(function DocContent({ doc, rootIds, scope }: { doc: Doc; rootIds?: string[]; scope: string }) {
  return <>{renderDocument(doc, rootIds).map((el, index) => toReact(el, index, scope))}</>
})

/** A self-contained, scaled picture of some elements: thumbnails and preview. */
export function DocThumbnail({ doc, ids, scope, className, background }: { doc: Doc; ids: string[]; scope: string; className?: string; background?: string }) {
  const bounds = boundsOf(doc, ids)
  if (!bounds) return null
  const pad = bounds.height === 0 ? 2 : 0
  return (
    <svg
      viewBox={`${bounds.x - pad} ${bounds.y - pad} ${Math.max(1, bounds.width) + pad * 2} ${Math.max(1, bounds.height) + pad * 2}`}
      className={className}
      preserveAspectRatio='xMidYMid meet'
      style={background ? { background } : undefined}
      aria-hidden='true'
    >
      <DocContent doc={doc} rootIds={ids} scope={scope} />
    </svg>
  )
}
