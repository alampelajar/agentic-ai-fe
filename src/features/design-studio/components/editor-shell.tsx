import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Circle,
  CloudOff,
  Download,
  Frame,
  Hand,
  Loader2,
  Minus,
  MousePointer2,
  PanelLeft,
  PanelRight,
  Play,
  Plus,
  Redo2,
  Slash,
  Square,
  Type,
  Undo2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { StoreApi } from 'zustand'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { boundsOf, getNode, moveNodes } from '../model/document'
import { EditorContext, useEditor, useEditorStore, type EditorState, type Tool } from '../model/store'
import { useAutoSave, type SaveStatus } from '../use-auto-save'
import { AssetsPanel } from './assets-panel'
import { Canvas } from './canvas'
import { ComponentsPanel } from './components-panel'
import { DesignSettingsPanel } from './design-settings-panel'
import { ExportDialog } from './export-dialog'
import { IconButton } from './fields'
import { LayersPanel } from './layers-panel'
import { PreviewMode } from './preview-mode'
import { PropertiesPanel } from './properties-panel'
import { useImportImages } from './use-import-images'

const TOOLS: { tool: Tool; icon: typeof Square; key: string }[] = [
  { tool: 'select', icon: MousePointer2, key: 'V' },
  { tool: 'hand', icon: Hand, key: 'H' },
  { tool: 'frame', icon: Frame, key: 'F' },
  { tool: 'rect', icon: Square, key: 'R' },
  { tool: 'ellipse', icon: Circle, key: 'O' },
  { tool: 'line', icon: Slash, key: 'L' },
  { tool: 'text', icon: Type, key: 'T' },
]
const TOOL_KEYS: Record<string, Tool> = { v: 'select', h: 'hand', f: 'frame', r: 'rect', o: 'ellipse', l: 'line', t: 'text' }

function useShortcuts(saveNow: () => void) {
  const store = useEditorStore()
  const importImages = useImportImages()
  useEffect(() => {
    const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    const onKey = (event: KeyboardEvent) => {
      const state = store.getState()
      const command = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      if (command && key === 's') {
        event.preventDefault()
        saveNow()
        return
      }
      if (typing(event.target)) return
      const run = (action: () => void) => {
        event.preventDefault()
        action()
      }
      if (command) {
        if (key === 'z') run(event.shiftKey ? state.redo : state.undo)
        else if (key === 'y') run(state.redo)
        else if (key === 'd') run(state.duplicate)
        else if (key === 'g') run(event.shiftKey ? state.ungroup : state.group)
        else if (key === 'a') run(state.selectAll)
        else if (key === 'c') state.copy()
        else if (key === 'x') {
          state.copy()
          state.remove()
        } else if (key === '0') run(() => state.zoomAt(1))
        else if (key === '1') run(state.fitAll)
        else if (key === '=' || key === '+') run(() => state.zoomAt(state.zoom * 1.25))
        else if (key === '-') run(() => state.zoomAt(state.zoom / 1.25))
        else if (key === ']') run(() => state.order(event.shiftKey ? 'front' : 'forward'))
        else if (key === '[') run(() => state.order(event.shiftKey ? 'back' : 'backward'))
        return
      }
      if (key === 'delete' || key === 'backspace') run(state.remove)
      else if (key === 'escape') run(() => (state.tool !== 'select' ? state.setTool('select') : state.select([])))
      else if (key === 'enter' && state.selection.length === 1) {
        const node = getNode(state.history.present, state.selection[0])
        if (node && ['text', 'button', 'input', 'card'].includes(node.type) && !node.locked) run(() => state.setEditing(node.id))
      } else if (key.startsWith('arrow') && state.selection.length > 0) {
        const step = event.shiftKey ? 10 : 1
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0
        const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0
        const ids = state.selection.filter((id) => !getNode(state.history.present, id)?.locked)
        run(() => state.apply((current) => moveNodes(current, ids, dx, dy), 'nudge'))
      } else if (TOOL_KEYS[key] && !event.altKey) {
        run(() => state.setTool(TOOL_KEYS[key]))
      } else if (key === '[') run(() => state.order('backward'))
      else if (key === ']') run(() => state.order('forward'))
    }
    const onPaste = (event: ClipboardEvent) => {
      if (typing(event.target)) return
      const files = [...(event.clipboardData?.files ?? [])]
      event.preventDefault()
      if (files.length > 0) void importImages(files)
      else store.getState().paste()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('paste', onPaste)
    }
  }, [store, saveNow, importImages])
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  const { t } = useTranslation()
  const view: Record<SaveStatus, { icon: ReactNode; className?: string }> = {
    saved: { icon: <Check className='size-3.5' /> },
    unsaved: { icon: <Circle className='size-2 fill-current' /> },
    saving: { icon: <Loader2 className='size-3.5 animate-spin' /> },
    offline: { icon: <CloudOff className='size-3.5' />, className: 'text-amber-600 dark:text-amber-400' },
    conflict: { icon: <AlertTriangle className='size-3.5' />, className: 'text-destructive' },
    'too-large': { icon: <AlertTriangle className='size-3.5' />, className: 'text-destructive' },
  }
  const label = t(`designStudio.save.${status}`)
  const retryable = status === 'offline'
  return (
    <button
      type='button'
      disabled={!retryable}
      onClick={onRetry}
      role='status'
      title={label}
      className={cn('hidden items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground sm:flex', view[status].className)}
    >
      {view[status].icon}
      <span className='max-w-40 truncate'>{label}</span>
    </button>
  )
}

function ZoomControl() {
  const { t } = useTranslation()
  const store = useEditorStore()
  const zoom = useEditor((state) => state.zoom)
  const state = store.getState()
  return (
    <div className='flex items-center'>
      <IconButton label={t('designStudio.zoomOut')} onClick={() => state.zoomAt(zoom / 1.25)}>
        <Minus />
      </IconButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type='button' aria-label={t('designStudio.zoomLevel')} className='h-7 w-12 rounded-md text-center text-xs tabular-nums hover:bg-accent'>
            {Math.round(zoom * 100)}%
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='center' className='z-[60]'>
          <DropdownMenuItem onSelect={state.fitAll}>{t('designStudio.zoomFit')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => state.fitTo(boundsOf(state.history.present, store.getState().selection))}>{t('designStudio.zoomSelection')}</DropdownMenuItem>
          <DropdownMenuSeparator />
          {[0.5, 1, 2].map((level) => (
            <DropdownMenuItem key={level} onSelect={() => state.zoomAt(level)}>
              {level * 100}%
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <IconButton label={t('designStudio.zoomIn')} onClick={() => state.zoomAt(zoom * 1.25)}>
        <Plus />
      </IconButton>
    </div>
  )
}

function Toolbar() {
  const { t } = useTranslation()
  const store = useEditorStore()
  const tool = useEditor((state) => state.tool)
  return (
    <div role='toolbar' aria-label={t('designStudio.tools')} className='absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-0.5 rounded-xl border bg-background p-1 shadow-lg'>
      {TOOLS.map(({ tool: item, icon: Icon, key }) => (
        <IconButton key={item} label={`${t(`designStudio.toolNames.${item}`)} (${key})`} active={tool === item} className='size-8' onClick={() => store.getState().setTool(item)}>
          <Icon />
        </IconButton>
      ))}
      {/* The top bar has no room for zoom on a phone. */}
      <span className='mx-0.5 my-1 w-px bg-border sm:hidden' />
      <div className='flex items-center sm:hidden'>
        <ZoomControl />
      </div>
    </div>
  )
}

function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (value: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div role='tablist' className='flex h-9 shrink-0 items-center gap-1 border-b px-2'>
      {items.map((item) => (
        <button
          key={item.id}
          type='button'
          role='tab'
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={cn('h-6 rounded-md px-2 text-xs font-medium transition-colors', value === item.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function EditorLayout({ name, setName, status, saveNow, onReload }: { name: string; setName: (name: string) => void; status: SaveStatus; saveNow: () => void; onReload: () => void }) {
  const { t } = useTranslation()
  const store = useEditorStore()
  const canUndo = useEditor((state) => state.history.past.length > 0)
  const canRedo = useEditor((state) => state.history.future.length > 0)
  const [leftTab, setLeftTab] = useState<'layers' | 'assets' | 'components'>('layers')
  const [rightTab, setRightTab] = useState<'properties' | 'design'>('properties')
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  useShortcuts(saveNow)

  const state = store.getState()
  return (
    <div data-testid='design-editor' className='fixed inset-0 z-50 flex flex-col bg-background text-foreground'>
      <header className='flex h-12 shrink-0 items-center gap-1 border-b px-2'>
        <Button asChild variant='ghost' size='icon' className='size-8'>
          <Link to='/design-studio' aria-label={t('designStudio.backToProjects')}>
            <ArrowLeft />
          </Link>
        </Button>
        <IconButton label={t('designStudio.togglePanelLeft')} className='lg:hidden' active={leftOpen} onClick={() => setLeftOpen((value) => !value)}>
          <PanelLeft />
        </IconButton>
        <input
          aria-label={t('designStudio.projectName')}
          value={name}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          className='h-7 w-28 min-w-0 rounded-md bg-transparent px-2 text-sm font-medium outline-none hover:bg-muted focus:bg-muted sm:w-48'
        />
        <SaveIndicator status={status} onRetry={saveNow} />
        <div className='flex-1' />
        <IconButton label={t('designStudio.undo')} disabled={!canUndo} onClick={state.undo}>
          <Undo2 />
        </IconButton>
        <IconButton label={t('designStudio.redo')} disabled={!canRedo} onClick={state.redo}>
          <Redo2 />
        </IconButton>
        <span className='mx-1 hidden h-5 w-px bg-border sm:block' />
        <div className='hidden sm:block'>
          <ZoomControl />
        </div>
        <span className='mx-1 hidden h-5 w-px bg-border sm:block' />
        <Button variant='ghost' size='sm' className='h-8 px-2 text-xs' aria-label={t('designStudio.preview')} onClick={() => setPreviewing(true)}>
          <Play />
          <span className='hidden md:inline'>{t('designStudio.preview')}</span>
        </Button>
        <Button size='sm' className='h-8 px-2 text-xs sm:px-3' aria-label={t('designStudio.export')} onClick={() => setExporting(true)}>
          <Download />
          <span className='hidden md:inline'>{t('designStudio.export')}</span>
        </Button>
        <IconButton label={t('designStudio.togglePanelRight')} className='lg:hidden' active={rightOpen} onClick={() => setRightOpen((value) => !value)}>
          <PanelRight />
        </IconButton>
      </header>

      {status === 'conflict' && (
        <div role='alert' className='flex flex-wrap items-center justify-center gap-3 border-b bg-destructive/10 px-3 py-2 text-xs'>
          <span>{t('designStudio.conflictMessage')}</span>
          <Button size='sm' variant='outline' className='h-7 text-xs' onClick={onReload}>
            {t('designStudio.reload')}
          </Button>
        </div>
      )}
      {status === 'too-large' && (
        <div role='alert' className='border-b bg-destructive/10 px-3 py-2 text-center text-xs'>
          {t('designStudio.tooLargeMessage')}
        </div>
      )}

      <div className='relative flex min-h-0 flex-1'>
        <aside
          aria-label={t('designStudio.leftPanel')}
          className={cn('absolute inset-y-0 left-0 z-20 w-64 flex-col border-r bg-background shadow-lg lg:static lg:flex lg:shadow-none', leftOpen ? 'flex' : 'hidden')}
        >
          <Tabs
            value={leftTab}
            onChange={setLeftTab}
            items={[
              { id: 'layers', label: t('designStudio.layers') },
              { id: 'assets', label: t('designStudio.assets') },
              { id: 'components', label: t('designStudio.components') },
            ]}
          />
          <div className='min-h-0 flex-1 overflow-y-auto'>
            {leftTab === 'layers' && <LayersPanel />}
            {leftTab === 'assets' && <AssetsPanel />}
            {leftTab === 'components' && <ComponentsPanel />}
          </div>
        </aside>

        <main className='relative min-w-0 flex-1'>
          <Canvas />
          <Toolbar />
        </main>

        <aside
          aria-label={t('designStudio.rightPanel')}
          className={cn('absolute inset-y-0 right-0 z-20 w-64 flex-col border-l bg-background shadow-lg lg:static lg:flex lg:shadow-none', rightOpen ? 'flex' : 'hidden')}
        >
          <Tabs
            value={rightTab}
            onChange={setRightTab}
            items={[
              { id: 'properties', label: t('designStudio.properties') },
              { id: 'design', label: t('designStudio.designSettings') },
            ]}
          />
          <div className='min-h-0 flex-1 overflow-y-auto'>
            {rightTab === 'properties' ? <PropertiesPanel /> : <DesignSettingsPanel />}
          </div>
        </aside>
      </div>

      <ExportDialog open={exporting} onOpenChange={setExporting} projectName={name} />
      {previewing && <PreviewMode onClose={() => setPreviewing(false)} />}
    </div>
  )
}

export function EditorShell({
  store,
  projectId,
  initialName,
  revision,
  startDirty,
  onReload,
}: {
  store: StoreApi<EditorState>
  projectId: number
  initialName: string
  revision: number
  startDirty: boolean
  onReload: () => void
}) {
  const [name, setName] = useState(initialName)
  const { status, saveNow } = useAutoSave(projectId, store, name, revision, startDirty)
  return (
    <EditorContext.Provider value={store}>
      <EditorLayout name={name} setName={setName} status={status} saveNow={() => void saveNow()} onReload={onReload} />
    </EditorContext.Provider>
  )
}
