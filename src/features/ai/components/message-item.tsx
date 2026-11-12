import { Download, FileArchive } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatFileSize } from './format-file-size'
import { Markdown } from './markdown'

export type GeneratedFile = {
  id: number
  name: string
  size: number
  blobUrl: string
}

export type ChatMessageView = {
  id: number
  role: 'user' | 'agent'
  content: string
  file?: GeneratedFile
  model?: string
  modelId?: number
  provider?: string
  /** Photos the person attached, shown in their message (local previews, kept for this visit). */
  images?: { name: string; url: string }[]
}

/**
 * One turn of the conversation. The person's message sits on the right in a quiet
 * surface and stays plain text; the agent's answer is formatted Markdown on the
 * page under the agent's name, with the model that wrote it as one small line at the end.
 */
export function MessageItem({ message, agentName }: { message: ChatMessageView; agentName: string }) {
  const { t } = useTranslation()

  if (message.role === 'user') {
    return (
      <article className='flex justify-end' data-role='user'>
        <div className='flex max-w-4/5 flex-col items-end gap-2'>
          {message.images && message.images.length > 0 && (
            <div className='flex flex-wrap justify-end gap-2' data-testid='message-images'>
              {message.images.map((image) => (
                <img key={image.url} src={image.url} alt={image.name} className='max-h-48 max-w-full rounded-md border border-border object-cover' />
              ))}
            </div>
          )}
          <div className='whitespace-pre-wrap rounded-lg bg-muted px-4 py-2.5 text-sm leading-6'>{message.content}</div>
        </div>
      </article>
    )
  }

  const source = [message.model, message.provider].filter(Boolean).join(' · ')

  return (
    <article className='flex flex-col gap-1.5' data-role='agent'>
      <p className='text-xs font-medium text-muted-foreground'>{agentName}</p>
      <Markdown>{message.content}</Markdown>

      {message.file && (
        <div className='flex max-w-[46rem] items-center gap-3 rounded-md border border-border p-3'>
          <FileArchive aria-hidden='true' className='size-5 shrink-0 text-muted-foreground' />
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-medium'>{message.file.name}</p>
            <p className='text-xs text-muted-foreground'>{formatFileSize(message.file.size)}</p>
          </div>
          <a
            href={message.file.blobUrl}
            download={message.file.name}
            className='inline-flex h-8 items-center gap-2 rounded-md bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <Download aria-hidden='true' className='size-3.5' />
            {t('agentic.download')}
          </a>
        </div>
      )}

      {source && <p className='text-xs text-muted-foreground'>{source}</p>}
    </article>
  )
}
