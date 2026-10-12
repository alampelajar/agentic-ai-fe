import { Separator } from '@/components/ui/separator'

type ContentSectionProps = {
  title: string
  desc: string
  children: React.ReactNode
}

export function ContentSection({ title, desc, children }: ContentSectionProps) {
  return (
    <section className='w-full min-w-0 space-y-5'>
      <header className='space-y-1'>
        <h2 className='text-lg font-semibold tracking-tight'>{title}</h2>
        <p className='text-sm leading-6 text-muted-foreground'>{desc}</p>
      </header>
      <Separator />
      <div className='w-full min-w-0'>{children}</div>
    </section>
  )
}
