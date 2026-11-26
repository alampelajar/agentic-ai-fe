import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { Direction, LookBlocks } from '../data/api'

/**
 * Used when the server sends no section choices for a look: a plain page that still
 * follows the look's colours, corners and heading style.
 */
function fallbackBlocks(direction: Direction): LookBlocks {
  return {
    header: 'split',
    hero: direction.serif ? 'editorial' : 'split',
    list: 'cards',
    statement: 'quote',
    footer: 'columns',
    button: 'soft',
    frame: 'line',
    caps: false,
    centered: false,
    rule: false,
    tilt: false,
    airy: false,
  }
}

type Palette = Direction['palette']

type Shape = {
  p: Palette
  b: LookBlocks
  radius: string
}

/** A line standing in for words. */
function Line({ colour, className }: { colour: string; className?: string }) {
  return (
    <span
      className={cn('block h-1 rounded-full', className)}
      style={{ background: colour }}
    />
  )
}

/** The edge a look gives its cards and pictures. */
function frameStyle({ p, b, radius }: Shape): CSSProperties {
  const edge =
    b.frame === 'bold'
      ? `2px solid ${p.foreground}`
      : b.frame === 'dashed'
        ? `1px dashed ${p.border}`
        : b.frame === 'double'
          ? `3px double ${p.border}`
          : b.frame === 'none'
            ? 'none'
            : `1px solid ${p.border}`
  return { border: edge, borderRadius: radius }
}

function SketchButton({ p, b, radius }: Shape) {
  if (b.button === 'link')
    return (
      <span
        className='block h-1 w-8 border-b'
        style={{ borderColor: p.primary }}
      />
    )
  const corner =
    b.button === 'pill' ? '999px' : b.button === 'square' ? '1px' : radius
  return (
    <span
      className='block h-2.5 w-10'
      style={{ background: p.primary, borderRadius: corner }}
    />
  )
}

function Header(shape: Shape) {
  const { p, b } = shape
  const links = (colour: string) => (
    <span className='flex gap-1'>
      <Line colour={colour} className='w-3' />
      <Line colour={colour} className='w-3' />
      <Line colour={colour} className='w-3' />
    </span>
  )
  if (b.header === 'centered')
    return (
      <div className='flex flex-col items-center gap-1 px-3 pt-2'>
        <Line colour={p.foreground} className='w-12' />
        {links(p.muted)}
      </div>
    )
  if (b.header === 'bar')
    return (
      <div
        className='flex items-center justify-between px-3 py-1.5'
        style={{ background: p.foreground }}
      >
        <Line colour={p.background} className='w-10' />
        {links(p.background)}
      </div>
    )
  const top =
    b.header === 'announce' ? p.accent : b.header === 'topbar' ? p.muted : null
  return (
    <div>
      {top ? <span className='block h-1' style={{ background: top }} /> : null}
      <div className='flex items-center justify-between px-3 pt-2'>
        <Line colour={p.foreground} className='w-10' />
        <span className='flex items-center gap-1'>
          {links(p.muted)}
          {b.header === 'split' ? null : (
            <span
              className='block h-1.5 w-4 rounded-sm'
              style={{ background: p.primary }}
            />
          )}
        </span>
      </div>
    </div>
  )
}

function Picture(shape: Shape & { className?: string }) {
  return (
    <span
      className={cn('block', shape.className)}
      style={{ background: shape.p.surface, ...frameStyle(shape) }}
    />
  )
}

function Hero(shape: Shape) {
  const { p, b } = shape
  const heading = b.caps ? 'h-2' : 'h-1.5'
  const words = (center: boolean, wide: string, narrow: string) => (
    <div className={cn('flex flex-col gap-1', center && 'items-center')}>
      <Line colour={p.foreground} className={cn(heading, wide)} />
      <Line colour={p.foreground} className={cn(heading, narrow)} />
      {b.rule ? (
        <span className='block h-0.5 w-6' style={{ background: p.accent }} />
      ) : null}
      <Line colour={p.muted} className='mt-0.5 w-16' />
    </div>
  )

  switch (b.hero) {
    case 'calm':
      return (
        <div className='flex flex-col items-center gap-2 px-3 py-4'>
          {words(true, 'w-20', 'w-14')}
          <SketchButton {...shape} />
        </div>
      )
    case 'split':
      return (
        <div className='flex items-center gap-2 px-3 py-2'>
          <div className='flex flex-1 flex-col gap-2'>
            {words(false, 'w-full', 'w-3/4')}
            <SketchButton {...shape} />
          </div>
          <Picture {...shape} className='h-12 w-2/5' />
        </div>
      )
    case 'poster':
      return (
        <div className='flex flex-col gap-1.5 px-3 py-2'>
          <Line colour={p.foreground} className='h-3 w-full rounded-none' />
          <Line colour={p.foreground} className='h-3 w-4/5 rounded-none' />
          {b.rule ? (
            <span
              className='block h-0.5 w-8'
              style={{ background: p.accent }}
            />
          ) : null}
          <SketchButton {...shape} />
        </div>
      )
    case 'pop':
      return (
        <div className='relative flex flex-col items-center gap-2 px-3 py-3'>
          <span
            className='absolute top-2 left-4 size-3 rounded-full'
            style={{ background: p.accent }}
          />
          <span
            className='absolute right-5 bottom-3 size-2.5 rotate-12 rounded-sm'
            style={{ background: p.primary }}
          />
          {words(true, 'w-24', 'w-16')}
          <SketchButton {...shape} />
        </div>
      )
    case 'panel':
      return (
        <div className='px-3 py-2'>
          <div
            className='flex flex-col gap-2 p-3'
            style={{ background: p.surface, borderRadius: shape.radius }}
          >
            {words(false, 'w-3/4', 'w-1/2')}
            <SketchButton {...shape} />
          </div>
        </div>
      )
    case 'framed':
      return (
        <div className='flex flex-col items-center gap-2 px-3 py-2'>
          <Picture {...shape} className='h-9 w-24' />
          {words(true, 'w-20', 'w-12')}
        </div>
      )
    default:
      // editorial: large words on the left, room around them.
      return (
        <div className='flex flex-col gap-2 px-3 py-3'>
          {words(false, 'w-3/4', 'w-1/2')}
          <SketchButton {...shape} />
        </div>
      )
  }
}

function List(shape: Shape) {
  const { p, b } = shape
  const box = (index: number, className: string) => (
    <span
      key={index}
      className={cn(
        'block',
        className,
        b.tilt && (index % 2 === 0 ? '-rotate-2' : 'rotate-2')
      )}
      style={{
        background: b.list === 'tiles' ? p.surface : p.background,
        ...frameStyle(shape),
      }}
    />
  )
  switch (b.list) {
    case 'rows':
      return (
        <div className='flex flex-col gap-1.5 px-3'>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className='flex items-center justify-between border-b pb-1'
              style={{ borderColor: p.border }}
            >
              <Line colour={p.foreground} className='w-12' />
              <Line colour={p.muted} className='w-6' />
            </span>
          ))}
        </div>
      )
    case 'columns':
      return (
        <div className='grid grid-cols-3 gap-3 px-3'>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                'flex flex-col gap-1',
                b.centered && 'items-center'
              )}
            >
              <span
                className='block size-2 rounded-full'
                style={{ background: p.accent }}
              />
              <Line colour={p.foreground} className='w-full' />
              <Line colour={p.muted} className='w-2/3' />
            </span>
          ))}
        </div>
      )
    case 'bento':
      return (
        <div className='grid grid-cols-3 grid-rows-2 gap-1.5 px-3'>
          {box(0, 'col-span-2 row-span-2 h-full min-h-10')}
          {box(1, 'h-4')}
          {box(2, 'h-4')}
        </div>
      )
    case 'tiles':
      return (
        <div className='grid grid-cols-4 gap-1.5 px-3'>
          {[0, 1, 2, 3].map((i) => box(i, 'h-7'))}
        </div>
      )
    default:
      // cards and boxes: three cards side by side.
      return (
        <div className='grid grid-cols-3 gap-2 px-3'>
          {[0, 1, 2].map((i) => box(i, b.list === 'boxes' ? 'h-8' : 'h-9'))}
        </div>
      )
  }
}

function Statement({ p, b }: Shape) {
  if (b.statement === 'band')
    return (
      <div
        className='flex flex-col items-center gap-1 py-2'
        style={{ background: p.primary }}
      >
        <Line colour={p.primary_foreground} className='w-24' />
        <Line colour={p.primary_foreground} className='w-14' />
      </div>
    )
  return (
    <div className='flex flex-col items-center gap-1 px-3'>
      <span className='block h-1.5 w-2' style={{ background: p.accent }} />
      <Line colour={p.foreground} className='w-24' />
      <Line colour={p.foreground} className='w-16' />
    </div>
  )
}

function Footer({ p, b }: Shape) {
  if (b.footer === 'dark')
    return (
      <div
        className='mt-auto flex justify-between px-3 py-2'
        style={{ background: p.foreground }}
      >
        <Line colour={p.background} className='w-10' />
        <Line colour={p.background} className='w-6' />
      </div>
    )
  if (b.footer === 'centered')
    return (
      <div
        className='mt-auto flex flex-col items-center gap-1 border-t px-3 py-2'
        style={{ borderColor: p.border }}
      >
        <Line colour={p.foreground} className='w-10' />
        <Line colour={p.muted} className='w-16' />
      </div>
    )
  if (b.footer === 'row')
    return (
      <div
        className='mt-auto flex items-center justify-between border-t px-3 py-2'
        style={{ borderColor: p.border }}
      >
        <Line colour={p.muted} className='w-10' />
        <Line colour={p.muted} className='w-14' />
      </div>
    )
  return (
    <div
      className='mt-auto grid grid-cols-3 gap-3 px-3 py-2'
      style={{ background: p.surface }}
    >
      {[0, 1, 2].map((i) => (
        <span key={i} className='flex flex-col gap-1'>
          <Line colour={p.foreground} className='w-2/3' />
          <Line colour={p.muted} className='w-full' />
        </span>
      ))}
    </div>
  )
}

/**
 * A small drawing of where things sit on the look's pages (top, opening, a list,
 * a highlighted sentence, the bottom), in the look's own colours. It loads nothing
 * from outside, so many cards can be shown at once.
 */
export function LookSketch({
  direction,
  className,
}: {
  direction: Direction
  className?: string
}) {
  const shape: Shape = {
    p: direction.palette,
    b: direction.blocks ?? fallbackBlocks(direction),
    radius: direction.radius,
  }
  return (
    <div
      aria-hidden='true'
      className={cn(
        'flex flex-col overflow-hidden',
        shape.b.airy ? 'gap-3' : 'gap-2',
        className
      )}
      style={{ background: shape.p.background }}
    >
      <Header {...shape} />
      <Hero {...shape} />
      <List {...shape} />
      <Statement {...shape} />
      <Footer {...shape} />
    </div>
  )
}

/** The look's colours, side by side. */
export function LookColours({ palette }: { palette: Palette }) {
  const colours = [
    palette.background,
    palette.surface,
    palette.foreground,
    palette.primary,
    palette.accent,
  ]
  return (
    <span aria-hidden='true' className='flex overflow-hidden rounded-md border'>
      {colours.map((colour, index) => (
        <span
          key={index}
          className='h-4 flex-1'
          style={{ background: colour }}
        />
      ))}
    </span>
  )
}
