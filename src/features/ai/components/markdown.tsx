import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkChatBreaks } from './chat-breaks'

/**
 * How each kind of Markdown looks inside a chat answer. Sizes stay at the page's
 * own scale (nothing larger than 15px: an answer is read in the conversation, not
 * as a document), tables carry rules and no fill, and code sits on a flat surface.
 *
 * Two things are left out on purpose, because the text comes from a model:
 * raw HTML is never rendered (it shows as text), and images are never loaded
 * (a remote picture in an answer is a way to send a request from the reader's
 * browser), so an image shows as its description.
 */
const components: Components = {
  h1: ({ children }) => <h3 className='mb-2 mt-4 text-[15px] font-semibold first:mt-0'>{children}</h3>,
  h2: ({ children }) => <h3 className='mb-2 mt-4 text-[15px] font-semibold first:mt-0'>{children}</h3>,
  h3: ({ children }) => <h4 className='mb-1.5 mt-3 text-sm font-semibold first:mt-0'>{children}</h4>,
  h4: ({ children }) => <h4 className='mb-1.5 mt-3 text-sm font-semibold first:mt-0'>{children}</h4>,
  p: ({ children }) => <p className='my-2 first:mt-0 last:mb-0'>{children}</p>,
  ul: ({ children }) => <ul className='my-2 list-disc space-y-1 pl-5'>{children}</ul>,
  ol: ({ children }) => <ol className='my-2 list-decimal space-y-1 pl-5'>{children}</ol>,
  blockquote: ({ children }) => <blockquote className='my-3 border-l-2 border-border pl-4 text-muted-foreground'>{children}</blockquote>,
  hr: () => <hr className='my-4 border-border' />,
  a: ({ href, children }) => (
    <a href={href} target='_blank' rel='noopener noreferrer nofollow' className='underline underline-offset-2 hover:text-foreground'>
      {children}
    </a>
  ),
  img: ({ alt }) => (alt ? <span className='text-muted-foreground'>[{alt}]</span> : null),
  pre: ({ children }) => <pre className='my-3 overflow-x-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-[13px] leading-5'>{children}</pre>,
  code: ({ className, children }) =>
    // A fenced block is wrapped by <pre> above; inline code is the only one with no language and no new line.
    /language-/.test(className ?? '') || String(children).includes('\n') ? (
      <code className={className}>{children}</code>
    ) : (
      <code className='rounded bg-muted px-1 py-0.5 font-mono text-[13px]'>{children}</code>
    ),
  table: ({ children }) => (
    <div className='my-3 overflow-x-auto'>
      <table className='w-full border-collapse text-sm'>{children}</table>
    </div>
  ),
  th: ({ children }) => <th className='border-b border-border px-3 py-2 text-left text-[13px] font-medium text-muted-foreground'>{children}</th>,
  td: ({ children }) => <td className='border-b border-border/60 px-3 py-2 align-top'>{children}</td>,
}

/** An agent's answer, with the Markdown a model writes shown as formatting instead of as symbols. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className='max-w-[46rem] text-sm leading-6 break-words' data-testid='markdown'>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkChatBreaks]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
