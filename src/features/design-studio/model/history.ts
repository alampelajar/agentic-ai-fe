import type { Doc } from './types'

const LIMIT = 100
const COALESCE_MS = 800

/**
 * Undo history over immutable documents. A drag runs as a transaction: previews
 * replace the present without leaving a trace, and ending it adds a single step.
 * Edits with the same key close together (typing a colour, nudging) also merge.
 */
export type History = {
  past: Doc[]
  present: Doc
  future: Doc[]
  /** The document when the running transaction began. */
  base: Doc | null
  lastKey: string | null
  lastAt: number
}

export const createHistory = (doc: Doc): History => ({ past: [], present: doc, future: [], base: null, lastKey: null, lastAt: 0 })

const push = (past: Doc[], doc: Doc) => [...past, doc].slice(-LIMIT)

export function commit(history: History, next: Doc, key: string | null = null, now = Date.now()): History {
  if (next === history.present) return history
  const merges = key !== null && key === history.lastKey && now - history.lastAt < COALESCE_MS && history.past.length > 0
  return {
    past: merges ? history.past : push(history.past, history.present),
    present: next,
    future: [],
    base: null,
    lastKey: key,
    lastAt: now,
  }
}

export const begin = (history: History): History => ({ ...history, base: history.base ?? history.present })

export const preview = (history: History, next: Doc): History => ({ ...history, present: next })

export function end(history: History): History {
  if (!history.base) return history
  if (history.base === history.present) return { ...history, base: null }
  return { past: push(history.past, history.base), present: history.present, future: [], base: null, lastKey: null, lastAt: 0 }
}

/** Abandons a running transaction. */
export const cancel = (history: History): History => (history.base ? { ...history, present: history.base, base: null } : history)

export function undo(history: History): History {
  const current = cancel(history)
  const previous = current.past[current.past.length - 1]
  if (!previous) return current
  return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future], base: null, lastKey: null, lastAt: 0 }
}

export function redo(history: History): History {
  const current = cancel(history)
  const next = current.future[0]
  if (!next) return current
  return { past: push(current.past, current.present), present: next, future: current.future.slice(1), base: null, lastKey: null, lastAt: 0 }
}
