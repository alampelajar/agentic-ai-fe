/**
 * Reads the chat reply. With ?stream=1 the backend answers as Server-Sent Events: "delta" pieces
 * while the model writes, then "done" with the same object a JSON reply carries, or "error".
 * Combos and tool calls still answer with plain JSON, so both are read here.
 */

export type ChatReply = { ok: boolean; status: number; data: Record<string, unknown> }

type StreamEvent = { event: string; data: Record<string, unknown> }

/** Splits a block of SSE text into events; `rest` is an unfinished event to keep for later. */
export function parseEvents(buffer: string): { events: StreamEvent[]; rest: string } {
  const blocks = buffer.replace(/\r\n/g, '\n').split('\n\n')
  const rest = blocks.pop() ?? ''
  const events: StreamEvent[] = []
  for (const block of blocks) {
    let event = 'message'
    const dataLines: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
    }
    if (dataLines.length === 0) continue
    try {
      events.push({ event, data: JSON.parse(dataLines.join('\n')) })
    } catch {
      // A piece that is not JSON carries nothing we use.
    }
  }
  return { events, rest }
}

/** The text a draft shows: never a tool marker, which only the tool loop reads. */
export function visibleDraft(text: string): string {
  const marker = text.search(/<(LOCAL_)?AGENT_TOOL>/)
  return (marker < 0 ? text : text.slice(0, marker)).trimEnd()
}

export async function readChatReply(response: Response, onDelta: (text: string) => void): Promise<ChatReply> {
  const type = response.headers.get('Content-Type') ?? ''
  if (!type.includes('text/event-stream') || !response.body) {
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
    return { ok: response.ok, status: response.status, data }
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (value) buffer += decoder.decode(value, { stream: true })
    if (done) buffer += decoder.decode() + '\n\n'
    const parsed = parseEvents(buffer)
    buffer = parsed.rest
    for (const { event, data } of parsed.events) {
      if (event === 'delta' && typeof data.text === 'string') onDelta(data.text)
      else if (event === 'done') return { ok: true, status: response.status, data }
      else if (event === 'error') return { ok: false, status: response.status, data }
    }
    if (done) break
  }
  // The caller words this in the person's language.
  return { ok: false, status: response.status, data: { code: 'stream_incomplete' } }
}
