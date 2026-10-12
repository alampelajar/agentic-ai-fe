import { Separator } from '@/components/ui/separator'

type ContentSectionProps = {
  title: string
  desc: string
  children: React.ReactNode
}

export function ContentSection({ title, desc, children }: ContentSectionProps) {
  return (
    <section className='flex min-h-0 w-full min-w-0 flex-1 flex-col'>
      <header className='flex-none space-y-1'>
        <h2 className='text-lg font-semibold tracking-tight'>{title}</h2>
        <p className='text-sm text-muted-foreground'>{desc}</p>
      </header>
      <Separator className='my-4 flex-none' />
      <div className='min-h-0 w-full min-w-0 flex-1 overflow-y-auto scroll-smooth pb-8'>
        <div className='w-full min-w-0'>{children}</div>
      </div>
    </section>
  )
}
