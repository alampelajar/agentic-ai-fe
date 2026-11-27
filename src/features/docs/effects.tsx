import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  ArrowUpDown,
  Copy,
  Feather,
  Hash,
  Hourglass,
  Images,
  Layers,
  MailOpen,
  MessageCircle,
  MousePointer2,
  RotateCcw,
  Repeat,
  Sparkles,
  TextCursorInput,
  Type,
  Flower2,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// The effects a website made by the builder can have. Each one is a finished
// piece in the site template (`web/src/kit/` in the backend), so asking for it in
// the change box gives a website that really moves this way. The names under
// "Also called" are the words people find on the internet, so a person who saw an
// effect somewhere can find it here. The words live under `docs.effects`.

type EffectKey =
  | 'marquee'
  | 'reveal'
  | 'stagger'
  | 'countUp'
  | 'rotatingWords'
  | 'parallax'
  | 'lift'
  | 'float'
  | 'countdown'
  | 'typewriter'
  | 'slideshow'
  | 'whatsapp'
  | 'confetti'
  | 'cover'

const EFFECTS: { id: EffectKey; icon: LucideIcon; replay?: boolean }[] = [
  { id: 'marquee', icon: TextCursorInput },
  { id: 'reveal', icon: Sparkles, replay: true },
  { id: 'stagger', icon: Layers, replay: true },
  { id: 'countUp', icon: Hash, replay: true },
  { id: 'rotatingWords', icon: Repeat },
  { id: 'typewriter', icon: Type, replay: true },
  { id: 'parallax', icon: ArrowUpDown },
  { id: 'slideshow', icon: Images },
  { id: 'lift', icon: MousePointer2 },
  { id: 'whatsapp', icon: MessageCircle, replay: true },
  { id: 'float', icon: Feather },
  { id: 'countdown', icon: Hourglass },
  { id: 'cover', icon: MailOpen, replay: true },
  { id: 'confetti', icon: Flower2, replay: true },
]

/** True when the device, or Settings > Display, asks for less movement. */
function lessMotion(): boolean {
  if (typeof window === 'undefined') return false
  return (
    document.documentElement.classList.contains('reduce-motion') ||
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  )
}

export function EffectsPage() {
  const { t } = useTranslation()
  return (
    <article className='space-y-6'>
      <header className='space-y-2 rounded-xl border bg-card p-4 sm:p-6'>
        <h2 className='text-2xl font-semibold tracking-tight'>
          {t('docs.effects.title')}
        </h2>
        <p className='text-sm text-muted-foreground'>
          {t('docs.effects.intro')}
        </p>
        <p className='text-xs text-muted-foreground'>
          {t('docs.effects.howToUse')}
        </p>
      </header>

      <ul className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {EFFECTS.map((effect) => (
          <li key={effect.id} className='min-w-0'>
            <EffectCard {...effect} />
          </li>
        ))}
      </ul>

      <p className='text-xs text-muted-foreground'>
        {t('docs.effects.calmNote')}
      </p>
    </article>
  )
}

function EffectCard({
  id: effect,
  icon: Icon,
  replay,
}: {
  id: EffectKey
  icon: LucideIcon
  replay?: boolean
}) {
  const { t } = useTranslation()
  const [round, setRound] = useState(0)
  const base = `docs.effects.items.${effect}`
  const names = t(`${base}.aka`, { returnObjects: true }) as string[]
  const example = t(`${base}.example`)
  const titleId = `effect-${effect}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(example)
      toast.success(t('docs.effects.copied'))
    } catch {
      toast.error(t('docs.effects.copyFailed'))
    }
  }

  return (
    <section
      aria-labelledby={titleId}
      className='flex h-full min-w-0 flex-col gap-4 rounded-xl border bg-card p-4'
    >
      <div className='space-y-1'>
        <h3
          id={titleId}
          className='flex items-center gap-2 text-base font-semibold'
        >
          <Icon className='size-4 text-muted-foreground' />
          {t(`${base}.name`)}
        </h3>
        <p className='text-sm text-muted-foreground'>{t(`${base}.what`)}</p>
      </div>

      <div className='space-y-2'>
        <div className='relative overflow-hidden rounded-lg border bg-muted/40'>
          <Demo key={round} effect={effect} />
        </div>
        {replay ? (
          <div className='flex justify-end'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setRound((value) => value + 1)}
            >
              <RotateCcw className='size-4' />
              {t('docs.effects.replay')}
            </Button>
          </div>
        ) : null}
      </div>

      <div className='space-y-1'>
        <p className='text-xs text-muted-foreground'>
          {t('docs.effects.alsoCalled')}
        </p>
        <div className='flex flex-wrap gap-1'>
          {names.map((name) => (
            <Badge key={name} variant='secondary' className='font-normal'>
              {name}
            </Badge>
          ))}
        </div>
      </div>

      <p className='text-sm'>
        <span className='font-medium'>{t('docs.effects.goodFor')}</span>{' '}
        {t(`${base}.goodFor`)}
      </p>

      <div className='mt-auto space-y-2 rounded-lg bg-muted p-3'>
        <p className='text-xs text-muted-foreground'>
          {t('docs.effects.askLike')}
        </p>
        <p className='text-sm'>“{example}”</p>
        <Button type='button' variant='outline' size='sm' onClick={copy}>
          <Copy className='size-4' />
          {t('docs.effects.copy')}
        </Button>
      </div>
    </section>
  )
}

function Demo({ effect }: { effect: EffectKey }) {
  const Piece = DEMOS[effect]
  return <Piece />
}

function Stage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      aria-hidden='true'
      className={cn('flex h-36 items-center justify-center p-4', className)}
    >
      {children}
    </div>
  )
}

function useDemoWords(key: string): string[] {
  const { t } = useTranslation()
  return t(`docs.effects.demo.${key}`, { returnObjects: true }) as string[]
}

function MarqueeDemo() {
  const words = useDemoWords('marquee')
  const row = (copy: boolean) =>
    words.map((word) => (
      <li
        key={`${copy ? 'b' : 'a'}-${word}`}
        className='flex shrink-0 items-center gap-6'
      >
        <span className='text-lg font-semibold'>{word}</span>
        <span className='text-primary'>•</span>
      </li>
    ))
  return (
    <Stage className='justify-start overflow-hidden px-0'>
      <ul className='fx-marquee flex w-max gap-6'>
        {row(false)}
        {row(true)}
      </ul>
    </Stage>
  )
}

function RevealDemo() {
  const { t } = useTranslation()
  return (
    <Stage>
      <div className='fx-reveal space-y-2 rounded-lg border bg-background p-4 text-center'>
        <p className='text-base font-semibold'>
          {t('docs.effects.demo.revealTitle')}
        </p>
        <p className='text-xs text-muted-foreground'>
          {t('docs.effects.demo.revealText')}
        </p>
      </div>
    </Stage>
  )
}

function StaggerDemo() {
  const words = useDemoWords('stagger')
  return (
    <Stage>
      <ul className='grid w-full grid-cols-3 gap-2'>
        {words.map((word, index) => (
          <li
            key={word}
            className='fx-reveal rounded-md border bg-background p-3 text-center text-sm font-medium'
            style={{ animationDelay: `${index * 180}ms` }}
          >
            {word}
          </li>
        ))}
      </ul>
    </Stage>
  )
}

function CountUpDemo() {
  const { t } = useTranslation()
  const target = 250
  const [value, setValue] = useState(() => (lessMotion() ? target : 0))
  useEffect(() => {
    if (lessMotion()) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 1400)
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <Stage className='flex-col gap-1'>
      <span className='text-4xl font-semibold text-primary tabular-nums'>
        {value}+
      </span>
      <span className='text-xs text-muted-foreground'>
        {t('docs.effects.demo.countUpLabel')}
      </span>
    </Stage>
  )
}

function RotatingWordsDemo() {
  const { t } = useTranslation()
  const words = useDemoWords('rotatingWords')
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (lessMotion() || words.length < 2) return
    const timer = setInterval(
      () => setIndex((value) => (value + 1) % words.length),
      1800
    )
    return () => clearInterval(timer)
  }, [words.length])
  return (
    <Stage>
      <p className='text-center text-lg font-semibold'>
        {t('docs.effects.demo.rotatingLead')}{' '}
        <span key={index} className='fx-word inline-block text-primary'>
          {words[index % words.length]}
        </span>
      </p>
    </Stage>
  )
}

function ParallaxDemo() {
  const { t } = useTranslation()
  const box = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  return (
    <div
      ref={box}
      tabIndex={0}
      aria-label={t('docs.effects.demo.parallaxLabel')}
      onScroll={() => {
        if (!lessMotion()) setOffset((box.current?.scrollTop ?? 0) * 0.5)
      }}
      className='relative h-36 overflow-y-auto focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
    >
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-x-0 top-0 flex h-36 items-center justify-center gap-6'
        style={{ transform: `translateY(${offset}px)` }}
      >
        <span className='size-16 rounded-full bg-primary/20' />
        <span className='size-10 rounded-full bg-chart-2/30' />
        <span className='size-20 rounded-full bg-chart-4/25' />
      </div>
      <div className='relative space-y-16 px-4 pt-24 pb-24'>
        <p className='w-fit rounded-md border bg-background px-3 py-2 text-sm font-medium'>
          {t('docs.effects.demo.parallaxText')}
        </p>
        <p className='w-fit rounded-md border bg-background px-3 py-2 text-sm font-medium'>
          {t('docs.effects.demo.parallaxText2')}
        </p>
      </div>
    </div>
  )
}

function LiftDemo() {
  const words = useDemoWords('lift')
  return (
    <Stage>
      <div className='grid w-full grid-cols-3 gap-2'>
        {words.map((word) => (
          <div
            key={word}
            className='fx-lift rounded-md border bg-background p-3 text-center text-sm font-medium'
          >
            {word}
          </div>
        ))}
      </div>
    </Stage>
  )
}

function FloatDemo() {
  const { t } = useTranslation()
  return (
    <Stage className='gap-4'>
      <Feather className='fx-float size-8 text-primary' />
      <span className='text-lg font-semibold'>
        {t('docs.effects.demo.floatText')}
      </span>
      <Sparkles className='fx-float fx-float-late size-6 text-chart-4' />
    </Stage>
  )
}

function CountdownDemo() {
  const { t } = useTranslation()
  const [target] = useState(
    () => Date.now() + 12 * 24 * 3600 * 1000 + 5 * 3600 * 1000
  )
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const left = Math.max(0, Math.floor((target - now) / 1000))
  const parts = [
    { value: Math.floor(left / 86400), label: t('docs.effects.demo.days') },
    {
      value: Math.floor((left % 86400) / 3600),
      label: t('docs.effects.demo.hours'),
    },
    {
      value: Math.floor((left % 3600) / 60),
      label: t('docs.effects.demo.minutes'),
    },
    { value: left % 60, label: t('docs.effects.demo.seconds') },
  ]
  return (
    <Stage className='gap-2'>
      {parts.map((part) => (
        <div
          key={part.label}
          className='flex w-16 flex-col items-center rounded-md border bg-background py-2'
        >
          <span className='text-2xl font-semibold tabular-nums'>
            {String(part.value).padStart(2, '0')}
          </span>
          <span className='text-xs text-muted-foreground'>{part.label}</span>
        </div>
      ))}
    </Stage>
  )
}

function TypewriterDemo() {
  const { t } = useTranslation()
  const text = t('docs.effects.demo.typewriter')
  const [shown, setShown] = useState(() => (lessMotion() ? text.length : 0))
  useEffect(() => {
    if (lessMotion()) return
    const timer = setInterval(() => {
      setShown((value) => Math.min(text.length, value + 1))
    }, 60)
    return () => clearInterval(timer)
  }, [text])
  return (
    <Stage>
      <p className='relative text-center text-lg font-semibold'>
        <span className='invisible'>{text}</span>
        <span className='absolute inset-0'>
          {text.slice(0, shown)}
          {shown < text.length ? <span className='fx-caret'>|</span> : null}
        </span>
      </p>
    </Stage>
  )
}

const SLIDE_TONES = ['bg-primary/15', 'bg-chart-2/25', 'bg-chart-4/25']

function SlideshowDemo() {
  const words = useDemoWords('slideshow')
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    if (lessMotion()) return
    const timer = setInterval(
      () => setCurrent((value) => (value + 1) % words.length),
      2200
    )
    return () => clearInterval(timer)
  }, [words.length])
  return (
    <Stage className='flex-col gap-3 px-0'>
      <div className='w-full overflow-hidden'>
        <div
          className='flex transition-transform duration-500 ease-out motion-reduce:transition-none'
          style={{ transform: 'translateX(-' + current * 100 + '%)' }}
        >
          {words.map((word, index) => (
            <div key={word} className='w-full shrink-0 px-6'>
              <div
                className={cn(
                  'flex h-20 items-center justify-center rounded-md text-sm font-semibold',
                  SLIDE_TONES[index % SLIDE_TONES.length]
                )}
              >
                {word}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className='flex gap-1'>
        {words.map((word, index) => (
          <span
            key={word}
            className={cn(
              'h-1.5 rounded-full transition-all',
              index === current ? 'w-5 bg-primary' : 'w-1.5 bg-border'
            )}
          />
        ))}
      </div>
    </Stage>
  )
}

function WhatsAppDemo() {
  const { t } = useTranslation()
  return (
    <Stage className='items-stretch'>
      <div className='relative w-full space-y-2 rounded-md border bg-background p-3'>
        <div className='h-2 w-1/2 rounded-full bg-muted' />
        <div className='h-2 w-3/4 rounded-full bg-muted' />
        <div className='h-2 w-2/3 rounded-full bg-muted' />
        <span className='fx-pop absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground'>
          <MessageCircle className='size-4' />
          {t('docs.effects.demo.whatsapp')}
        </span>
      </div>
    </Stage>
  )
}

type Petal = { left: number; delay: number; drift: number; size: number }

function ConfettiDemo() {
  const { t } = useTranslation()
  const [petals] = useState<Petal[]>(() =>
    lessMotion()
      ? []
      : Array.from({ length: 16 }, () => ({
          left: Math.random() * 95,
          delay: Math.random() * 1.5,
          drift: (Math.random() - 0.5) * 60,
          size: 8 + Math.random() * 8,
        }))
  )
  return (
    <Stage className='relative overflow-hidden'>
      {petals.map((petal, index) => (
        <span
          key={index}
          className={cn(
            'fx-fall absolute -top-4',
            index % 2 ? 'text-chart-1' : 'text-chart-5'
          )}
          style={
            {
              left: petal.left + '%',
              width: petal.size,
              height: petal.size,
              animationDelay: petal.delay + 's',
              '--fall-drift': petal.drift + 'px',
            } as CSSProperties
          }
        >
          <svg viewBox='0 0 24 24' className='size-full fill-current'>
            <path d='M12 2c4 3.5 6 7 6 10.5S15.3 22 12 22s-6-6-6-9.5S8 5.5 12 2z' />
          </svg>
        </span>
      ))}
      <span className='text-lg font-semibold'>
        {t('docs.effects.demo.confetti')}
      </span>
    </Stage>
  )
}

function CoverDemo() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <div className='relative h-36 overflow-hidden'>
      <div className='flex h-full flex-col items-center justify-center gap-1 p-4 text-center'>
        <p className='text-base font-semibold'>
          {t('docs.effects.demo.coverInside')}
        </p>
        <p className='text-xs text-muted-foreground'>
          {t('docs.effects.demo.coverInsideText')}
        </p>
      </div>
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center gap-2 border-b bg-card p-4 text-center transition-transform duration-700 ease-in-out motion-reduce:transition-none',
          open && '-translate-y-full'
        )}
      >
        <p className='text-xs text-muted-foreground'>
          {t('docs.effects.demo.coverLabel')}
        </p>
        <p className='text-lg font-semibold'>
          {t('docs.effects.demo.coverNames')}
        </p>
        <Button
          type='button'
          size='sm'
          onClick={() => setOpen(true)}
          tabIndex={open ? -1 : 0}
        >
          <MailOpen className='size-4' />
          {t('docs.effects.demo.coverButton')}
        </Button>
      </div>
    </div>
  )
}

const DEMOS: Record<EffectKey, () => ReactNode> = {
  marquee: MarqueeDemo,
  reveal: RevealDemo,
  stagger: StaggerDemo,
  countUp: CountUpDemo,
  rotatingWords: RotatingWordsDemo,
  parallax: ParallaxDemo,
  lift: LiftDemo,
  float: FloatDemo,
  countdown: CountdownDemo,
  typewriter: TypewriterDemo,
  slideshow: SlideshowDemo,
  whatsapp: WhatsAppDemo,
  confetti: ConfettiDemo,
  cover: CoverDemo,
}
