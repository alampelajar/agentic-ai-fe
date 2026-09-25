import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bot, Rocket } from 'lucide-react'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/select-dropdown'

const formSchema = z.object({
  provider: z.string().min(1, 'Provider is required.'),
  model: z.string().min(1, 'Model is required.'),
  description: z.string().optional(),
})

type AgentDeployForm = z.infer<typeof formSchema>

type AgentsInviteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgentsInviteDialog({
  open,
  onOpenChange,
}: AgentsInviteDialogProps) {
  const form = useForm<AgentDeployForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: '',
      model: '',
      description: '',
    },
  })

  function onSubmit(values: AgentDeployForm) {
    showSubmittedData(values, 'Agent deployed successfully.')
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Bot size={20} />
            Deploy Agent
          </DialogTitle>

          <DialogDescription>
            Deploy a new AI Agent using your preferred provider and model.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='agent-deploy-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='provider'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>

                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='Select Provider'
                    items={[
                      { label: 'OpenAI', value: 'OpenAI' },
                      { label: 'Anthropic', value: 'Anthropic' },
                      { label: 'Google', value: 'Google' },
                      { label: 'DeepSeek', value: 'DeepSeek' },
                    ]}
                  />

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='model'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>

                  <FormControl>
                    <Input placeholder='GPT-4o' {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>

                  <FormControl>
                    <Textarea
                      className='resize-none'
                      placeholder='Optional description...'
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>Cancel</Button>
          </DialogClose>

          <Button type='submit' form='agent-deploy-form'>
            Deploy
            <Rocket className='ml-2 h-4 w-4' />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
