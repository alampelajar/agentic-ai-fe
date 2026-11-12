/** One try of a combo, as the backend reports it in a chat answer. */
export type ComboTraceEntry = {
  model_id: number
  name: string
  status: 'ok' | 'failed' | 'skipped'
  /** Only in a pipeline: the models before the last one write drafts, the last one answers. */
  stage?: 'draft' | 'final'
}

export type ComboAnswerData = {
  combo?: string
  model?: string
  combo_trace?: ComboTraceEntry[]
}

type Translate = (key: string, options?: Record<string, unknown>) => string

/**
 * The line under a chat answer when a combo answered: the combo, the model that
 * really answered, and the models that failed first. Null for a plain model.
 */
export function describeComboAnswer(data: ComboAnswerData, t: Translate): string | null {
  if (!data.combo) return null
  const trace = data.combo_trace || []
  const pipeline = trace.some((entry) => entry.stage)
  // In a pipeline the first model that worked only wrote a draft; the answer is the final stage's.
  const answeredBy = (pipeline ? trace.find((entry) => entry.stage === 'final' && entry.status === 'ok') : trace.find((entry) => entry.status === 'ok'))?.name || data.model || ''
  const base = answeredBy ? `${data.combo} → ${answeredBy}` : data.combo
  if (pipeline) {
    const drafts = trace.filter((entry) => entry.stage === 'draft' && entry.status === 'ok').map((entry) => entry.name)
    const lost = trace.filter((entry) => entry.stage === 'draft' && entry.status !== 'ok').map((entry) => entry.name)
    const parts = []
    if (drafts.length > 0) parts.push(t('comboPage.answer.draftsBy', { names: drafts.join(', ') }))
    if (lost.length > 0) parts.push(t('comboPage.answer.draftsMissed', { names: lost.join(', ') }))
    return parts.length > 0 ? `${base} (${parts.join('; ')})` : base
  }
  const failed = trace.filter((entry) => entry.status === 'failed').map((entry) => entry.name)
  return failed.length > 0 ? `${base} (${t('comboPage.answer.failedFirst', { names: failed.join(', ') })})` : base
}
