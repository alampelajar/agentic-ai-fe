import { beforeEach, describe, expect, it } from 'vitest'
import {
  readSuspended,
  rememberSuspension,
  takeSuspension,
} from './account-suspended'

describe('account suspended', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('reads only the suspended answer, with its reason', () => {
    expect(
      readSuspended(403, { code: 'account_suspended', reason: 'Judi' })
    ).toBe('Judi')
    expect(readSuspended(403, { code: 'account_suspended' })).toBe('')
    expect(readSuspended(403, { code: 'account_pending_deletion' })).toBeNull()
    expect(readSuspended(401, { code: 'account_suspended' })).toBeNull()
    expect(readSuspended(403, null)).toBeNull()
  })

  it('keeps the reason for the sign-in page once', () => {
    rememberSuspension('Mencoba membuat website judi')
    expect(takeSuspension()).toBe('Mencoba membuat website judi')
    expect(takeSuspension()).toBeNull()
  })
})
