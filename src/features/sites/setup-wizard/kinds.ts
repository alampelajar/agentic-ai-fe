import type { Contact, QuestionsResult } from '../data/api'

export const EMPTY_CONTACT: Contact = {
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  hours: '',
}

// Kinds of website that are an occasion (an invitation, an event), not a business.
const OCCASIONS = new Set([
  'wedding',
  'engagement',
  'anniversary',
  'event',
  'celebration',
])
const COUPLES = new Set(['wedding', 'engagement', 'anniversary'])
// Labels of "what we understood" that name a place.
const PLACE_LABEL = /^(tempat|lokasi|alamat|place|venue|location|address)/i

export const isOccasion = (kind: string) => OCCASIONS.has(kind)
export const isCouple = (kind: string) => COUPLES.has(kind)

/** Contact details the description already gave are filled in, not asked again. */
export function fillKnownContact(
  current: Contact,
  result: QuestionsResult
): Contact {
  const known = result.known_contact
  return {
    phone: current.phone || known?.phone || '',
    whatsapp: current.whatsapp || known?.whatsapp || '',
    email: current.email || known?.email || '',
    address:
      current.address ||
      known?.address ||
      result.understood?.find((fact) => PLACE_LABEL.test(fact.label))?.value ||
      '',
    hours: current.hours || known?.hours || '',
  }
}

/** The chosen options plus the "Other" text the person typed, per question. */
export function mergeOtherAnswers(
  answers: Record<string, string[]>,
  other: Record<string, string>
): Record<string, string[]> {
  const merged = { ...answers }
  for (const [questionId, text] of Object.entries(other)) {
    if (text.trim())
      merged[questionId] = [...(merged[questionId] ?? []), text.trim()]
  }
  return merged
}
