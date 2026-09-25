'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
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
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/select-dropdown'
import { type Agent } from '../data/schema'

type AgentActionDialogProps = {
  currentRow?: Agent
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AgentForm = {
  name: string
  provider: string
  model: string
  status: string
}

export function AgentsActionDialog({
  currentRow,
  open,
  onOpenChange,
}: AgentActionDialogProps) {
  const form = useForm<AgentForm>({
    defaultValues: {
      name: '',
      provider: '',
      model: '',
      status: 'running',
    },
  })

  useEffect(() => {
    if (currentRow) {
      form.reset({
        name: currentRow.name,
        provider: currentRow.provider,
        model: currentRow.model,
        status: currentRow.status,
      })
    } else {
      form.reset({
        name: '',
        provider: '',
        model: '',
        status: 'running',
      })
    }
  }, [currentRow, form])

  function onSubmit(values: AgentForm) {
    console.log(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{currentRow ? 'Edit Agent' : 'New Agent'}</DialogTitle>

          <DialogDescription>Configure your AI Agent.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Customer Support' {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

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
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>

                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='Status'
                    items={[
                      { label: 'Running', value: 'running' },
                      { label: 'Idle', value: 'idle' },
                      { label: 'Offline', value: 'offline' },
                    ]}
                  />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type='submit'>Save Agent</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
