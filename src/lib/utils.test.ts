import { describe, expect, it } from 'vitest'
import { getDisplayNameInitials, getPageNumbers } from './utils'

describe('getPageNumbers', () => {
  it('returns all pages when total is at most 5', () => {
    expect(getPageNumbers(1, 3)).toEqual([1, 2, 3])
    expect(getPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('shows ellipsis near the beginning', () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, 3, 4, '...', 10])
    expect(getPageNumbers(3, 10)).toEqual([1, 2, 3, 4, '...', 10])
  })

  it('shows ellipsis near the end', () => {
    expect(getPageNumbers(10, 10)).toEqual([1, '...', 7, 8, 9, 10])
    expect(getPageNumbers(9, 10)).toEqual([1, '...', 7, 8, 9, 10])
  })

  it('shows ellipsis on both side in the middle', () => {
    expect(getPageNumbers(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10])
  })

  it('handles current page greater than total pages', () => {
    expect(getPageNumbers(6, 5)).toEqual([1, 2, 3, 4, 5])
    expect(getPageNumbers(11, 10)).toEqual([1, '...', 7, 8, 9, 10])
  })
})

describe('getDisplayNameInitials', () => {
  it('returns initials from the first and last words', () => {
    expect(getDisplayNameInitials('Alam RPL')).toBe('AR')
  })

  it('returns the first two characters for a single-word name', () => {
    expect(getDisplayNameInitials('Alam')).toBe('AL')
  })

  it('returns a fallback for a whitespace-only name', () => {
    expect(getDisplayNameInitials('   ')).toBe('?')
  })

  it('returns a fallback for an empty name', () => {
    expect(getDisplayNameInitials('')).toBe('?')
  })
})
