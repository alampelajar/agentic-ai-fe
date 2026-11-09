export const NODE_TYPES = ['frame', 'group', 'rect', 'ellipse', 'line', 'text', 'image', 'icon', 'button', 'input', 'card', 'instance'] as const
export type NodeType = (typeof NODE_TYPES)[number]

/** A colour is '#rrggbb', '' for none, or '$tokenId'. */
export type ColorValue = string
/** A spacing or radius is a number of pixels, or '$tokenId'. */
export type SizeValue = number | string
export type TextAlign = 'left' | 'center' | 'right'
export type LayoutMode = 'none' | 'vertical' | 'horizontal'

/**
 * One element. Positions are absolute page coordinates, whatever the parent:
 * rendering, hit testing and export then need no coordinate conversions, and
 * moving a parent simply moves its descendants too. Children paint in the order
 * they appear in Doc.nodes.
 */
export type DesignNode = {
  id: string
  type: NodeType
  name: string
  parentId: string | null
  x: number
  y: number
  width: number
  height: number
  visible: boolean
  locked: boolean
  opacity: number
  fill: ColorValue
  stroke: ColorValue
  strokeWidth: number
  radius: SizeValue
  padding: SizeValue
  text: string
  textColor: ColorValue
  fontFamily: string
  fontSize: number
  fontWeight: number
  lineHeight: number
  textAlign: TextAlign
  /** Typography token; while set it wins over the font fields above. */
  textStyle: string
  /** Frames: place the children automatically. */
  layout: LayoutMode
  gap: SizeValue
  clip: boolean
  /** Lines: draw from bottom-left to top-right. */
  flipY: boolean
  assetId: string
  icon: string
  componentId: string
}

export type ColorToken = { id: string; name: string; value: string }
export type SizeToken = { id: string; name: string; value: number }
export type TypographyToken = { id: string; name: string; fontFamily: string; fontSize: number; fontWeight: number; lineHeight: number }

export type DesignTokens = {
  colors: ColorToken[]
  spacing: SizeToken[]
  radius: SizeToken[]
  typography: TypographyToken[]
}

export type DesignAsset = { id: string; name: string; src: string; width: number; height: number }

/** The main component is the subtree at rootId; instances render it live. */
export type DesignComponent = { id: string; name: string; rootId: string }

export type Doc = {
  version: 1
  background: string
  nodes: DesignNode[]
  components: DesignComponent[]
  assets: DesignAsset[]
  tokens: DesignTokens
}

export type Bounds = { x: number; y: number; width: number; height: number }
export type Point = { x: number; y: number }
