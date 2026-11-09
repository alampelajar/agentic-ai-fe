import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  Boxes,
  Copy,
  Group,
  Trash2,
  Unlink,
  Ungroup,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  FONT_FAMILIES,
  FRAME_PRESETS,
  alignNodes,
  getNode,
  resizeNode,
  moveNodes,
  resolveColor,
  resolveRadius,
  resolveSpacing,
  resolveTypography,
  updateNodes,
  type AlignMode,
} from '../model/document'
import { ICON_NAMES } from '../model/icons'
import { useDoc, useEditor, useEditorStore } from '../model/store'
import type { DesignNode } from '../model/types'
import { ColorField, IconButton, NumberField, Section, SizeField, inputClass } from './fields'

const TEXT_TYPES = ['text', 'button', 'input', 'card']
const NO_FILL = ['group', 'line', 'instance']
const NO_STROKE = ['group', 'instance']
const NO_RADIUS = ['group', 'ellipse', 'line', 'text', 'icon', 'instance']
const WITH_PADDING = ['frame', 'text', 'button', 'input', 'card']

const ALIGN: { mode: AlignMode; icon: typeof AlignStartVertical }[] = [
  { mode: 'left', icon: AlignStartVertical },
  { mode: 'center', icon: AlignCenterVertical },
  { mode: 'right', icon: AlignEndVertical },
  { mode: 'top', icon: AlignStartHorizontal },
  { mode: 'middle', icon: AlignCenterHorizontal },
  { mode: 'bottom', icon: AlignEndHorizontal },
]

export function PropertiesPanel() {
  const { t } = useTranslation()
  const store = useEditorStore()
  const doc = useDoc()
  const selection = useEditor((state) => state.selection)
  const nodes = selection.map((id) => getNode(doc, id)).filter((node): node is DesignNode => !!node)

  if (nodes.length === 0) {
    return <p className='px-3 py-6 text-center text-xs text-muted-foreground'>{t('designStudio.nothingSelected')}</p>
  }

  const node = nodes[0]
  const ids = nodes.map((item) => item.id)
  const state = store.getState()
  const type = resolveTypography(doc, node)
  const isMain = doc.components.some((component) => component.rootId === node.id)
  const every = (list: string[]) => nodes.every((item) => list.includes(item.type))
  const none = (list: string[]) => !nodes.some((item) => list.includes(item.type))

  /** Each field merges quick edits into one undo step. */
  const patch = (change: Partial<DesignNode>, key: string) => state.apply((current) => updateNodes(current, ids, change), `${key}:${ids.join()}`)
  const geometry = (change: Partial<{ x: number; y: number; width: number; height: number }>, key: string) =>
    state.apply((current) => {
      const live = getNode(current, node.id)
      if (!live) return current
      const moved = moveNodes(current, [node.id], (change.x ?? live.x) - live.x, (change.y ?? live.y) - live.y)
      const after = getNode(moved, node.id)!
      return change.width !== undefined || change.height !== undefined
        ? resizeNode(moved, node.id, { x: after.x, y: after.y, width: change.width ?? after.width, height: change.height ?? after.height })
        : moved
    }, `${key}:${node.id}`)

  return (
    <div>
      <Section title={nodes.length > 1 ? t('designStudio.selectedCount', { count: nodes.length }) : node.name}>
        <div className='flex flex-wrap gap-0.5'>
          {nodes.length > 1 &&
            ALIGN.map(({ mode, icon: Icon }) => (
              <IconButton key={mode} label={t(`designStudio.align.${mode}`)} onClick={() => state.apply((current) => alignNodes(current, ids, mode))}>
                <Icon />
              </IconButton>
            ))}
          {nodes.length > 1 && (
            <IconButton label={t('designStudio.group')} onClick={state.group}>
              <Group />
            </IconButton>
          )}
          {nodes.some((item) => item.type === 'group') && (
            <IconButton label={t('designStudio.ungroup')} onClick={state.ungroup}>
              <Ungroup />
            </IconButton>
          )}
          {!isMain && node.type !== 'instance' && (
            <IconButton label={t('designStudio.createComponent')} onClick={state.makeComponent}>
              <Boxes />
            </IconButton>
          )}
          {node.type === 'instance' && (
            <IconButton label={t('designStudio.detachInstance')} onClick={state.detach}>
              <Unlink />
            </IconButton>
          )}
          <IconButton label={t('designStudio.duplicate')} onClick={state.duplicate}>
            <Copy />
          </IconButton>
          <IconButton label={t('designStudio.delete')} onClick={state.remove}>
            <Trash2 />
          </IconButton>
        </div>
        {isMain && <p className='text-[11px] text-purple-600 dark:text-purple-400'>{t('designStudio.mainComponentHint')}</p>}
      </Section>

      {nodes.length === 1 && (
        <Section title={t('designStudio.layout')}>
          <div className='grid grid-cols-2 gap-1.5'>
            <NumberField label='X' value={node.x} onChange={(x) => geometry({ x }, 'x')} />
            <NumberField label='Y' value={node.y} onChange={(y) => geometry({ y }, 'y')} />
            <NumberField label={t('designStudio.widthShort')} value={node.width} min={1} onChange={(width) => geometry({ width }, 'w')} />
            <NumberField label={t('designStudio.heightShort')} value={node.height} min={0} onChange={(height) => geometry({ height }, 'h')} />
          </div>
          {node.type === 'frame' && (
            <>
              <select
                aria-label={t('designStudio.framePreset')}
                className={inputClass}
                value={FRAME_PRESETS.find((preset) => preset.width === node.width && preset.height === node.height)?.id ?? ''}
                onChange={(event) => {
                  const preset = FRAME_PRESETS.find((item) => item.id === event.target.value)
                  if (preset) geometry({ width: preset.width, height: preset.height }, 'preset')
                }}
              >
                <option value=''>{t('designStudio.customSize')}</option>
                {FRAME_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {t(`designStudio.frames.${preset.id}`)} · {preset.width} × {preset.height}
                  </option>
                ))}
              </select>
              <label className='flex items-center gap-2 text-xs'>
                <input type='checkbox' checked={node.clip} onChange={(event) => patch({ clip: event.target.checked }, 'clip')} />
                {t('designStudio.clipContent')}
              </label>
            </>
          )}
        </Section>
      )}

      {none(NO_FILL) && (
        <Section title={t('designStudio.fill')}>
          <ColorField label={t('designStudio.fillColor')} value={node.fill} resolved={resolveColor(doc, node.fill)} tokens={doc.tokens.colors} onChange={(fill) => patch({ fill }, 'fill')} />
        </Section>
      )}

      {none(NO_STROKE) && (
        <Section title={t('designStudio.border')}>
          <ColorField label={t('designStudio.borderColor')} value={node.stroke} resolved={resolveColor(doc, node.stroke)} tokens={doc.tokens.colors} onChange={(stroke) => patch({ stroke, strokeWidth: node.strokeWidth || 1 }, 'stroke')} />
          <NumberField label={t('designStudio.borderWidth')} value={node.strokeWidth} min={0} onChange={(strokeWidth) => patch({ strokeWidth }, 'strokeWidth')} />
        </Section>
      )}

      <Section title={t('designStudio.appearance')}>
        <NumberField label={t('designStudio.opacity')} value={Math.round(node.opacity * 100)} min={0} max={100} suffix='%' onChange={(opacity) => patch({ opacity: opacity / 100 }, 'opacity')} />
        {none(NO_RADIUS) && (
          <SizeField label={t('designStudio.radius')} value={node.radius} resolved={resolveRadius(doc, node.radius)} tokens={doc.tokens.radius} onChange={(radius) => patch({ radius }, 'radius')} />
        )}
        {every(WITH_PADDING) && (
          <SizeField label={t('designStudio.padding')} value={node.padding} resolved={resolveSpacing(doc, node.padding)} tokens={doc.tokens.spacing} onChange={(padding) => patch({ padding }, 'padding')} />
        )}
      </Section>

      {node.type === 'frame' && nodes.length === 1 && (
        <Section title={t('designStudio.autoLayout')}>
          <select aria-label={t('designStudio.autoLayout')} className={inputClass} value={node.layout} onChange={(event) => patch({ layout: event.target.value as DesignNode['layout'] }, 'layout')}>
            <option value='none'>{t('designStudio.layoutNone')}</option>
            <option value='vertical'>{t('designStudio.layoutVertical')}</option>
            <option value='horizontal'>{t('designStudio.layoutHorizontal')}</option>
          </select>
          {node.layout !== 'none' && (
            <SizeField label={t('designStudio.gap')} value={node.gap} resolved={resolveSpacing(doc, node.gap)} tokens={doc.tokens.spacing} onChange={(gap) => patch({ gap }, 'gap')} />
          )}
        </Section>
      )}

      {node.type === 'icon' && (
        <Section title={t('designStudio.icon')}>
          <select aria-label={t('designStudio.icon')} className={inputClass} value={node.icon} onChange={(event) => patch({ icon: event.target.value }, 'icon')}>
            {ICON_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Section>
      )}

      {every(TEXT_TYPES) && (
        <Section title={t('designStudio.typography')}>
          <textarea aria-label={t('designStudio.textContent')} rows={2} value={node.text} onChange={(event) => patch({ text: event.target.value }, 'text')} className={`${inputClass} h-auto resize-y py-1.5`} />
          <ColorField label={t('designStudio.textColor')} value={node.textColor} resolved={resolveColor(doc, node.textColor)} tokens={doc.tokens.colors} allowNone={false} onChange={(textColor) => patch({ textColor }, 'textColor')} />
          <select aria-label={t('designStudio.textStyle')} className={inputClass} value={node.textStyle} onChange={(event) => patch({ textStyle: event.target.value }, 'textStyle')}>
            <option value=''>{t('designStudio.customStyle')}</option>
            {doc.tokens.typography.map((token) => (
              <option key={token.id} value={token.id}>
                {token.name} · {token.fontSize}
              </option>
            ))}
          </select>
          <select aria-label={t('designStudio.fontFamily')} className={inputClass} disabled={!!node.textStyle} value={type.fontFamily} onChange={(event) => patch({ fontFamily: event.target.value }, 'font')}>
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <div className='grid grid-cols-2 gap-1.5'>
            <NumberField label={t('designStudio.fontSize')} value={type.fontSize} min={1} disabled={!!node.textStyle} onChange={(fontSize) => patch({ fontSize }, 'fontSize')} />
            <select aria-label={t('designStudio.fontWeight')} className={inputClass} disabled={!!node.textStyle} value={type.fontWeight} onChange={(event) => patch({ fontWeight: Number(event.target.value) }, 'weight')}>
              {[300, 400, 500, 600, 700, 800].map((weight) => (
                <option key={weight} value={weight}>
                  {weight}
                </option>
              ))}
            </select>
            <NumberField label={t('designStudio.lineHeight')} value={type.lineHeight} min={0.5} step={0.1} disabled={!!node.textStyle} onChange={(lineHeight) => patch({ lineHeight }, 'lineHeight')} />
            <select aria-label={t('designStudio.textAlign')} className={inputClass} value={node.textAlign} onChange={(event) => patch({ textAlign: event.target.value as DesignNode['textAlign'] }, 'textAlign')}>
              <option value='left'>{t('designStudio.alignText.left')}</option>
              <option value='center'>{t('designStudio.alignText.center')}</option>
              <option value='right'>{t('designStudio.alignText.right')}</option>
            </select>
          </div>
        </Section>
      )}
    </div>
  )
}
