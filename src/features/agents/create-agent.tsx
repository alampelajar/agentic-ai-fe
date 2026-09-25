import { useState } from 'react'
import { ArrowLeft, Bot, Code2, Database, Globe, Loader2, Wrench } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { useAuthStore } from '@/stores/auth-store'
import i18n from '@/i18n'

const API_URL = 'http://localhost:8080'

type ToolCardProps = {
  icon: React.ElementType
  title: string
  description: string
}

function ToolCard({ icon: Icon, title, description }: ToolCardProps) {
  return (
    <button
      type='button'
      className='flex items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted/50'
    >
      <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted'>
        <Icon className='size-4' />
      </div>

      <div>
        <p className='text-sm font-medium'>{title}</p>

        <p className='mt-1 text-xs leading-5 text-muted-foreground'>
          {description}
        </p>
      </div>
    </button>
  )
}

export function CreateAgent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.auth.accessToken)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('development')
  const [instructions, setInstructions] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleCreateAgent = async () => {
    setError('')

    if (!name.trim()) {
      setError(t('agentPage.createErrors.nameRequired'))
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`${API_URL}/api/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          type,
          instructions: instructions.trim(),
        }),
      })

      const text = await response.text()

      let data: Record<string, unknown> = {}

      try {
        const parsed: unknown = text ? JSON.parse(text) : {}
        if (typeof parsed === 'object' && parsed !== null) {
          data = parsed as Record<string, unknown>
        }
      } catch {
        // Ignore invalid JSON and use the fallback error below.
      }

      if (!response.ok) {
        const message =
          (typeof data.details === 'string' && data.details) ||
          (typeof data.error === 'string' && data.error) ||
          (typeof data.message === 'string' && data.message) ||
          t('agentPage.createErrors.failed')

        throw new Error(message)
      }

      await navigate({ to: '/users' })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('agentPage.createErrors.failed')
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-3'>
          <div className='flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
            <Bot className='size-4' />
          </div>

          <div>
            <p className='text-sm font-semibold'>{t('agentPage.create')}</p>

            <p className='text-xs text-muted-foreground'>
              {t('agentPage.management')}
            </p>
          </div>
        </div>

        <div className='ms-auto flex items-center gap-2'>
          <select
            value={i18n.language}
            onChange={(event) => i18n.changeLanguage(event.target.value)}
            className='h-9 rounded-md border bg-background px-3 text-sm'
          >
            <option value='id'>🇮🇩 Indonesia</option>
            <option value='en'>🇬🇧 English</option>
          </select>

          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mx-auto w-full max-w-4xl'>
          <Button variant='ghost' asChild className='mb-5'>
            <Link to='/users'>
              <ArrowLeft className='me-2 size-4' />
              {t('agentPage.backToAgents')}
            </Link>
          </Button>

          <div className='mb-6'>
            <h1 className='text-3xl font-bold tracking-tight'>
              {t('agentPage.createTitle')}
            </h1>

            <p className='mt-1 text-muted-foreground'>
              {t('agentPage.createSubtitle')}
            </p>
          </div>

          {error && (
            <Card className='mb-6 border-destructive/30'>
              <CardContent className='p-4'>
                <p className='text-sm font-medium text-destructive'>
                  {t('agentPage.createErrors.title')}
                </p>

                <p className='mt-1 text-sm text-muted-foreground'>{error}</p>
              </CardContent>
            </Card>
          )}

          <div className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>{t('agentPage.basicInformation')}</CardTitle>

                <CardDescription>
                  {t('agentPage.basicInformationDescription')}
                </CardDescription>
              </CardHeader>

              <CardContent className='space-y-5'>
                <div className='space-y-2'>
                  <Label htmlFor='agent-name'>{t('agentPage.agentName')}</Label>

                  <Input
                    id='agent-name'
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t('agentPage.agentNamePlaceholder')}
                    disabled={saving}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='agent-description'>
                    {t('agentPage.description')}
                  </Label>

                  <Textarea
                    id='agent-description'
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t('agentPage.descriptionPlaceholder')}
                    className='min-h-[100px] resize-none'
                    disabled={saving}
                  />
                </div>

                <div className='space-y-2'>
                  <Label>{t('agentPage.agentType')}</Label>

                  <Select
                    value={type}
                    onValueChange={setType}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value='development'>
                        {t('agentPage.development')}
                      </SelectItem>

                      <SelectItem value='research'>
                        {t('agentPage.research')}
                      </SelectItem>

                      <SelectItem value='testing'>
                        {t('agentPage.testing')}
                      </SelectItem>

                      <SelectItem value='documentation'>
                        {t('agentPage.documentation')}
                      </SelectItem>

                      <SelectItem value='design'>
                        {t('agentPage.design')}
                      </SelectItem>

                      <SelectItem value='analysis'>
                        {t('agentPage.analysis')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('agentPage.instructions')}</CardTitle>

                <CardDescription>
                  {t('agentPage.instructionsDescription')}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Textarea
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder={t('agentPage.instructionsPlaceholder')}
                  className='min-h-[160px] resize-none'
                  disabled={saving}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('agentPage.tools')}</CardTitle>

                <CardDescription>
                  {t('agentPage.toolsDescription')}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <ToolCard
                    icon={Code2}
                    title={t('agentPage.codeTool')}
                    description={t('agentPage.codeToolDescription')}
                  />

                  <ToolCard
                    icon={Globe}
                    title={t('agentPage.browserTool')}
                    description={t('agentPage.browserToolDescription')}
                  />

                  <ToolCard
                    icon={Database}
                    title={t('agentPage.databaseTool')}
                    description={t('agentPage.databaseToolDescription')}
                  />

                  <ToolCard
                    icon={Wrench}
                    title={t('agentPage.apiTool')}
                    description={t('agentPage.apiToolDescription')}
                  />
                </div>
              </CardContent>
            </Card>

            <div className='flex justify-end gap-3'>
              <Button variant='outline' asChild disabled={saving}>
                <Link to='/users'>{t('agentPage.cancel')}</Link>
              </Button>

              <Button
                type='button'
                onClick={handleCreateAgent}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className='me-2 size-4 animate-spin' />
                    {t('agentPage.creatingAgent')}
                  </>
                ) : (
                  <>
                    <Bot className='me-2 size-4' />
                    {t('agentPage.createAgent')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}
