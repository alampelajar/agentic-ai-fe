import { describe, expect, it } from 'vitest'
import { filterSkills, insertSkillCommand, matchSkillCommand, type SkillOption } from './skill-command'

const skills: SkillOption[] = [
  { slug: 'desktop-control', name: 'Desktop Control', description: 'Control the desktop' },
  { slug: 'code-review', name: 'Code Review', description: 'Review code' },
  { slug: 'review-helper', name: 'Helper', description: '' },
]

describe('matchSkillCommand', () => {
  it('finds the command being typed at the start', () => {
    expect(matchSkillCommand('/', 1)).toEqual({ start: 0, query: '' })
    expect(matchSkillCommand('/des', 4)).toEqual({ start: 0, query: 'des' })
  })

  it('finds a second command after a finished one', () => {
    expect(matchSkillCommand('/desktop-control /co', 20)).toEqual({ start: 17, query: 'co' })
  })

  it('does nothing for a slash that is not at the start or is part of a path', () => {
    expect(matchSkillCommand('buka /des', 9)).toBeNull()
    expect(matchSkillCommand('/etc/hosts', 10)).toBeNull()
    expect(matchSkillCommand('halo', 4)).toBeNull()
    expect(matchSkillCommand('/Des', 4)).toBeNull()
  })

  it('only looks at the text before the caret', () => {
    expect(matchSkillCommand('/des buka notepad', 4)).toEqual({ start: 0, query: 'des' })
    expect(matchSkillCommand('/des buka notepad', 9)).toBeNull()
  })
})

describe('filterSkills', () => {
  it('returns everything for an empty query', () => {
    expect(filterSkills(skills, '')).toHaveLength(3)
  })

  it('puts slug prefix matches before other matches', () => {
    expect(filterSkills(skills, 'review').map((skill) => skill.slug)).toEqual(['review-helper', 'code-review'])
  })

  it('matches the display name too', () => {
    expect(filterSkills(skills, 'desktop').map((skill) => skill.slug)).toEqual(['desktop-control'])
    expect(filterSkills(skills, 'zzz')).toEqual([])
  })
})

describe('insertSkillCommand', () => {
  it('completes the command and leaves the caret after it', () => {
    const match = matchSkillCommand('/des', 4)!
    expect(insertSkillCommand('/des', 4, match, 'desktop-control')).toEqual({ value: '/desktop-control ', caret: 17 })
  })

  it('keeps the rest of the message and does not double the space', () => {
    const match = matchSkillCommand('/des buka notepad', 4)!
    expect(insertSkillCommand('/des buka notepad', 4, match, 'desktop-control')).toEqual({
      value: '/desktop-control buka notepad',
      caret: 17,
    })
  })

  it('completes a second command', () => {
    const match = matchSkillCommand('/desktop-control /co', 20)!
    expect(insertSkillCommand('/desktop-control /co', 20, match, 'code-review')).toEqual({
      value: '/desktop-control /code-review ',
      caret: 30,
    })
  })
})
