import { describe, expect, it } from 'vitest'
import { describeComboAnswer } from './combo-answer'

const t = (key: string, options?: Record<string, unknown>) => `${key}:${String(options?.names ?? '')}`

describe('describeComboAnswer', () => {
  it('says nothing for a plain model', () => {
    expect(describeComboAnswer({ model: 'gpt' }, t)).toBeNull()
  })

  it('names the combo and the model that answered', () => {
    expect(describeComboAnswer({ combo: 'Coding', model: 'raw-id', combo_trace: [{ model_id: 2, name: 'Model B', status: 'ok' }] }, t)).toBe('Coding → Model B')
  })

  it('lists the models that failed first', () => {
    const text = describeComboAnswer(
      {
        combo: 'Coding',
        combo_trace: [
          { model_id: 1, name: 'Model A', status: 'failed' },
          { model_id: 2, name: 'Model B', status: 'failed' },
          { model_id: 3, name: 'Model C', status: 'ok' },
        ],
      },
      t
    )
    expect(text).toBe('Coding → Model C (comboPage.answer.failedFirst:Model A, Model B)')
  })

  it('names the last model of a pipeline and the models that wrote drafts', () => {
    const text = describeComboAnswer(
      {
        combo: 'Berantai',
        combo_trace: [
          { model_id: 1, name: 'Model A', status: 'ok', stage: 'draft' },
          { model_id: 2, name: 'Model B', status: 'failed', stage: 'draft' },
          { model_id: 3, name: 'Model C', status: 'ok', stage: 'final' },
        ],
      },
      t
    )
    expect(text).toBe('Berantai → Model C (comboPage.answer.draftsBy:Model A; comboPage.answer.draftsMissed:Model B)')
  })

  it('does not call a pipeline draft the answer', () => {
    const text = describeComboAnswer(
      { combo: 'Berantai', model: 'raw-id', combo_trace: [{ model_id: 1, name: 'Model A', status: 'ok', stage: 'draft' }, { model_id: 2, name: 'Model B', status: 'ok', stage: 'final' }] },
      t
    )
    expect(text).toBe('Berantai → Model B (comboPage.answer.draftsBy:Model A)')
  })

  it('falls back to the raw model id when there is no trace', () => {
    expect(describeComboAnswer({ combo: 'Coding', model: 'raw-id' }, t)).toBe('Coding → raw-id')
  })
})
