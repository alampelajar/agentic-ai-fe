import { describe, expect, it } from 'vitest'

import {
  AVATAR_PRESETS,
  avatarPresetValue,
  getAvatarPresetId,
  getAvatarSrc,
} from './avatar-presets'

describe('avatar presets', () => {
  it('exposes unique preset IDs', () => {
    const ids = AVATAR_PRESETS.map((preset) => preset.id)
    expect(ids).toHaveLength(24)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('round-trips an allowed preset identifier', () => {
    const value = avatarPresetValue('lorelei')
    expect(value).toBe('preset:lorelei')
    expect(getAvatarPresetId(value)).toBe('lorelei')
  })

  it('returns a deterministic DiceBear URL for a preset', () => {
    expect(getAvatarSrc('preset:bottts', 'USER_12')).toBe(
      'https://api.dicebear.com/10.x/bottts/svg?seed=USER_12'
    )
  })

  it('preserves an existing external avatar URL', () => {
    expect(getAvatarSrc('https://example.com/avatar.png')).toBe(
      'https://example.com/avatar.png'
    )
  })

  it('rejects unknown preset IDs and does not render them as URLs', () => {
    expect(getAvatarPresetId('preset:unknown-avatar')).toBeNull()
    expect(getAvatarSrc('preset:unknown-avatar')).toBe('')
  })
})
