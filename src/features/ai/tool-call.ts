export type LocalRunnerToolCall = {
  action: string
  runtime?: 'native' | 'docker'
  path?: string
  content?: string
  create?: boolean
  window?: string
  target?: Record<string, unknown>
  text?: string
  keys?: string[]
  amount?: number
  direction?: string
  skill?: string
}

// Canonical desktop tool names. They mirror ToolRegistry in the backend
// (services/tool_registry.go) and the runner, which use the same strings.
export const READ_ONLY_DESKTOP_TOOLS: readonly string[] = [
  'desktop.status',
  'desktop.screenshot',
  'desktop.windows',
  'desktop.inspect',
]

export const DESKTOP_TOOLS: readonly string[] = [
  ...READ_ONLY_DESKTOP_TOOLS,
  'desktop.click',
  'desktop.double_click',
  'desktop.scroll',
  'desktop.type',
  'desktop.hotkey',
  'desktop.focus_window',
]

// Workspace tools use kebab-case ("list-files"). Desktop tools are canonical
// snake_case after the dot ("desktop.focus_window", "desktop.double_click"),
// which is how the backend registry and the runner name them, so rewriting
// their underscores to hyphens would make them impossible to run.
export const normalizeToolAction = (value: unknown) => {
  const text = String(value ?? '').trim()
  if (/^desktop\./i.test(text)) {
    return text
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase()
  }
  return text
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[ _]+/g, '-')
    .toLowerCase()
}

export function parseLocalAgentToolCall(raw: string): LocalRunnerToolCall {
  const cleaned = raw
    .trim()
    .replace(/^`{3}(?:json)?\s*/i, '')
    .replace(/\s*`{3}$/i, '')
    .trim()

  let decoded: unknown
  try {
    decoded = JSON.parse(cleaned)
  } catch {
    // A few models emit single-quoted or otherwise almost-JSON tool envelopes.
    // Only recover explicit, read-only requests from that format; never recover
    // file writes or command execution from malformed JSON.
    const actionMatch = cleaned.match(
      /(?:["']?(?:action|tool|name)["']?)\s*[:=]\s*["']([a-zA-Z][a-zA-Z _-]*)["']/i
    )
    if (!actionMatch) {
      throw new Error('Tool payload is not valid JSON and has no explicit action.')
    }

    const action = normalizeToolAction(actionMatch[1])
    const readOnlyAliases: Record<string, string> = {
      'list-files': 'list-files',
      'list-file': 'list-files',
      'list-directory': 'list-files',
      'list-dir': 'list-files',
      'read-file': 'read-file',
      'get-file': 'read-file',
    }
    const safeAction = readOnlyAliases[action]
    if (!safeAction) {
      throw new Error('Malformed payload recovery is restricted to read-only tools.')
    }

    let path: string | undefined
    const pathMatch = cleaned.match(
      /(?:["']?path["']?)\s*[:=]\s*("(?:\\\\.|[^"\\\\])*"|'[^'\\\\]*')/i
    )
    if (pathMatch) {
      const encodedPath = pathMatch[1]
      path = encodedPath.startsWith('"')
        ? String(JSON.parse(encodedPath))
        : encodedPath.slice(1, -1)
    }
    return { action: safeAction, ...(path !== undefined ? { path } : {}) }
  }

  // Some model adapters wrap the JSON payload as a JSON-encoded string.
  if (typeof decoded === 'string') {
    decoded = JSON.parse(decoded)
  }
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new Error('Tool payload must be a JSON object.')
  }

  const parsed = decoded as Record<string, unknown>
  let functionValue = parsed.function
  if (typeof functionValue === 'string') {
    functionValue = { name: functionValue }
  }
  const functionObject =
    functionValue && typeof functionValue === 'object' && !Array.isArray(functionValue)
      ? (functionValue as Record<string, unknown>)
      : {}
  let argumentValue = parsed.arguments ?? parsed.input ?? functionObject.arguments
  if (typeof argumentValue === 'string') {
    try {
      argumentValue = JSON.parse(argumentValue)
    } catch {
      // Arguments strings may be present in common function-call envelopes.
      // Invalid argument JSON is not safe to interpret for write/execute tools.
      argumentValue = undefined
    }
  }
  const argumentObject =
    argumentValue && typeof argumentValue === 'object' && !Array.isArray(argumentValue)
      ? (argumentValue as Record<string, unknown>)
      : {}

  const rawAction =
    parsed.action ??
    parsed.tool ??
    parsed.name ??
    functionObject.name ??
    argumentObject.action ??
    argumentObject.tool ??
    argumentObject.name
  const action = normalizeToolAction(rawAction)
  if (!action) {
    throw new Error('Tool payload does not contain an explicit action.')
  }

  return {
    action,
    ...(typeof (parsed.path ?? argumentObject.path) === 'string'
      ? { path: String(parsed.path ?? argumentObject.path) }
      : {}),
    ...(typeof (parsed.content ?? argumentObject.content) === 'string'
      ? { content: String(parsed.content ?? argumentObject.content) }
      : {}),
    ...(() => {
      const rawWindow = parsed.window ?? argumentObject.window
      // Models often send window handles as JSON numbers even though the schema says string.
      if (typeof rawWindow === 'string') return { window: rawWindow }
      if (typeof rawWindow === 'number' && Number.isSafeInteger(rawWindow)) return { window: String(rawWindow) }
      return {}
    })(),
    ...(typeof (parsed.text ?? argumentObject.text) === 'string' ? { text: String(parsed.text ?? argumentObject.text) } : {}),
    ...(Array.isArray(parsed.keys ?? argumentObject.keys) ? { keys: (parsed.keys ?? argumentObject.keys) as string[] } : {}),
    ...(() => {
      const rawTarget = parsed.target ?? argumentObject.target
      return rawTarget && typeof rawTarget === 'object' && !Array.isArray(rawTarget)
        ? { target: rawTarget as Record<string, unknown> }
        : {}
    })(),
    ...(() => {
      // Scroll arguments. Models may send the amount as a number or a numeric string.
      const rawAmount = parsed.amount ?? argumentObject.amount
      const amount = typeof rawAmount === 'string' && /^\d+$/.test(rawAmount.trim()) ? Number(rawAmount) : rawAmount
      return typeof amount === 'number' && Number.isSafeInteger(amount) ? { amount } : {}
    })(),
    ...(typeof (parsed.direction ?? argumentObject.direction) === 'string'
      ? { direction: String(parsed.direction ?? argumentObject.direction) }
      : {}),
    ...(typeof (parsed.skill ?? argumentObject.skill) === 'string' ? { skill: String(parsed.skill ?? argumentObject.skill) } : {}),
    ...(typeof (parsed.create ?? argumentObject.create) === 'boolean'
      ? { create: Boolean(parsed.create ?? argumentObject.create) }
      : {}),
    ...((parsed.runtime ?? argumentObject.runtime) === 'docker' ||
    (parsed.runtime ?? argumentObject.runtime) === 'native'
      ? { runtime: (parsed.runtime ?? argumentObject.runtime) as 'docker' | 'native' }
      : {}),
  }
}
