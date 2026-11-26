import { clearCookies } from '@/test-utils/cookies'
import { afterEach, describe, expect, it } from 'vitest'
import { getCookie } from './cookies'
import {
  applyDisplaySettings,
  readDisplaySettings,
  saveDisplaySettings,
} from './display-settings'

describe('display settings', () => {
  afterEach(() => {
    window.localStorage.removeItem('display-settings')
    clearCookies()
    applyDisplaySettings({
      textSize: 'normal',
      sidebar: 'open',
      reduceMotion: false,
    })
  })

  it('starts with normal text, an open menu and movement on', () => {
    expect(readDisplaySettings()).toEqual({
      textSize: 'normal',
      sidebar: 'open',
      reduceMotion: false,
    })
  })

  it('saves the choices, applies them at once and reads them back', () => {
    saveDisplaySettings({
      textSize: 'large',
      sidebar: 'closed',
      reduceMotion: true,
    })
    const root = document.documentElement
    expect(root.style.fontSize).toBe('112.5%')
    expect(root.classList.contains('reduce-motion')).toBe(true)
    expect(getCookie('sidebar_state')).toBe('false')
    expect(readDisplaySettings()).toEqual({
      textSize: 'large',
      sidebar: 'closed',
      reduceMotion: true,
    })
  })

  it('ignores a damaged saved value', () => {
    window.localStorage.setItem('display-settings', '{not json')
    expect(readDisplaySettings().textSize).toBe('normal')
  })
})
