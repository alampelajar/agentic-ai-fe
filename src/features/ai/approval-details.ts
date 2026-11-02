import type { DesktopAction } from '@/features/desktop-runtime/api'

export type ApprovalDetail = { label: string; value: string; truncated?: boolean }

const MAX_VALUE_LENGTH = 500

const clip = (value: string) =>
  value.length > MAX_VALUE_LENGTH
    ? { value: `${value.slice(0, MAX_VALUE_LENGTH)}…`, truncated: true }
    : { value, truncated: false }

const stringify = (value: unknown): string => {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

// Describes what a pending desktop action will do, read from the action the
// runner stored (the same object it executes on approval), so the user's
// consent always matches the real arguments.
export function describeDesktopAction(action: DesktopAction): ApprovalDetail[] {
  const details: ApprovalDetail[] = []
  const args = action.arguments ?? {}

  for (const [key, raw] of Object.entries(args)) {
    if (raw === undefined || raw === null || raw === '') continue
    if (key === 'keys' && Array.isArray(raw)) {
      details.push({ label: 'Tombol / hotkey', value: raw.map(String).join('+') })
      continue
    }
    const { value, truncated } = clip(stringify(raw))
    const label = key === 'text' ? 'Teks yang akan diketik' : `Argumen: ${key}`
    details.push({ label, value, truncated: truncated || undefined })
  }

  if (action.target && Object.keys(action.target).length > 0) {
    const { value, truncated } = clip(stringify(action.target))
    details.push({ label: 'Target elemen', value, truncated: truncated || undefined })
  }

  if (details.length === 0) {
    details.push({ label: 'Argumen', value: 'Tidak ada argumen tambahan' })
  }
  return details
}
