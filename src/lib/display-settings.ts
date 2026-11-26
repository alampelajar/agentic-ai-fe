import { getCookie, setCookie } from '@/lib/cookies'

/**
 * How the app is shown on this device: the size of the text, whether the side menu
 * starts open, and whether things move. Kept in this browser (a phone and a computer
 * may want different settings) and applied to the whole page at once.
 */
export type DisplaySettings = {
  textSize: 'normal' | 'large'
  sidebar: 'open' | 'closed'
  reduceMotion: boolean
}

const STORAGE_KEY = 'display-settings'
// The side menu reads this cookie when the app opens (components/ui/sidebar.tsx).
const SIDEBAR_COOKIE = 'sidebar_state'
const LARGE_TEXT = '112.5%'

export function readDisplaySettings(): DisplaySettings {
  let saved: Partial<DisplaySettings>
  try {
    saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    saved = {}
  }
  return {
    textSize: saved.textSize === 'large' ? 'large' : 'normal',
    sidebar: getCookie(SIDEBAR_COOKIE) === 'false' ? 'closed' : 'open',
    reduceMotion: saved.reduceMotion === true,
  }
}

/** Shows the text size and the movement setting on the page. */
export function applyDisplaySettings(settings: DisplaySettings) {
  const root = document.documentElement
  root.style.fontSize = settings.textSize === 'large' ? LARGE_TEXT : ''
  root.classList.toggle('reduce-motion', settings.reduceMotion)
}

export function saveDisplaySettings(settings: DisplaySettings) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        textSize: settings.textSize,
        reduceMotion: settings.reduceMotion,
      })
    )
  } catch {
    // Without storage the settings still apply until the page is closed.
  }
  setCookie(SIDEBAR_COOKIE, settings.sidebar === 'open' ? 'true' : 'false')
  applyDisplaySettings(settings)
}
