/**
 * Slash commands for skills: typing "/" at the start of a message offers the
 * user's skills, and choosing one writes "/slug " into the message. The server
 * reads those leading commands (see ResolveSkillCommands in the backend), so
 * this file only has to find the command being typed and complete it.
 */

export type SkillOption = {
  slug: string
  name: string
  description: string
}

export type SkillCommandMatch = {
  /** Index of the "/" being typed. */
  start: number
  /** What was typed after the "/". */
  query: string
}

// Commands already written at the start ("/a /b "), then the one being typed.
const TYPING = /^((?:\s*\/[a-z0-9][a-z0-9-]{1,99}\s+)*)\s*\/([a-z0-9-]*)$/

/** The command being typed just before the caret, or null when there is none. */
export function matchSkillCommand(value: string, caret: number): SkillCommandMatch | null {
  const before = value.slice(0, caret)
  const match = TYPING.exec(before)
  if (!match) return null
  const query = match[2]
  return { start: before.length - query.length - 1, query }
}

/** Skills whose slug or name contains what was typed, slug matches first. */
export function filterSkills(skills: SkillOption[], query: string): SkillOption[] {
  const needle = query.toLowerCase()
  if (!needle) return skills
  const startsWith: SkillOption[] = []
  const contains: SkillOption[] = []
  for (const skill of skills) {
    const slug = skill.slug.toLowerCase()
    const name = skill.name.toLowerCase()
    if (slug.startsWith(needle)) startsWith.push(skill)
    else if (slug.includes(needle) || name.includes(needle)) contains.push(skill)
  }
  return [...startsWith, ...contains]
}

/** Replaces the command being typed with the chosen one and says where the caret goes. */
export function insertSkillCommand(
  value: string,
  caret: number,
  match: SkillCommandMatch,
  slug: string
): { value: string; caret: number } {
  const command = `/${slug} `
  const after = value.slice(caret).replace(/^ +/, '')
  return {
    value: value.slice(0, match.start) + command + after,
    caret: match.start + command.length,
  }
}
