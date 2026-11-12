import {
  Brain,
  CheckCircle2,
  FileArchive,
  FilePen,
  FilePlus2,
  FileSearch,
  FlaskConical,
  FolderOpen,
  GitCompare,
  Hammer,
  Hourglass,
  ImageIcon,
  LayoutTemplate,
  ListChecks,
  type LucideIcon,
  Monitor,
  Package,
  Paperclip,
  ShieldAlert,
  Sparkles,
  Upload,
  Wrench,
} from 'lucide-react'

/**
 * What the agent is doing right now, from the events the chat actually sees: the request being
 * understood, attachments being read, a model thinking, a tool running, an approval waiting.
 * The progress strip shows each one with its own icon and words instead of a fixed list of steps.
 */
export type RunPhase =
  | { kind: 'understanding' }
  | { kind: 'images'; count: number }
  | { kind: 'files'; count: number }
  | { kind: 'thinking' }
  | { kind: 'tool'; tool: string; detail?: string }
  | { kind: 'approval'; tool: string; detail?: string }
  | { kind: 'summarizing' }
  | { kind: 'site'; stage: 'design' | 'build' | 'package' }
  | { kind: 'done' }

/** How the bar moves: sliding while work goes on, still while the person decides, full when done. */
export type PhaseMotion = 'working' | 'waiting' | 'complete'

export type PhaseView = {
  icon: LucideIcon
  /** i18n key under agentic.phase, with its values. */
  labelKey: string
  values: Record<string, string | number>
  motion: PhaseMotion
}

type ToolKind = 'explore' | 'read' | 'changes' | 'write' | 'edit' | 'test' | 'build' | 'install' | 'job' | 'publish' | 'desktop' | 'other'

const TOOL_KINDS: Record<string, ToolKind> = {
  'workspace.list_files': 'explore',
  'workspace.read_file': 'read',
  'workspace.get_changes': 'changes',
  'workspace.write_file': 'write',
  'workspace.edit_file': 'edit',
  'workspace.run_test': 'test',
  'workspace.build': 'build',
  'workspace.install_dependencies': 'install',
  'workspace.get_execution': 'job',
  'workspace.publish': 'publish',
}

/** A tool name a person can read: workspace.run_test becomes "run test". */
export const shortToolName = (tool: string) => tool.replace(/^(workspace|desktop)\./, '').replace(/[_-]+/g, ' ')

/** The kind of work a tool does, also for the Local Agent Runner's action names (read-file, go-test…). */
export function toolKind(tool: string): ToolKind {
  if (TOOL_KINDS[tool]) return TOOL_KINDS[tool]
  if (tool.startsWith('desktop.')) return 'desktop'
  const name = tool.toLowerCase()
  if (name.includes('list')) return 'explore'
  if (name.includes('read')) return 'read'
  if (name.includes('write')) return 'write'
  if (name.includes('status') || name.includes('diff')) return 'changes'
  if (name.includes('test')) return 'test'
  if (name.includes('build')) return 'build'
  if (name.includes('install') || name.includes('deps')) return 'install'
  return 'other'
}

const TOOL_ICONS: Record<ToolKind, LucideIcon> = {
  explore: FolderOpen,
  read: FileSearch,
  changes: GitCompare,
  write: FilePlus2,
  edit: FilePen,
  test: FlaskConical,
  build: Hammer,
  install: Package,
  job: Hourglass,
  publish: Upload,
  desktop: Monitor,
  other: Wrench,
}

const SITE_ICONS = { design: LayoutTemplate, build: Hammer, package: FileArchive } as const

export function describePhase(phase: RunPhase): PhaseView {
  switch (phase.kind) {
    case 'understanding':
      return { icon: Sparkles, labelKey: 'understanding', values: {}, motion: 'working' }
    case 'images':
      return { icon: ImageIcon, labelKey: 'images', values: { count: phase.count }, motion: 'working' }
    case 'files':
      return { icon: Paperclip, labelKey: 'files', values: { count: phase.count }, motion: 'working' }
    case 'thinking':
      return { icon: Brain, labelKey: 'thinking', values: {}, motion: 'working' }
    case 'tool': {
      const kind = toolKind(phase.tool)
      // Listing the root has no path to name, so it reads as the project's files.
      const labelKey = kind === 'explore' && !phase.detail ? 'tool.exploreRoot' : `tool.${kind}`
      return { icon: TOOL_ICONS[kind], labelKey, values: { detail: phase.detail || shortToolName(phase.tool), tool: shortToolName(phase.tool) }, motion: 'working' }
    }
    case 'approval':
      return { icon: ShieldAlert, labelKey: 'approval', values: { detail: phase.detail || shortToolName(phase.tool) }, motion: 'waiting' }
    case 'summarizing':
      return { icon: ListChecks, labelKey: 'summarizing', values: {}, motion: 'working' }
    case 'site':
      return { icon: SITE_ICONS[phase.stage], labelKey: `site.${phase.stage}`, values: {}, motion: 'working' }
    case 'done':
      return { icon: CheckCircle2, labelKey: 'done', values: {}, motion: 'complete' }
  }
}

/** Two phases are the same step when the trail would show them as one (a tool on the same file). */
export function samePhase(a: RunPhase, b: RunPhase): boolean {
  if (a.kind !== b.kind) return false
  if ((a.kind === 'tool' || a.kind === 'approval') && (b.kind === 'tool' || b.kind === 'approval')) {
    return a.tool === b.tool && a.detail === b.detail
  }
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Steps worth keeping in the trail: real work, not the model thinking between tools. */
export const isTrailStep = (phase: RunPhase) => phase.kind !== 'thinking' && phase.kind !== 'approval' && phase.kind !== 'done'

/** The trail after leaving `previous`: at most `limit` recent steps, without repeating the last one. */
export function extendTrail(trail: RunPhase[], previous: RunPhase | null, limit = 4): RunPhase[] {
  if (!previous || !isTrailStep(previous)) return trail
  const last = trail[trail.length - 1]
  if (last && samePhase(last, previous)) return trail
  return [...trail, previous].slice(-limit)
}

/** Elapsed time as m:ss. */
export function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
