/** One tool call the agent made during the current run, as the person sees it. */
export type ActivityState = 'running' | 'done' | 'denied' | 'expired' | 'failed'

export type ActivityItem = {
  id: number
  tool: string
  detail: string
  state: ActivityState
}

/**
 * The activity of every run in the conversation, keyed by the id of the message
 * that started it, so each turn keeps its own trace under its own message.
 */
export type ActivityRuns = Record<number, ActivityItem[]>

/** Adds a call to the run that started with message `runId`, leaving every other run as it was. */
export function addActivity(runs: ActivityRuns, runId: number, item: ActivityItem): ActivityRuns {
  return { ...runs, [runId]: [...(runs[runId] ?? []), item] }
}

/** Records how the call `id` ended, wherever in the conversation it is. */
export function settleActivity(runs: ActivityRuns, id: number, state: Exclude<ActivityState, 'running'>): ActivityRuns {
  const next: ActivityRuns = {}
  for (const [runId, items] of Object.entries(runs)) {
    next[Number(runId)] = items.map((item) => (item.id === id ? { ...item, state } : item))
  }
  return next
}

/** How many calls the whole conversation holds. */
export const activityCount = (runs: ActivityRuns) => Object.values(runs).reduce((total, items) => total + items.length, 0)

/** i18n keys cannot contain a dot, so `workspace.write_file` is looked up as `workspace_write_file`. */
export const toolKey = (tool: string) => tool.replace('.', '_')

/** One line of context for a call: the path for a file tool, the target for a run. */
export function describeArgs(args: Record<string, unknown>): string {
  if (typeof args.path === 'string' && args.path) return args.path
  if (typeof args.target === 'string' && args.target) return args.target
  return ''
}

/**
 * What a finished call came to, read from the text that goes back to the model:
 * a refusal, an expired approval, a failure, or a result that says it did not work.
 */
export function outcomeOf(result: string): Exclude<ActivityState, 'running'> {
  if (result.startsWith('TOOL_DENIED')) return 'denied'
  if (result.startsWith('TOOL_EXPIRED')) return 'expired'
  if (result.startsWith('TOOL_ERROR')) return 'failed'
  try {
    const parsed: unknown = JSON.parse(result)
    if (parsed && typeof parsed === 'object' && (parsed as { ok?: unknown }).ok === false) return 'failed'
  } catch {
    // Not JSON: plain text from a local tool counts as done.
  }
  return 'done'
}
