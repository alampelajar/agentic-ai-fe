import { useEffect, useState, type ReactNode } from 'react'
import { AlertCircle, FileText, Loader2, MessageSquareText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { isSignedIn } from '@/lib/guest'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { FeedbackForm } from './components/feedback-form'
import { ReportCard } from './components/report-card'
import { deleteFeedback, getMyFeedback, type Feedback } from './data/api'
import { errorText } from './error-text'

export function FeedbackPage() {
  const { t } = useTranslation()
  const [reports, setReports] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState<'form' | 'history'>('form')
  const [toDelete, setToDelete] = useState<Feedback | null>(null)
  const [deleting, setDeleting] = useState(false)

  // A visitor has sent nothing yet.
  const fetchReports = () =>
    (isSignedIn() ? getMyFeedback() : Promise.resolve<Feedback[]>([]))
      .then(setReports)
      .catch((error: unknown) =>
        setLoadError(errorText(error, t('feedbackPage.loadError')))
      )
      .finally(() => setLoading(false))

  function reload() {
    setLoading(true)
    setLoadError('')
    void fetchReports()
  }

  useEffect(() => {
    // Load once when the page opens.
    void fetchReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteFeedback(toDelete.id)
      setReports((current) =>
        current.filter((report) => report.id !== toDelete.id)
      )
      toast.success(t('feedbackPage.deleteSuccess'))
      setToDelete(null)
    } catch (error) {
      toast.error(errorText(error, t('feedbackPage.deleteError')))
    } finally {
      setDeleting(false)
    }
  }

  const openCount = reports.filter(
    (r) => r.status === 'new' || r.status === 'processing'
  ).length
  const doneCount = reports.filter((r) => r.status === 'completed').length
  const stats: [string, number][] = [
    ['feedbackPage.totalReports', reports.length],
    ['feedbackPage.inProgress', openCount],
    ['feedbackPage.completed', doneCount],
  ]

  return (
    <main className='mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6'>
      <header className='flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between'>
        <div className='space-y-2'>
          <div className='flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <MessageSquareText className='size-5' />
          </div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {t('feedbackPage.title')}
          </h1>
          <p className='max-w-2xl text-sm text-muted-foreground'>
            {t('feedbackPage.subtitle')}
          </p>
        </div>
        <div className='grid grid-cols-3 gap-2 sm:min-w-72'>
          {stats.map(([label, value]) => (
            <Card key={label} className='gap-2 py-4'>
              <CardContent className='px-3'>
                <p className='text-xs text-muted-foreground'>{t(label)}</p>
                <p className='mt-1 text-2xl font-semibold'>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </header>

      <nav className='flex gap-2 border-b'>
        <TabButton active={tab === 'form'} onClick={() => setTab('form')}>
          {t('feedbackPage.newReport')}
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          {t('feedbackPage.history')}{' '}
          <span className='ms-1 rounded-full bg-muted px-2 py-0.5 text-xs'>
            {reports.length}
          </span>
        </TabButton>
      </nav>

      {tab === 'form' ? (
        <FeedbackForm
          onCreated={(report) => {
            setReports((current) => [report, ...current])
            setTab('history')
          }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('feedbackPage.historyTitle')}</CardTitle>
            <CardDescription>
              {t('feedbackPage.historyDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className='flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground'>
                <Loader2 className='size-4 animate-spin' />
                {t('feedbackPage.loading')}
              </p>
            ) : loadError ? (
              <div
                role='alert'
                className='flex flex-col items-center gap-3 rounded-xl border border-destructive/30 px-6 py-10 text-center text-sm'
              >
                <AlertCircle className='size-6 text-destructive' />
                <p>{loadError}</p>
                <Button variant='outline' onClick={reload}>
                  {t('feedbackPage.retry')}
                </Button>
              </div>
            ) : reports.length === 0 ? (
              <div className='flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center'>
                <FileText className='mb-4 size-8 text-muted-foreground' />
                <h3 className='font-medium'>{t('feedbackPage.emptyTitle')}</h3>
                <p className='mt-1 max-w-sm text-sm text-muted-foreground'>
                  {t('feedbackPage.emptyDescription')}
                </p>
                <Button className='mt-5' onClick={() => setTab('form')}>
                  {t('feedbackPage.createFirst')}
                </Button>
              </div>
            ) : (
              <div className='space-y-4'>
                {reports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onRated={(updated) =>
                      setReports((current) =>
                        current.map((r) => (r.id === updated.id ? updated : r))
                      )
                    }
                    onDelete={() => setToDelete(report)}
                  />
                ))}
                <p className='text-center text-xs text-muted-foreground'>
                  {t('feedbackPage.deleteHint')}
                </p>
                <div className='text-center'>
                  <Button variant='outline' onClick={() => setTab('form')}>
                    {t('feedbackPage.sendAnother')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className='text-center text-xs text-muted-foreground'>
        {t('feedbackPage.footerNote')}
      </p>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && !deleting && setToDelete(null)}
        title={t('feedbackPage.deleteTitle')}
        desc={t('feedbackPage.deleteDescription', { id: toDelete?.id ?? '' })}
        confirmText={t('feedbackPage.deleteConfirm')}
        cancelBtnText={t('feedbackPage.cancel')}
        destructive
        isLoading={deleting}
        handleConfirm={() => void confirmDelete()}
      />
    </main>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={`border-b-2 px-4 py-3 text-sm font-medium ${active ? 'border-primary' : 'border-transparent text-muted-foreground'}`}
    >
      {children}
    </button>
  )
}
