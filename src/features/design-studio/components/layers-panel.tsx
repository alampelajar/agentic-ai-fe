import { useState, type DragEvent } from 'react'
import { Box, Boxes, ChevronRight, Circle, Eye, EyeOff, Folder, Frame, Image, Lock, MousePointerClick, Slash, Square, Star, TextCursorInput, Type, Unlock, CreditCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { childrenOf, moveLayer, updateNodes } from '../model/document'
import { useDoc, useEditor, useEditorStore } from '../model/store'
import type { DesignNode, NodeType } from '../model/types'
import { IconButton } from './fields'

const TYPE_ICON: Record<NodeType, typeof Square> = {
  frame: Frame,
  group: Folder,
  rect: Square,
  ellipse: Circle,
  line: Slash,
  text: Type,
  image: Image,
  icon: Star,
  button: MousePointerClick,
  input: TextCursorInput,
  card: CreditCard,
  instance: Box,
}

type DropHint = { id: string; position: 'above' | 'below' | 'inside' } | null
const LAYER_MIME = 'application/x-design-layer'

export function LayersPanel() {
  const { t } = useTranslation()
  const doc = useDoc()
  const roots = [...childrenOf(doc, null)].reverse()
  if (roots.length === 0) return <p className='px-3 py-6 text-center text-xs text-muted-foreground'>{t('designStudio.noLayers')}</p>
  return (
    <ul role='tree' aria-label={t('designStudio.layers')} className='py-1'>
      {roots.map((node) => (
        <LayerRow key={node.id} node={node} depth={0} />
      ))}
    </ul>
  )
}

function LayerRow({ node, depth }: { node: DesignNode; depth: number }) {
  const { t } = useTranslation()
  const store = useEditorStore()
  const doc = useDoc()
  const selected = useEditor((state) => state.selection.includes(node.id))
  const [open, setOpen] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [hint, setHint] = useState<DropHint>(null)
  const kids = [...childrenOf(doc, node.id)].reverse()
  const isMain = doc.components.some((component) => component.rootId === node.id)
  const canContain = node.type === 'frame' || node.type === 'group'
  const Icon = isMain ? Boxes : TYPE_ICON[node.type]
  const apply = store.getState().apply

  const dropPosition = (event: DragEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientY - rect.top) / rect.height
    if (canContain && ratio > 0.3 && ratio < 0.7) return 'inside' as const
    return ratio < 0.5 ? ('above' as const) : ('below' as const)
  }

  return (
    <li role='treeitem' aria-selected={selected} aria-expanded={kids.length ? open : undefined}>
      <div
        draggable={!renaming}
        onDragStart={(event) => {
          event.stopPropagation()
          event.dataTransfer.setData(LAYER_MIME, node.id)
          event.dataTransfer.effectAllowed = 'move'
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes(LAYER_MIME)) return
          event.preventDefault()
          setHint({ id: node.id, position: dropPosition(event) })
        }}
        onDragLeave={() => setHint(null)}
        onDrop={(event) => {
          event.preventDefault()
          const moved = event.dataTransfer.getData(LAYER_MIME)
          const position = dropPosition(event)
          setHint(null)
          if (moved) apply((current) => moveLayer(current, moved, node.id, position))
        }}
        onClick={(event) => {
          const state = store.getState()
          if (event.shiftKey || event.ctrlKey || event.metaKey) {
            state.select(state.selection.includes(node.id) ? state.selection.filter((id) => id !== node.id) : [...state.selection, node.id])
          } else {
            state.select([node.id])
          }
        }}
        onDoubleClick={() => setRenaming(true)}
        className={cn(
          'group relative flex h-7 cursor-default items-center gap-1 pr-1 text-xs',
          selected ? 'bg-primary/10 text-foreground' : 'hover:bg-accent/60',
          !node.visible && 'opacity-50',
          hint?.position === 'inside' && 'outline outline-1 -outline-offset-1 outline-primary',
        )}
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        {hint && hint.position !== 'inside' && <span className={cn('absolute inset-x-0 h-0.5 bg-primary', hint.position === 'above' ? 'top-0' : 'bottom-0')} />}
        <button
          type='button'
          tabIndex={kids.length ? 0 : -1}
          aria-label={open ? t('designStudio.collapse') : t('designStudio.expand')}
          onClick={(event) => {
            event.stopPropagation()
            setOpen((value) => !value)
          }}
          className={cn('flex size-4 shrink-0 items-center justify-center text-muted-foreground', !kids.length && 'invisible')}
        >
          <ChevronRight className={cn('size-3 transition-transform', open && 'rotate-90')} />
        </button>
        <Icon className={cn('size-3.5 shrink-0 text-muted-foreground', (isMain || node.type === 'instance') && 'text-purple-600 dark:text-purple-400')} />
        {renaming ? (
          <input
            autoFocus
            aria-label={t('designStudio.layerName')}
            defaultValue={node.name}
            onClick={(event) => event.stopPropagation()}
            onFocus={(event) => event.target.select()}
            onBlur={(event) => {
              const name = event.target.value.trim()
              setRenaming(false)
              if (name && name !== node.name) apply((current) => updateNodes(current, [node.id], { name }))
            }}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') {
                event.currentTarget.value = node.name
                event.currentTarget.blur()
              }
            }}
            className='h-5 min-w-0 flex-1 rounded border border-primary bg-background px-1 text-xs outline-none'
          />
        ) : (
          <span className={cn('min-w-0 flex-1 truncate', (isMain || node.type === 'instance') && 'text-purple-700 dark:text-purple-300')}>{node.name}</span>
        )}
        <span className={cn('flex shrink-0 opacity-0 focus-within:opacity-100 group-hover:opacity-100', (node.locked || !node.visible) && 'opacity-100')}>
          <IconButton
            label={node.locked ? t('designStudio.unlock') : t('designStudio.lock')}
            className='size-5 [&_svg]:size-3'
            onClick={(event) => {
              event.stopPropagation()
              apply((current) => updateNodes(current, [node.id], { locked: !node.locked }))
            }}
          >
            {node.locked ? <Lock /> : <Unlock />}
          </IconButton>
          <IconButton
            label={node.visible ? t('designStudio.hide') : t('designStudio.show')}
            className='size-5 [&_svg]:size-3'
            onClick={(event) => {
              event.stopPropagation()
              apply((current) => updateNodes(current, [node.id], { visible: !node.visible }))
            }}
          >
            {node.visible ? <Eye /> : <EyeOff />}
          </IconButton>
        </span>
      </div>
      {open && kids.length > 0 && (
        <ul role='group'>
          {kids.map((kid) => (
            <LayerRow key={kid.id} node={kid} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}
