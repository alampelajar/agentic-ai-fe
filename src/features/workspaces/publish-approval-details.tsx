import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'

type PublishFile = { path: string; status: 'changed' | 'deleted' }

const asString = (value: unknown) => (typeof value === 'string' ? value : '')

/**
 * What a workspace.publish approval will send: the repository, the new branch, the message and every
 * file. The server pins exactly these changes; if they differ when the approval runs, nothing is sent.
 */
export function PublishApprovalDetails({ args }: { args: Record<string, unknown> }) {
  const { t } = useTranslation()
  const files = Array.isArray(args.files) ? (args.files as PublishFile[]) : []
  const total = typeof args.file_count === 'number' ? args.file_count : files.length
  const more = total - files.length

  return (
    <div className='space-y-2' data-testid='publish-approval'>
      <dl className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1'>
        <dt className='text-muted-foreground'>{t('workspacePage.approval.repository')}</dt>
        <dd className='font-mono'>{asString(args.repository)}</dd>
        <dt className='text-muted-foreground'>{t('workspacePage.approval.newBranch')}</dt>
        <dd className='font-mono'>{asString(args.branch)}</dd>
        <dt className='text-muted-foreground'>{t('workspacePage.approval.pullRequest')}</dt>
        <dd>{args.pull_request === false ? t('workspacePage.approval.noPullRequest') : t('workspacePage.approval.pullRequestInto', { branch: asString(args.base_branch) })}</dd>
        <dt className='text-muted-foreground'>{t('workspacePage.approval.commitMessage')}</dt>
        <dd className='whitespace-pre-wrap'>{asString(args.message)}</dd>
      </dl>
      <p className='font-medium'>{t('workspacePage.approval.filesToSend', { count: total })}</p>
      <ul className='max-h-40 overflow-auto rounded-md border p-2 text-xs'>
        {files.map((file) => (
          <li key={file.path} className='flex items-center gap-2 py-0.5'>
            <Badge variant='outline' className='text-[10px]'>{file.status === 'deleted' ? t('githubPublish.status.deleted') : t('githubPublish.status.modified')}</Badge>
            <span className='truncate font-mono'>{file.path}</span>
          </li>
        ))}
      </ul>
      {more > 0 && <p className='text-xs text-muted-foreground'>{t('workspacePage.approval.moreFiles', { count: more })}</p>}
      <p className='text-xs text-muted-foreground'>{t('workspacePage.approval.publishPinned')}</p>
    </div>
  )
}
