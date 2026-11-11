import { useState } from 'react'
import { AlertTriangle, ExternalLink, GitPullRequest, Loader2, UploadCloud } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getChanges, publishToGitHub, type FileChange, type PublishOutcome, type Workspace } from './data/api'

/**
 * "Send to GitHub": the workspace's changes since the import become one commit on a NEW branch,
 * with a pull request into the branch it came from. Nothing on GitHub is overwritten.
 */
export function GitHubPublishButton({ workspace }: { workspace: Workspace }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [changes, setChanges] = useState<FileChange[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [branch, setBranch] = useState('')
  const [message, setMessage] = useState('')
  const [createPR, setCreatePR] = useState(true)
  const [prTitle, setPrTitle] = useState('')
  const [prBody, setPrBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<PublishOutcome | null>(null)

  const repository = `${workspace.github_owner}/${workspace.github_repo}`

  async function openDialog() {
    setOpen(true)
    setOutcome(null)
    setError(null)
    setChanges(null)
    setLoadError(null)
    try {
      setChanges(await getChanges(workspace.id))
    } catch (failure) {
      setLoadError(failure instanceof Error ? failure.message : t('githubPublish.loadFailed'))
    }
  }

  async function send() {
    if (!message.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const result = await publishToGitHub(workspace.id, { branch: branch.trim(), message: message.trim(), create_pr: createPR, pr_title: prTitle.trim(), pr_body: prBody })
      setOutcome(result)
      toast.success(t('githubPublish.sent'))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('githubPublish.failed'))
    } finally {
      setSending(false)
    }
  }

  const nothingToSend = changes !== null && changes.length === 0

  return (
    <>
      <Button variant='outline' size='sm' onClick={() => void openDialog()}>
        <UploadCloud className='mr-2 size-4' />
        {t('githubPublish.button')}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !sending && setOpen(next)}>
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{t('githubPublish.title')}</DialogTitle>
            <DialogDescription>{t('githubPublish.description', { repository, branch: workspace.base_branch })}</DialogDescription>
          </DialogHeader>

          {outcome ? (
            <div className='space-y-3 text-sm'>
              <p>{t('githubPublish.doneBranch', { branch: outcome.result.branch, count: outcome.file_count })}</p>
              {outcome.result.base_moved && (
                <p className='flex gap-2 rounded-md border border-amber-500/40 p-2 text-amber-600 dark:text-amber-400'>
                  <AlertTriangle className='mt-0.5 size-4 shrink-0' />{t('githubPublish.baseMoved', { branch: workspace.base_branch })}
                </p>
              )}
              {outcome.result.pull_request_error && <p role='alert' className='text-destructive'>{outcome.result.pull_request_error}</p>}
              <div className='flex flex-wrap gap-2'>
                {outcome.result.pull_request_url && (
                  <Button asChild size='sm'>
                    <a href={outcome.result.pull_request_url} target='_blank' rel='noreferrer'><GitPullRequest className='mr-2 size-4' />{t('githubPublish.openPR')}</a>
                  </Button>
                )}
                {outcome.result.commit_url && (
                  <Button asChild size='sm' variant='outline'>
                    <a href={outcome.result.commit_url} target='_blank' rel='noreferrer'><ExternalLink className='mr-2 size-4' />{t('githubPublish.openCommit')}</a>
                  </Button>
                )}
              </div>
              <DialogFooter><Button variant='outline' onClick={() => setOpen(false)}>{t('githubPublish.close')}</Button></DialogFooter>
            </div>
          ) : (
            <form className='space-y-4' onSubmit={(event) => { event.preventDefault(); void send() }}>
              <div className='space-y-1.5'>
                <p className='text-sm font-medium'>{t('githubPublish.changes')}</p>
                {loadError ? (
                  <p role='alert' className='text-sm text-destructive'>{loadError}</p>
                ) : changes === null ? (
                  <p className='flex items-center gap-2 text-sm text-muted-foreground'><Loader2 className='size-4 animate-spin' />{t('githubPublish.loading')}</p>
                ) : nothingToSend ? (
                  <p className='text-sm text-muted-foreground'>{t('githubPublish.noChanges')}</p>
                ) : (
                  <ul className='max-h-40 overflow-auto rounded-md border p-2 text-xs' aria-label={t('githubPublish.changes')}>
                    {changes.map((change) => (
                      <li key={change.path} className='flex items-center gap-2 py-0.5'>
                        <Badge variant='outline' className='text-[10px]'>{t(`githubPublish.status.${change.status}`)}</Badge>
                        <span className='truncate font-mono'>{change.path}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='publish-message'>{t('githubPublish.message')}</Label>
                <Input id='publish-message' value={message} maxLength={500} required placeholder={t('githubPublish.messagePlaceholder')} onChange={(event) => setMessage(event.target.value)} />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='publish-branch'>{t('githubPublish.branch')}</Label>
                <Input id='publish-branch' value={branch} maxLength={100} placeholder={t('githubPublish.branchPlaceholder')} onChange={(event) => setBranch(event.target.value)} />
                <p className='text-xs text-muted-foreground'>{t('githubPublish.branchHint', { branch: workspace.base_branch })}</p>
              </div>
              <label className='flex items-center gap-2 text-sm'>
                <Checkbox checked={createPR} onCheckedChange={(value) => setCreatePR(value === true)} aria-label={t('githubPublish.createPR')} />
                {t('githubPublish.createPR')}
              </label>
              {createPR && (
                <>
                  <div className='space-y-1.5'>
                    <Label htmlFor='publish-pr-title'>{t('githubPublish.prTitle')}</Label>
                    <Input id='publish-pr-title' value={prTitle} maxLength={200} placeholder={t('githubPublish.prTitlePlaceholder')} onChange={(event) => setPrTitle(event.target.value)} />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='publish-pr-body'>{t('githubPublish.prBody')}</Label>
                    <Textarea id='publish-pr-body' value={prBody} maxLength={10000} rows={3} onChange={(event) => setPrBody(event.target.value)} />
                  </div>
                </>
              )}
              {error && <p role='alert' className='text-sm text-destructive'>{error}</p>}
              <DialogFooter>
                <Button type='button' variant='outline' disabled={sending} onClick={() => setOpen(false)}>{t('githubPublish.cancel')}</Button>
                <Button type='submit' disabled={sending || !message.trim() || !changes || nothingToSend}>
                  {sending ? <Loader2 className='mr-2 size-4 animate-spin' /> : <UploadCloud className='mr-2 size-4' />}
                  {sending ? t('githubPublish.sending') : t('githubPublish.send')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
