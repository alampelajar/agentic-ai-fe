/** One try of a combo, as the backend reports it in a chat answer. */
export type ComboTraceEntry = {
  model_id: number
  name: string
  status: 'ok' | 'failed' | 'skipped'
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
  const answeredBy = (data.combo_trace || []).find((entry) => entry.status === 'ok')?.name || data.model || ''
  const failed = (data.combo_trace || []).filter((entry) => entry.status === 'failed').map((entry) => entry.name)
  const base = answeredBy ? `${data.combo} → ${answeredBy}` : data.combo
  return failed.length > 0 ? `${base} (${t('comboPage.answer.failedFirst', { names: failed.join(', ') })})` : base
}
