import { describe, expect, it } from 'vitest'
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES, checkAttachment, isImageAttachment } from './attachments'

const file = (name: string, type = '', size = 10) => new File([new Uint8Array(size)], name, { type })

describe('chat attachments', () => {
  it('accepts images, PDF, Word, ZIP and text or code files', () => {
    for (const accepted of [file('foto.png', 'image/png'), file('laporan.pdf', 'application/pdf'), file('surat.docx'), file('proyek.ZIP', 'application/zip'), file('catatan.MD'), file('main.go'), file('data.csv', 'text/csv')]) {
      expect(checkAttachment(accepted), accepted.name).toBe('ok')
    }
  })

  it('refuses files the backend cannot read, and files over 10 MB', () => {
    expect(checkAttachment(file('tabel.xlsx'))).toBe('unsupported')
    expect(checkAttachment(file('video.mp4', 'video/mp4'))).toBe('unsupported')
    expect(checkAttachment(file('tanpa-ekstensi'))).toBe('unsupported')
    expect(checkAttachment(file('besar.pdf', 'application/pdf', MAX_ATTACHMENT_BYTES + 1))).toBe('tooLarge')
  })

  it('tells images from documents, and offers both in the picker', () => {
    expect(isImageAttachment(file('foto.webp', 'image/webp'))).toBe(true)
    expect(isImageAttachment(file('laporan.pdf', 'application/pdf'))).toBe(false)
    expect(ATTACHMENT_ACCEPT).toContain('image/png')
    expect(ATTACHMENT_ACCEPT).toContain('.pdf')
    expect(ATTACHMENT_ACCEPT).toContain('.docx')
    expect(ATTACHMENT_ACCEPT).toContain('.zip')
  })
})
