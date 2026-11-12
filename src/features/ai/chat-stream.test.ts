import { describe, expect, it } from 'vitest'
import { parseEvents, readChatReply, visibleDraft } from './chat-stream'

/** A streamed Response whose body arrives in the given pieces. */
function streamed(pieces: string[]) {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece))
      controller.close()
    },
  })
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
}

describe('chat stream', () => {
  it('passes each piece on as it comes, then returns the final reply', async () => {
    const pieces: string[] = []
    const reply = await readChatReply(
      streamed([
        'event: delta\ndata: {"text":"Ha',
        'lo"}\n\nevent: delta\ndata: {"text":", Rina"}\n\n',
        'event: done\ndata: {"ok":true,"message":"Halo, Rina","model":"m"}\n\n',
      ]),
      (text) => pieces.push(text)
    )
    expect(pieces).toEqual(['Halo', ', Rina'])
    expect(reply).toMatchObject({ ok: true, data: { message: 'Halo, Rina', model: 'm' } })
  })

  it('returns a streamed error as a failed reply', async () => {
    const reply = await readChatReply(streamed(['event: delta\ndata: {"text":"x"}\n\n', 'event: error\ndata: {"error":"Gagal","detail":"busy"}\n\n']), () => {})
    expect(reply).toMatchObject({ ok: false, data: { error: 'Gagal', detail: 'busy' } })
  })

  it('says so when the stream ends without a final reply', async () => {
    const reply = await readChatReply(streamed(['event: delta\ndata: {"text":"x"}\n\n']), () => {})
    expect(reply.ok).toBe(false)
    expect(reply.data.code).toBe('stream_incomplete')
  })

  it('still reads a plain JSON reply, as combos and tool calls send', async () => {
    const reply = await readChatReply(new Response(JSON.stringify({ ok: true, message: 'utuh' }), { headers: { 'Content-Type': 'application/json' } }), () => {
      throw new Error('no pieces for JSON')
    })
    expect(reply).toMatchObject({ ok: true, status: 200, data: { message: 'utuh' } })
  })

  it('keeps an unfinished event for the next read, and skips comments', () => {
    const { events, rest } = parseEvents(': keep-alive\n\nevent: delta\ndata: {"text":"a"}\n\nevent: delta\ndata: {"te')
    expect(events).toEqual([{ event: 'delta', data: { text: 'a' } }])
    expect(rest).toBe('event: delta\ndata: {"te')
  })

  it('never shows a tool marker in the draft', () => {
    expect(visibleDraft('Saya baca dulu.\n<AGENT_TOOL>{"action":"workspace.read_file"}')).toBe('Saya baca dulu.')
    expect(visibleDraft('<LOCAL_AGENT_TOOL>{}')).toBe('')
    expect(visibleDraft('Jawaban biasa')).toBe('Jawaban biasa')
  })
})
