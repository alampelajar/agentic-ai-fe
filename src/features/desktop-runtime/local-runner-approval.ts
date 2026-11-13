import type { DiffLine } from '@/features/workspaces/line-diff'

/**
 * What the Local Agent Runner is about to do on the person's computer.
 * For a write, `before` is the file on disk: null when the file does not exist yet,
 * undefined when it could not be read (the full new content is then shown).
 */
export type LocalRunnerApproval =
  | { kind: 'write'; workspace: string; path: string; before: string | null | undefined; after: string }
  | { kind: 'execute'; workspace: string; action: string; runtime: 'native' | 'docker' }

/** The command each runner action starts. It mirrors the runner's fixed list. */
export const runnerActionCommands: Record<string, string> = {
  'git-status': 'git status --short',
  'go-test': 'go test ./...',
  'go-build': 'go build ./...',
  'npm-test': 'npm run test',
  'npm-build': 'npm run build',
  'npm-lint': 'npm run lint',
  'python-test': 'python -m pytest',
}

/** Unchanged lines kept around each change, so the person sees where it is. */
const CONTEXT_LINES = 2

type Row = DiffLine | { type: 'gap'; count: number }

/** Keeps the changed lines and a little context, and folds long unchanged runs. */
export function compactDiff(lines: DiffLine[]): Row[] {
  const keep = lines.map(() => false)
  lines.forEach((line, index) => {
    if (line.type === 'same') return
    for (let k = Math.max(0, index - CONTEXT_LINES); k <= Math.min(lines.length - 1, index + CONTEXT_LINES); k++) keep[k] = true
  })
  const rows: Row[] = []
  let skipped = 0
  lines.forEach((line, index) => {
    if (keep[index]) {
      if (skipped) rows.push({ type: 'gap', count: skipped })
      skipped = 0
      rows.push(line)
    } else {
      skipped++
    }
  })
  if (skipped) rows.push({ type: 'gap', count: skipped })
  return rows
}
