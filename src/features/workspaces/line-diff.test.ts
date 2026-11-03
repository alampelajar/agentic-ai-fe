import { describe, expect, it } from 'vitest'
import { diffLines, MAX_DIFF_LINES } from './line-diff'

const summary = (lines: ReturnType<typeof diffLines>) => lines?.map((line) => `${line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}${line.text}`).join('|')

describe('diffLines', () => {
  it('marks added, removed and unchanged lines', () => {
    expect(summary(diffLines('a\nb\nc', 'a\nB\nc\nd'))).toBe(' a|-b|+B| c|+d')
  })

  it('has nothing to mark for equal texts, and handles empty sides', () => {
    expect(summary(diffLines('same\ntext', 'same\ntext'))).toBe(' same| text')
    expect(summary(diffLines('', 'new\nfile'))).toBe('+new|+file')
    expect(summary(diffLines('old\nfile', ''))).toBe('-old|-file')
    expect(diffLines('', '')).toEqual([])
  })

  it('finds a moved block as a removal and an addition', () => {
    expect(summary(diffLines('1\n2\n3\n4', '1\n3\n4\n2'))).toBe(' 1|-2| 3| 4|+2')
  })

  it('gives up on a change too large to compare, instead of freezing', () => {
    const big = Array.from({ length: MAX_DIFF_LINES + 1 }, (_, i) => `line ${i}`).join('\n')
    expect(diffLines(big, big.toUpperCase())).toBeNull()
    // A large file with a small edit is fine: the equal parts are skipped.
    expect(diffLines(big, big.replace('line 5\n', 'line five\n'))).not.toBeNull()
  })
})
