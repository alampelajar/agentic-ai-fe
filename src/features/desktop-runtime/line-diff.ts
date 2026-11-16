export type DiffLine = { type: 'same' | 'add' | 'del'; text: string }

/** Largest number of lines (per side, after trimming what is equal) that is compared. */
export const MAX_DIFF_LINES = 1500

/**
 * A line-by-line comparison of two texts, for showing unsaved edits. It trims the
 * equal start and end first and compares the middle with a longest-common-
 * subsequence table. Returns null when the middle is too large to compare without
 * freezing the page; the caller then says so instead of showing a diff.
 */
export function diffLines(before: string, after: string): DiffLine[] | null {
  const a = before === '' ? [] : before.split('\n')
  const b = after === '' ? [] : after.split('\n')
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }
  const middleA = a.slice(start, endA)
  const middleB = b.slice(start, endB)
  if (middleA.length > MAX_DIFF_LINES || middleB.length > MAX_DIFF_LINES) return null

  const rows = middleA.length + 1
  const cols = middleB.length + 1
  const table = new Uint32Array(rows * cols)
  for (let i = middleA.length - 1; i >= 0; i--) {
    for (let j = middleB.length - 1; j >= 0; j--) {
      table[i * cols + j] = middleA[i] === middleB[j] ? table[(i + 1) * cols + j + 1] + 1 : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1])
    }
  }

  const result: DiffLine[] = a.slice(0, start).map((text) => ({ type: 'same', text }))
  let i = 0
  let j = 0
  while (i < middleA.length && j < middleB.length) {
    if (middleA[i] === middleB[j]) {
      result.push({ type: 'same', text: middleA[i] })
      i++
      j++
    } else if (table[(i + 1) * cols + j] >= table[i * cols + j + 1]) {
      result.push({ type: 'del', text: middleA[i++] })
    } else {
      result.push({ type: 'add', text: middleB[j++] })
    }
  }
  while (i < middleA.length) result.push({ type: 'del', text: middleA[i++] })
  while (j < middleB.length) result.push({ type: 'add', text: middleB[j++] })
  for (const text of a.slice(endA)) result.push({ type: 'same', text })
  return result
}
