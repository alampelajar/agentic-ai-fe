import { Boxes, LocateFixed, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { deleteComponent, getNode } from '../model/document'
import { useDoc, useEditor, useEditorStore } from '../model/store'
import { InsertTile } from './assets-panel'
import { IconButton } from './fields'
import { DocThumbnail } from './svg-view'

export function ComponentsPanel() {
  const { t } = useTranslation()
  const store = useEditorStore()
  const doc = useDoc()
  const hasSelection = useEditor((state) => state.selection.length > 0)
  const state = store.getState()

  return (
    <div className='space-y-3 p-3'>
      <Button variant='outline' size='sm' className='h-7 w-full text-xs' disabled={!hasSelection} onClick={state.makeComponent}>
        <Boxes className='size-3.5' />
        {t('designStudio.createComponent')}
      </Button>
      {doc.components.length === 0 ? (
        <p className='text-[11px] leading-relaxed text-muted-foreground'>{t('designStudio.noComponents')}</p>
      ) : (
        <ul className='space-y-2'>
          {doc.components.map((component) => (
            <li key={component.id} className='overflow-hidden rounded-md border'>
              <InsertTile spec={{ kind: 'component', id: component.id }} label={t('designStudio.insertComponent', { name: component.name })} className='h-20 w-full rounded-none border-0'>
                <DocThumbnail doc={doc} ids={[component.rootId]} scope={`thumb-${component.id}-`} className='h-full w-full' />
              </InsertTile>
              <div className='flex items-center gap-1 border-t px-1.5 py-1'>
                <input
                  aria-label={t('designStudio.componentName')}
                  value={component.name}
                  onChange={(event) =>
                    state.apply((current) => ({ ...current, components: current.components.map((item) => (item.id === component.id ? { ...item, name: event.target.value } : item)) }), `component:${component.id}`)
                  }
                  className='h-6 min-w-0 flex-1 rounded bg-transparent px-1 text-xs outline-none hover:bg-muted focus:bg-muted'
                />
                <IconButton
                  label={t('designStudio.goToMain')}
                  className='size-6'
                  onClick={() => {
                    const root = getNode(store.getState().history.present, component.rootId)
                    if (root) {
                      state.select([root.id])
                      state.fitTo(root)
                    }
                  }}
                >
                  <LocateFixed />
                </IconButton>
                <IconButton label={t('designStudio.deleteComponent')} className='size-6' onClick={() => state.apply((current) => deleteComponent(current, component.id))}>
                  <Trash2 />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
