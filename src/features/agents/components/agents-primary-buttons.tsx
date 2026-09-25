import { Bot, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAgents } from './agents-provider'

export function AgentsPrimaryButtons() {
  const { setOpen } = useAgents()

  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={() => setOpen('invite')}
      >
        <span>Deploy Agent</span>
        <Bot size={18} />
      </Button>

      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>New Agent</span>
        <Plus size={18} />
      </Button>
    </div>
  )
}
