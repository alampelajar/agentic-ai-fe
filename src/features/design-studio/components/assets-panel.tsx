import { useRef, type ReactNode } from 'react'
import { Circle, CreditCard, ImagePlus, Monitor, Laptop, MousePointerClick, Slash, Smartphone, Square, Tablet, TextCursorInput, Trash2, Type } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { FRAME_PRESETS, assetInUse } from '../model/document'
import { IMPORT_TYPES } from '../model/export'
import { ICONS, ICON_NAMES } from '../model/icons'
import { INSERT_MIME, useDoc, useEditorStore, type InsertSpec } from '../model/store'
import type { NodeType } from '../model/types'
import { IconButton, Section } from './fields'
import { useImportImages } from './use-import-images'

const ELEMENTS: { type: NodeType; icon: typeof Square }[] = [
  { type: 'text', icon: Type },
  { type: 'rect', icon: Square },
  { type: 'ellipse', icon: Circle },
  { type: 'line', icon: Slash },
  { type: 'button', icon: MousePointerClick },
  { type: 'input', icon: TextCursorInput },
  { type: 'card', icon: CreditCard },
]

const FRAME_ICONS: Record<string, typeof Monitor> = { desktop: Monitor, laptop: Laptop, tablet: Tablet, mobile: Smartphone }

/** Something to add: click to place it in view, or drag it to a spot on the canvas. */
export function InsertTile({ spec, label, children, className }: { spec: InsertSpec; label: string; children: ReactNode; className?: string }) {
  const store = useEditorStore()
  return (
    <button
      type='button'
      draggable
      title={label}
      aria-label={label}
      onDragStart={(event) => {
        event.dataTransfer.setData(INSERT_MIME, JSON.stringify(spec))
        event.dataTransfer.effectAllowed = 'copy'
      }}
      onClick={() => store.getState().insert(spec)}
      className={`flex cursor-grab flex-col items-center justify-center gap-1 rounded-md border border-transparent bg-muted/50 p-2 text-[11px] text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

export function AssetsPanel() {
  const { t } = useTranslation()
  const store = useEditorStore()
  const doc = useDoc()
  const importImages = useImportImages()
  const fileInput = useRef<HTMLInputElement>(null)

  return (
    <div>
      <Section title={t('designStudio.framesTitle')}>
        <div className='grid grid-cols-2 gap-1.5'>
          {FRAME_PRESETS.map((preset) => {
            const Icon = FRAME_ICONS[preset.id] ?? Monitor
            const name = t(`designStudio.frames.${preset.id}`)
            return (
              <InsertTile key={preset.id} spec={{ kind: 'frame', preset: preset.id }} label={name}>
                <Icon className='size-4' />
                <span className='truncate'>{name}</span>
                <span className='text-[10px] opacity-70'>
                  {preset.width} × {preset.height}
                </span>
              </InsertTile>
            )
          })}
        </div>
      </Section>

      <Section title={t('designStudio.elements')}>
        <div className='grid grid-cols-3 gap-1.5'>
          {ELEMENTS.map(({ type, icon: Icon }) => {
            const name = t(`designStudio.elementTypes.${type}`)
            return (
              <InsertTile key={type} spec={{ kind: 'element', type }} label={name}>
                <Icon className='size-4' />
                <span className='w-full truncate'>{name}</span>
              </InsertTile>
            )
          })}
        </div>
      </Section>

      <Section
        title={t('designStudio.images')}
        action={
          <input
            ref={fileInput}
            type='file'
            multiple
            accept={IMPORT_TYPES.join(',')}
            aria-label={t('designStudio.importImage')}
            className='sr-only'
            onChange={(event) => {
              void importImages([...(event.target.files ?? [])])
              event.target.value = ''
            }}
          />
        }
      >
        <Button variant='outline' size='sm' className='h-7 w-full text-xs' onClick={() => fileInput.current?.click()}>
          <ImagePlus className='size-3.5' />
          {t('designStudio.importImage')}
        </Button>
        {doc.assets.length === 0 ? (
          <p className='text-[11px] text-muted-foreground'>{t('designStudio.noImages')}</p>
        ) : (
          <div className='grid grid-cols-2 gap-1.5'>
            {doc.assets.map((asset) => (
              <div key={asset.id} className='group relative'>
                <InsertTile spec={{ kind: 'asset', id: asset.id }} label={asset.name} className='w-full p-1'>
                  <img src={asset.src} alt='' className='h-16 w-full rounded object-cover' draggable={false} />
                </InsertTile>
                <IconButton
                  label={assetInUse(doc, asset.id) ? t('designStudio.imageInUse') : t('designStudio.deleteImage')}
                  disabled={assetInUse(doc, asset.id)}
                  className='absolute right-1 top-1 size-5 bg-background/90 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [&_svg]:size-3'
                  onClick={() => store.getState().apply((current) => ({ ...current, assets: current.assets.filter((item) => item.id !== asset.id) }))}
                >
                  <Trash2 />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t('designStudio.icons')}>
        <div className='grid grid-cols-5 gap-1'>
          {ICON_NAMES.map((name) => (
            <InsertTile key={name} spec={{ kind: 'icon', icon: name }} label={name} className='p-1.5'>
              <svg viewBox='0 0 24 24' className='size-4' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                {ICONS[name].map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
            </InsertTile>
          ))}
        </div>
      </Section>
    </div>
  )
}
