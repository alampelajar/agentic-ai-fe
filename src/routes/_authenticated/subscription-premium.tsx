import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BadgeCheck, Check, Crown, CreditCard, Info, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/_authenticated/subscription-premium')({ component: SubscriptionPremiumPage })

// Prices are the same in both languages; names, periods and features come from the language files.
const plans = [
 { id: 'free', price: 'Rp0', icon: Sparkles, featured: false },
 { id: 'pro', price: 'Rp49.000', icon: BadgeCheck, featured: true },
 { id: 'premium', price: 'Rp99.000', icon: Crown, featured: false },
] as const

function SubscriptionPremiumPage() {
 const { t } = useTranslation()
 const [noticeOpen, setNoticeOpen] = useState(false)
 return <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'><div className='flex flex-1 flex-col gap-6 p-4 pb-10 sm:p-6'>
  <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'><div><div className='mb-2 flex items-center gap-2 text-sm font-medium text-primary'><CreditCard className='size-4' />{t('subscriptionPage.eyebrow')}</div><h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>{t('subscriptionPage.title')}</h1><p className='mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base'>{t('subscriptionPage.subtitle')}</p></div><Badge variant='secondary' className='w-fit'>{t('subscriptionPage.demoBadge')}</Badge></div>
  <div className='grid gap-4 sm:grid-cols-3'><Card><CardContent className='flex items-center gap-4 p-5'><div className='rounded-lg bg-muted p-3'><CreditCard className='size-5' /></div><div><p className='text-sm text-muted-foreground'>{t('subscriptionPage.stats.plans')}</p><p className='text-2xl font-semibold'>{plans.length}</p></div></CardContent></Card><Card><CardContent className='flex items-center gap-4 p-5'><div className='rounded-lg bg-muted p-3'><BadgeCheck className='size-5' /></div><div><p className='text-sm text-muted-foreground'>{t('subscriptionPage.stats.active')}</p><p className='text-2xl font-semibold'>—</p></div></CardContent></Card><Card><CardContent className='flex items-center gap-4 p-5'><div className='rounded-lg bg-muted p-3'><Sparkles className='size-5' /></div><div><p className='text-sm text-muted-foreground'>{t('subscriptionPage.stats.revenue')}</p><p className='text-2xl font-semibold'>—</p></div></CardContent></Card></div>
  <div><h2 className='text-lg font-semibold'>{t('subscriptionPage.choosePlan')}</h2><p className='mt-1 text-sm text-muted-foreground'>{t('subscriptionPage.choosePlanDescription')}</p></div>
  <div className='grid gap-4 lg:grid-cols-3'>{plans.map((plan) => { const Icon = plan.icon; const features = t(`subscriptionPage.plans.${plan.id}.features`, { returnObjects: true }) as string[]; return <Card key={plan.id} className={plan.featured ? 'relative border-primary shadow-md' : ''}>{plan.featured && <Badge className='absolute right-4 top-4'>{t('subscriptionPage.recommended')}</Badge>}<CardHeader><div className='mb-2 flex size-11 items-center justify-center rounded-xl bg-muted'><Icon className='size-5' /></div><CardTitle>{t(`subscriptionPage.plans.${plan.id}.name`)}</CardTitle><CardDescription>{t(`subscriptionPage.plans.${plan.id}.description`)}</CardDescription><div className='pt-3'><span className='text-3xl font-bold tracking-tight'>{plan.price}</span><span className='ml-1 text-sm text-muted-foreground'>{t(`subscriptionPage.plans.${plan.id}.period`)}</span></div></CardHeader><CardContent className='flex flex-col gap-5'><ul className='space-y-3'>{features.map((feature) => <li key={feature} className='flex items-start gap-2 text-sm'><Check className='mt-0.5 size-4 shrink-0 text-primary' /><span>{feature}</span></li>)}</ul><Button className='w-full' variant={plan.featured ? 'default' : 'outline'} onClick={() => setNoticeOpen(true)}>{plan.id === 'free' ? t('subscriptionPage.currentPlan') : t('subscriptionPage.choosePlan')}</Button></CardContent></Card> })}</div>
  {noticeOpen && <Card className='bg-amber-500/10' role='status'><CardContent className='flex flex-col gap-3 p-4 sm:flex-row sm:items-start'><Info className='mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400' /><div className='flex-1'><p className='font-semibold'>{t('subscriptionPage.notice.title')}</p><p className='mt-1 text-sm text-muted-foreground'>{t('subscriptionPage.notice.description')}</p></div><Button variant='outline' size='sm' onClick={() => setNoticeOpen(false)}>{t('common.close')}</Button></CardContent></Card>}
  <p className='text-xs text-muted-foreground'>{t('subscriptionPage.footnote')}</p>
 </div></div>
}
