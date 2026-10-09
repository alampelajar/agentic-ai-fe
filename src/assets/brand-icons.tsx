import type { ReactNode } from 'react'

type BrandIconProps = {
  label: string
  color: string
}

function BrandIcon({ label, color }: BrandIconProps) {
  return (
    <span
      aria-hidden='true'
      className='inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold'
      style={{ backgroundColor: color, color: '#ffffff' }}
    >
      {label}
    </span>
  )
}

function makeBrandIcon(label: string, color: string) {
  return function BrandIconGlyph(): ReactNode {
    return <BrandIcon label={label} color={color} />
  }
}

// Lightweight local glyphs used by the legacy integrations list.
export const IconTelegram = makeBrandIcon('TG', '#229ED9')
export const IconNotion = makeBrandIcon('N', '#222222')
export const IconFigma = makeBrandIcon('F', '#A259FF')
export const IconTrello = makeBrandIcon('T', '#0C66E4')
export const IconSlack = makeBrandIcon('#', '#611F69')
export const IconZoom = makeBrandIcon('Z', '#2D8CFF')
export const IconStripe = makeBrandIcon('S', '#635BFF')
export const IconGmail = makeBrandIcon('M', '#EA4335')
export const IconMedium = makeBrandIcon('M', '#111111')
export const IconSkype = makeBrandIcon('S', '#00AFF0')
export const IconDocker = makeBrandIcon('D', '#2496ED')
export const IconGithub = makeBrandIcon('GH', '#24292F')
export const IconGitlab = makeBrandIcon('GL', '#FC6D26')
export const IconDiscord = makeBrandIcon('DS', '#5865F2')
export const IconWhatsapp = makeBrandIcon('WA', '#25D366')
