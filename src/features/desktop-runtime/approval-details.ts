import type { DesktopAction } from './api'

export type ApprovalLang = 'id' | 'en'
export type WindowInfo = { handle: number; title: string }

export type ApprovalDetail = {
  key: string
  label: string
  /** What is shown by default. Masked when the value looks like a credential. */
  value: string
  /** The exact value, present only when `value` is masked. Shown on request. */
  fullValue?: string
  /** Something the user should notice before approving. */
  warning?: boolean
}

type Labels = Record<
  | 'window'
  | 'windowNotListed'
  | 'windowSensitive'
  | 'noWindow'
  | 'coordinates'
  | 'screenSize'
  | 'screenshotAge'
  | 'control'
  | 'scrollControl'
  | 'scrollWindow'
  | 'direction'
  | 'amount'
  | 'lines'
  | 'text'
  | 'textLength'
  | 'characters'
  | 'hotkey'
  | 'hotkeyNotAllowed'
  | 'hotkeyMissing'
  | 'noTarget'
  | 'otherArgument'
  | 'maskedNote'
  | 'name'
  | 'automationId'
  | 'controlType',
  string
>

const LABELS: Record<ApprovalLang, Labels> = {
  id: {
    window: 'Aplikasi / window',
    windowNotListed: 'tidak ditemukan di daftar window saat ini',
    windowSensitive: 'Window ini tampak berisi kredensial. Mengetik, hotkey, dan klik di dalamnya akan diblokir.',
    noWindow: 'Tidak ditentukan. Aksi akan ditolak.',
    coordinates: 'Koordinat klik (piksel layar)',
    screenSize: 'Ukuran layar',
    screenshotAge: 'Umur screenshot',
    control: 'Kontrol yang diklik',
    scrollControl: 'Kontrol yang di-scroll',
    scrollWindow: 'Window itu sendiri (tanpa kontrol khusus)',
    direction: 'Arah scroll',
    amount: 'Jumlah scroll',
    lines: 'baris',
    text: 'Teks yang akan diketik',
    textLength: 'Panjang teks',
    characters: 'karakter',
    hotkey: 'Kombinasi tombol',
    hotkeyNotAllowed: 'Tidak ada di allowlist hotkey. Aksi akan ditolak.',
    hotkeyMissing: 'Tidak ada kombinasi tombol. Aksi akan ditolak.',
    noTarget: 'Tidak ada target yang valid. Aksi akan ditolak.',
    otherArgument: 'Argumen lain',
    maskedNote: 'disamarkan',
    name: 'Nama',
    automationId: 'Automation ID',
    controlType: 'Tipe kontrol',
  },
  en: {
    window: 'Application / window',
    windowNotListed: 'not in the current window list',
    windowSensitive: 'This window looks like it holds credentials. Typing, hotkeys and clicks in it will be blocked.',
    noWindow: 'Not set. The action will be refused.',
    coordinates: 'Click position (screen pixels)',
    screenSize: 'Screen size',
    screenshotAge: 'Screenshot age',
    control: 'Control to click',
    scrollControl: 'Control to scroll',
    scrollWindow: 'The window itself (no specific control)',
    direction: 'Scroll direction',
    amount: 'Scroll amount',
    lines: 'lines',
    text: 'Text to type',
    textLength: 'Text length',
    characters: 'characters',
    hotkey: 'Key combination',
    hotkeyNotAllowed: 'Not on the hotkey allowlist. The action will be refused.',
    hotkeyMissing: 'No key combination. The action will be refused.',
    noTarget: 'No valid target. The action will be refused.',
    otherArgument: 'Other argument',
    maskedNote: 'masked',
    name: 'Name',
    automationId: 'Automation ID',
    controlType: 'Control type',
  },
}

// Mirrors the sidecar (desktop_sidecar.py) so the dialog states what will really happen.
export const ALLOWED_HOTKEYS = ['CTRL+A', 'CTRL+C', 'CTRL+V', 'CTRL+S', 'ALT+TAB', 'ESC'] as const
const SENSITIVE_WINDOW = /password|credential|otp|one[- ]time|authenticator|password manager/i
const DEFAULT_SCROLL_AMOUNT = 1
const DEFAULT_SCROLL_DIRECTION = 'down'
// The sidecar types at most 4000 characters; anything far beyond that is not a real request.
const MAX_SHOWN_LENGTH = 5000

/** Same normalisation as the sidecar: "ctrl+a" or ["ctrl", "a"] become "CTRL+A". */
export function normalizeHotkey(value: unknown): { combo: string; allowed: boolean } | null {
  let parts: unknown[]
  if (typeof value === 'string') parts = value.split('+')
  else if (Array.isArray(value) && value.length > 0) parts = value
  else return null
  if (!parts.every((part) => typeof part === 'string' && part.trim() !== '')) return null
  const combo = (parts as string[]).map((part) => part.trim().toUpperCase()).join('+')
  return { combo, allowed: (ALLOWED_HOTKEYS as readonly string[]).includes(combo) }
}

export const isSensitiveWindowTitle = (title: string) => SENSITIVE_WINDOW.test(title)

const SECRET_VALUE_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g,
  /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}/g,
  /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{16,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
]
const SECRET_ASSIGNMENT = /\b(password|passwd|pwd|secret|token|api[_-]?key|otp|authorization)\b(\s*[=:]\s*)("[^"]*"|'[^']*'|\S+)/gi
const MASK = '••••••'

/** Hides the parts of a text that look like credentials. Same patterns the backend redacts. */
export function maskSensitiveText(text: string): { masked: string; changed: boolean } {
  let masked = text
  for (const pattern of SECRET_VALUE_PATTERNS) masked = masked.replace(pattern, MASK)
  masked = masked.replace(SECRET_ASSIGNMENT, `$1$2${MASK}`)
  return { masked, changed: masked !== text }
}

const stringify = (value: unknown): string => {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

const clip = (value: string) => (value.length > MAX_SHOWN_LENGTH ? `${value.slice(0, MAX_SHOWN_LENGTH)}…` : value)

/** Finds the window a request refers to, by handle or by exact title. */
export function resolveWindow(reference: string | undefined, windows: WindowInfo[] | undefined): WindowInfo | null {
  if (!reference || !windows) return null
  const ref = reference.trim()
  if (/^\d+$/.test(ref)) return windows.find((w) => String(w.handle) === ref) ?? null
  const byTitle = windows.filter((w) => w.title.trim() === ref)
  return byTitle.length === 1 ? byTitle[0] : null
}

function describeControl(target: Record<string, unknown>, t: Labels): string | null {
  const value = target.value === undefined ? '' : String(target.value)
  if (target.type === 'name') return `${t.name}: "${value}"`
  if (target.type === 'automation_id') return `${t.automationId}: "${value}"`
  if (target.type === 'control_type') return `${t.controlType}: "${value}"`
  return null
}

/**
 * Describes what a pending desktop action will do, read from the action the
 * runner stored. It is the same object the runner executes on approval, so the
 * dialog always matches the real action.
 */
export function describeDesktopAction(
  action: DesktopAction,
  options: { windows?: WindowInfo[]; lang?: ApprovalLang } = {}
): ApprovalDetail[] {
  const t = LABELS[options.lang ?? 'id']
  const args = action.arguments ?? {}
  const target = action.target && typeof action.target === 'object' ? action.target : {}
  const details: ApprovalDetail[] = []
  const used = new Set<string>()

  // Window: name and handle when it can be resolved.
  const found = resolveWindow(action.window, options.windows)
  if (!action.window) {
    details.push({ key: 'window', label: t.window, value: t.noWindow, warning: true })
  } else if (found) {
    details.push({ key: 'window', label: t.window, value: `${found.title} (handle ${found.handle})` })
  } else {
    const suffix = options.windows ? ` (${t.windowNotListed})` : ''
    details.push({ key: 'window', label: t.window, value: `${action.window}${suffix}`, ...(options.windows ? { warning: true } : {}) })
  }
  const windowTitle = found?.title ?? (action.window && !/^\d+$/.test(action.window.trim()) ? action.window : '')
  const interactive = ['desktop.type', 'desktop.hotkey', 'desktop.click', 'desktop.double_click'].includes(action.action)
  if (windowTitle && interactive && isSensitiveWindowTitle(windowTitle)) {
    details.push({ key: 'window-sensitive', label: t.window, value: t.windowSensitive, warning: true })
  }

  const hasTarget = Object.keys(target).length > 0
  switch (action.action) {
    case 'desktop.click':
    case 'desktop.double_click': {
      if (target.type === 'coordinate') {
        details.push({ key: 'coordinates', label: t.coordinates, value: `(${String(target.x)}, ${String(target.y)})` })
        const size = Array.isArray(target.screen_size) ? target.screen_size : []
        if (size.length === 2) details.push({ key: 'screen', label: t.screenSize, value: `${String(size[0])} × ${String(size[1])}` })
        if (target.screenshot_age_ms !== undefined) {
          details.push({ key: 'age', label: t.screenshotAge, value: `${String(target.screenshot_age_ms)} ms` })
        }
      } else {
        const control = hasTarget ? describeControl(target, t) : null
        details.push(
          control
            ? { key: 'control', label: t.control, value: control }
            : { key: 'control', label: t.control, value: t.noTarget, warning: true }
        )
      }
      used.add('target')
      break
    }
    case 'desktop.scroll': {
      const control = hasTarget ? describeControl(target, t) : null
      details.push({ key: 'scroll-control', label: t.scrollControl, value: control ?? t.scrollWindow })
      details.push({ key: 'direction', label: t.direction, value: String(args.direction ?? DEFAULT_SCROLL_DIRECTION) })
      details.push({ key: 'amount', label: t.amount, value: `${String(args.amount ?? DEFAULT_SCROLL_AMOUNT)} ${t.lines}` })
      used.add('target')
      used.add('direction')
      used.add('amount')
      break
    }
    case 'desktop.type': {
      const text = typeof args.text === 'string' ? args.text : ''
      const { masked, changed } = maskSensitiveText(text)
      if (changed) {
        details.push({ key: 'text', label: `${t.text} (${t.maskedNote})`, value: clip(masked), fullValue: clip(text), warning: true })
      } else {
        details.push({ key: 'text', label: t.text, value: clip(text) })
      }
      details.push({ key: 'length', label: t.textLength, value: `${text.length} ${t.characters}` })
      if (hasTarget) {
        const control = describeControl(target, t)
        if (control) details.push({ key: 'control', label: t.control, value: control })
      }
      used.add('text')
      used.add('target')
      break
    }
    case 'desktop.hotkey': {
      const hotkey = normalizeHotkey(args.keys)
      if (!hotkey) details.push({ key: 'hotkey', label: t.hotkey, value: t.hotkeyMissing, warning: true })
      else details.push({ key: 'hotkey', label: t.hotkey, value: hotkey.allowed ? hotkey.combo : `${hotkey.combo}: ${t.hotkeyNotAllowed}`, warning: !hotkey.allowed })
      used.add('keys')
      break
    }
    default:
      // focus_window and anything else: the window above is the whole request.
      break
  }

  // Never hide something the runner will receive: list every other argument.
  for (const [key, raw] of Object.entries(args)) {
    if (used.has(key) || raw === undefined || raw === null || raw === '') continue
    details.push({ key: `arg-${key}`, label: `${t.otherArgument}: ${key}`, value: clip(stringify(raw)) })
  }
  if (hasTarget && !used.has('target')) {
    details.push({ key: 'target', label: `${t.otherArgument}: target`, value: clip(stringify(target)) })
  }
  return details
}

export type DesktopActionForm = {
  action: string
  agent: string
  reason: string
  window: string
  text: string
  targetKind: 'none' | 'name' | 'automation_id' | 'control_type'
  targetValue: string
  direction: string
  amount: string
}

/** Builds the request the panel sends, so what it asks for is defined in one place. */
export function buildDesktopActionRequest(form: DesktopActionForm): Omit<DesktopAction, 'id' | 'expires_at'> {
  const request: Omit<DesktopAction, 'id' | 'expires_at'> = {
    action: form.action,
    agent: form.agent,
    reason: form.reason,
    window: form.window.trim() || undefined,
  }
  const control = form.targetKind !== 'none' && form.targetValue.trim() ? { type: form.targetKind, value: form.targetValue.trim() } : undefined
  if (form.action === 'desktop.click' || form.action === 'desktop.double_click') {
    if (control) request.target = control
  } else if (form.action === 'desktop.scroll') {
    if (control) request.target = control
    request.arguments = { direction: form.direction, amount: Number(form.amount) }
  } else if (form.action === 'desktop.type') {
    if (form.text) request.arguments = { text: form.text }
  } else if (form.action === 'desktop.hotkey') {
    // The sidecar reads the combination from "keys", not "text".
    if (form.text.trim()) request.arguments = { keys: form.text.trim() }
  }
  return request
}
