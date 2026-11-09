import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FONT_FAMILIES, addToken, removeToken, resolveColor, updateToken } from '../model/document'
import { useDoc, useEditorStore } from '../model/store'
import { ColorField, IconButton, NumberField, Section, inputClass } from './fields'

/** Design tokens and page settings: one change here updates every use. */
export function DesignSettingsPanel() {
  const { t } = useTranslation()
  const store = useEditorStore()
  const doc = useDoc()
  const apply = store.getState().apply
  const add = (kind: 'colors' | 'spacing' | 'radius' | 'typography') => (
    <IconButton label={t('designStudio.addToken')} onClick={() => apply((current) => addToken(current, kind))}>
      <Plus />
    </IconButton>
  )

  const sizeTokens = (kind: 'spacing' | 'radius') =>
    doc.tokens[kind].map((token) => (
      <div key={token.id} className='grid grid-cols-[1fr_4.5rem_1.75rem] items-center gap-1.5'>
        <input aria-label={t('designStudio.tokenName')} className={inputClass} value={token.name} onChange={(event) => apply((current) => updateToken(current, kind, token.id, { name: event.target.value }), `name:${token.id}`)} />
        <NumberField label='' value={token.value} min={0} onChange={(value) => apply((current) => updateToken(current, kind, token.id, { value }), `token:${token.id}`)} />
        <IconButton label={t('designStudio.deleteToken')} onClick={() => apply((current) => removeToken(current, kind, token.id))}>
          <Trash2 />
        </IconButton>
      </div>
    ))

  return (
    <div>
      <Section title={t('designStudio.page')}>
        <ColorField
          label={t('designStudio.canvasBackground')}
          value={doc.background}
          resolved={resolveColor(doc, doc.background)}
          tokens={doc.tokens.colors}
          allowNone={false}
          onChange={(background) => apply((current) => ({ ...current, background }), 'background')}
        />
      </Section>

      <Section title={t('designStudio.tokenColors')} action={add('colors')}>
        {doc.tokens.colors.map((token) => (
          <div key={token.id} className='grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-1.5'>
            <input
              type='color'
              aria-label={token.name}
              value={/^#[0-9a-f]{6}$/i.test(token.value) ? token.value : '#000000'}
              onChange={(event) => apply((current) => updateToken(current, 'colors', token.id, { value: event.target.value }), `token:${token.id}`)}
              className='size-7 cursor-pointer rounded-md border bg-transparent p-0.5'
            />
            <input aria-label={t('designStudio.tokenName')} className={inputClass} value={token.name} onChange={(event) => apply((current) => updateToken(current, 'colors', token.id, { name: event.target.value }), `name:${token.id}`)} />
            <IconButton label={t('designStudio.deleteToken')} onClick={() => apply((current) => removeToken(current, 'colors', token.id))}>
              <Trash2 />
            </IconButton>
          </div>
        ))}
      </Section>

      <Section title={t('designStudio.tokenTypography')} action={add('typography')}>
        {doc.tokens.typography.map((token) => {
          const change = (patch: Record<string, unknown>) => apply((current) => updateToken(current, 'typography', token.id, patch), `token:${token.id}`)
          return (
            <div key={token.id} className='space-y-1.5 rounded-md border p-2'>
              <div className='grid grid-cols-[1fr_1.75rem] items-center gap-1.5'>
                <input aria-label={t('designStudio.tokenName')} className={inputClass} value={token.name} onChange={(event) => change({ name: event.target.value })} />
                <IconButton label={t('designStudio.deleteToken')} onClick={() => apply((current) => removeToken(current, 'typography', token.id))}>
                  <Trash2 />
                </IconButton>
              </div>
              <select aria-label={t('designStudio.fontFamily')} className={inputClass} value={token.fontFamily} onChange={(event) => change({ fontFamily: event.target.value })}>
                {FONT_FAMILIES.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
              <div className='grid grid-cols-3 gap-1.5'>
                <NumberField label={t('designStudio.sizeShort')} value={token.fontSize} min={1} onChange={(fontSize) => change({ fontSize })} />
                <NumberField label={t('designStudio.weightShort')} value={token.fontWeight} min={100} max={900} step={100} onChange={(fontWeight) => change({ fontWeight })} />
                <NumberField label={t('designStudio.lineShort')} value={token.lineHeight} min={0.5} step={0.1} onChange={(lineHeight) => change({ lineHeight })} />
              </div>
            </div>
          )
        })}
      </Section>

      <Section title={t('designStudio.tokenSpacing')} action={add('spacing')}>
        {sizeTokens('spacing')}
      </Section>

      <Section title={t('designStudio.tokenRadius')} action={add('radius')}>
        {sizeTokens('radius')}
      </Section>
    </div>
  )
}
