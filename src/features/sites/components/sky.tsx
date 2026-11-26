import type { CSSProperties } from 'react'

// The sky behind the start screen: clouds on a clear day in light mode, clouds and
// stars at night in dark mode. Colours come from the `--sky-*` tokens in theme.css,
// the drawing and the motion from `.sky*` in index.css. Decoration only.

// Each cloud floats in its own lane across the whole sky and back in from the left.
// Bigger clouds are nearer, so they move faster. The phase spreads them out.
type Cloud = {
  top: string
  width: string
  travel: number
  phase: number
  bob: string
  opacity: number
}

const CLOUDS: Cloud[] = [
  { top: '6%', width: '18rem', travel: 95, phase: 0.92, bob: '7s', opacity: 1 },
  {
    top: '14%',
    width: '22rem',
    travel: 80,
    phase: 0.35,
    bob: '9s',
    opacity: 0.9,
  },
  {
    top: '36%',
    width: '12rem',
    travel: 130,
    phase: 0.18,
    bob: '6s',
    opacity: 0.7,
  },
  {
    top: '44%',
    width: '14rem',
    travel: 115,
    phase: 0.7,
    bob: '8s',
    opacity: 0.75,
  },
  {
    top: '2%',
    width: '10rem',
    travel: 150,
    phase: 0.5,
    bob: '10s',
    opacity: 0.6,
  },
  {
    top: '60%',
    width: '20rem',
    travel: 90,
    phase: 0.05,
    bob: '11s',
    opacity: 0.5,
  },
  {
    top: '26%',
    width: '9rem',
    travel: 160,
    phase: 0.82,
    bob: '7s',
    opacity: 0.55,
  },
]

// A star falls now and then, at night only.
const SHOOTING_STARS = [
  { top: '8%', left: '70%', every: '9s', delay: '1s' },
  { top: '4%', left: '40%', every: '13s', delay: '6s' },
  { top: '18%', left: '95%', every: '17s', delay: '11s' },
]

// The same stars on every visit: a small fixed random sequence.
function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

const STARS = (() => {
  const random = seeded(7)
  return Array.from({ length: 60 }, () => ({
    top: `${(random() * 70).toFixed(1)}%`,
    left: `${(random() * 100).toFixed(1)}%`,
    size: `${(1 + random() * 2).toFixed(1)}px`,
    twinkle: `${(2.5 + random() * 4).toFixed(1)}s`,
    delay: `${(-random() * 6).toFixed(1)}s`,
  }))
})()

// Puffs of a cumulus cloud: a flat, wide base and round tops of different sizes.
// [cx, cy, rx, ry] in a 300 x 150 box.
const SHAPES: [number, number, number, number][][] = [
  [
    [150, 105, 120, 26],
    [95, 85, 45, 36],
    [150, 68, 55, 50],
    [205, 82, 48, 38],
    [245, 98, 32, 22],
    [60, 100, 34, 22],
  ],
  [
    [150, 108, 125, 22],
    [80, 92, 40, 28],
    [125, 74, 46, 42],
    [180, 62, 50, 48],
    [228, 86, 42, 32],
  ],
  [
    [150, 110, 110, 20],
    [110, 90, 50, 32],
    [170, 80, 56, 40],
    [220, 98, 38, 22],
  ],
]

// Soft, uneven edges: noise pushes the outline about, then a blur softens it.
// Three seeds, so no two neighbouring clouds have the same edge.
const SEEDS = [3, 11, 27]

function CloudFilters() {
  return (
    <svg width='0' height='0' className='absolute'>
      <defs>
        {SEEDS.map((seed) => (
          <filter
            key={seed}
            id={`sky-cloud-${seed}`}
            x='-25%'
            y='-40%'
            width='150%'
            height='180%'
          >
            <feTurbulence
              type='fractalNoise'
              baseFrequency='0.018'
              numOctaves='4'
              seed={seed}
              result='noise'
            />
            <feDisplacementMap
              in='SourceGraphic'
              in2='noise'
              scale='38'
              xChannelSelector='R'
              yChannelSelector='G'
              result='edge'
            />
            <feGaussianBlur in='edge' stdDeviation='5' />
          </filter>
        ))}
      </defs>
    </svg>
  )
}

function CloudShape({ cloud, index }: { cloud: Cloud; index: number }) {
  const lane = {
    top: cloud.top,
    animationDuration: `${cloud.travel}s`,
    animationDelay: `${-cloud.travel * cloud.phase}s`,
  } as CSSProperties
  const style = {
    width: cloud.width,
    opacity: cloud.opacity,
    animationDuration: cloud.bob,
  } as CSSProperties
  const puffs = SHAPES[index % SHAPES.length]
  const filter = `url(#sky-cloud-${SEEDS[index % SEEDS.length]})`
  return (
    <div className='sky-lane' style={lane}>
      <svg viewBox='0 0 300 150' className='sky-cloud' style={style}>
        {/* The underside in shade, the top lit by the sun or the moon. */}
        <g filter={filter} className='sky-cloud-shade'>
          {puffs.map(([cx, cy, rx, ry], puff) => (
            <ellipse key={puff} cx={cx} cy={cy + 8} rx={rx} ry={ry} />
          ))}
        </g>
        <g filter={filter}>
          {puffs.map(([cx, cy, rx, ry], puff) => (
            <ellipse
              key={puff}
              cx={cx}
              cy={cy - 3}
              rx={rx * 0.94}
              ry={ry * 0.9}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}

export function Sky() {
  return (
    <div
      aria-hidden='true'
      className='sky pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden'
    >
      <CloudFilters />
      {/* By day the sun glows and its rays turn slowly; by night the moon. */}
      <div className='sky-sun dark:hidden'>
        <div className='sky-sun-rays' />
        <div className='sky-sun-core' />
      </div>
      <div className='sky-moon hidden dark:block' />
      <div className='hidden dark:block'>
        {STARS.map((star, index) => (
          <span
            key={index}
            className='sky-star'
            style={
              {
                top: star.top,
                left: star.left,
                width: star.size,
                height: star.size,
                animationDelay: star.delay,
                '--twinkle': star.twinkle,
              } as CSSProperties
            }
          />
        ))}
        {SHOOTING_STARS.map((star, index) => (
          <span
            key={index}
            className='sky-shooting-star'
            style={{
              top: star.top,
              left: star.left,
              animationDuration: star.every,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>
      {CLOUDS.map((cloud, index) => (
        <CloudShape key={index} cloud={cloud} index={index} />
      ))}
    </div>
  )
}
