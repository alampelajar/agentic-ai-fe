import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { AUTO_MODEL_ID, autoModel, describeAutoAnswer, isAutoModel } from './auto-model'

describe('Auto model choice', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('id')
  })

  it('is a choice no real model can be mistaken for', () => {
    const auto = autoModel('Otomatis', 'Memilih model untuk tiap pesan')
    expect(auto.id).toBe(AUTO_MODEL_ID)
    expect(isAutoModel(auto)).toBe(true)
    expect(isAutoModel({ id: 25 })).toBe(false)
    expect(isAutoModel(null)).toBe(false)
  })

  it('says which model answered and why, in the person\'s language', () => {
    const t = i18n.t.bind(i18n)
    expect(describeAutoAnswer({ name: 'GPT-OSS-120b', need: 'fast' }, 'openai/gpt-oss-120b', t)).toBe('Otomatis → GPT-OSS-120b · jawaban cepat')
    expect(describeAutoAnswer({ need: 'vision', fallback: true }, 'nvidia/nemotron-3.5-super-vl:free', t)).toBe('Otomatis → nvidia/nemotron-3.5-super-vl:free · membaca gambar · cadangan karena pilihan pertama gagal')
    expect(describeAutoAnswer({ name: 'X', need: 'unknown-need' }, 'x', t)).toBe('Otomatis → X')
    expect(describeAutoAnswer(undefined, 'x', t)).toBeNull()
  })
})
