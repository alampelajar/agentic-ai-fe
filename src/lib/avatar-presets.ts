export const AVATAR_PRESETS = [
  { id: 'adventurer', label: 'Adventurer' },
  { id: 'adventurer-neutral', label: 'Adventurer Neutral' },
  { id: 'avataaars', label: 'Avataaars' },
  { id: 'avataaars-neutral', label: 'Avataaars Neutral' },
  { id: 'big-ears', label: 'Big Ears' },
  { id: 'big-ears-neutral', label: 'Big Ears Neutral' },
  { id: 'big-smile', label: 'Big Smile' },
  { id: 'bottts', label: 'Bottts' },
  { id: 'bottts-neutral', label: 'Bottts Neutral' },
  { id: 'croodles', label: 'Croodles' },
  { id: 'croodles-neutral', label: 'Croodles Neutral' },
  { id: 'fun-emoji', label: 'Fun Emoji' },
  { id: 'identicon', label: 'Identicon' },
  { id: 'initials', label: 'Initials' },
  { id: 'lorelei', label: 'Lorelei' },
  { id: 'lorelei-neutral', label: 'Lorelei Neutral' },
  { id: 'micah', label: 'Micah' },
  { id: 'miniavs', label: 'Miniavs' },
  { id: 'personas', label: 'Personas' },
  { id: 'pixel-art', label: 'Pixel Art' },
  { id: 'pixel-art-neutral', label: 'Pixel Art Neutral' },
  { id: 'shapes', label: 'Shapes' },
  { id: 'thumbs', label: 'Thumbs' },
  { id: 'icons', label: 'Icons' },
] as const

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]['id']
const AVATAR_PREFIX = 'preset:'
const AVATAR_PRESET_IDS = new Set<string>(AVATAR_PRESETS.map((preset) => preset.id))
export const DEFAULT_AVATAR_PRESET: AvatarPresetId = 'lorelei'

export function getAvatarPresetId(avatar?: string | null): AvatarPresetId | null {
  if (!avatar?.startsWith(AVATAR_PREFIX)) return null
  const id = avatar.slice(AVATAR_PREFIX.length)
  return AVATAR_PRESET_IDS.has(id) ? (id as AvatarPresetId) : null
}

export function avatarPresetValue(id: AvatarPresetId) {
  return AVATAR_PREFIX + id
}

export function getAvatarSrc(avatar?: string | null, seed = 'agentic-ai-user') {
  if (!avatar) return ''
  const presetId = getAvatarPresetId(avatar)
  if (presetId) {
    return 'https://api.dicebear.com/10.x/' + presetId + '/svg?seed=' + encodeURIComponent(seed || 'agentic-ai-user')
  }
  if (avatar.startsWith(AVATAR_PREFIX)) return ''
  return avatar
}
