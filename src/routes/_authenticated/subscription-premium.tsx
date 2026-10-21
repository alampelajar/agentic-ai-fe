import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BadgeCheck, Check, Crown, CreditCard, Info, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/_authenticated/subscription-premium')({ component: SubscriptionPremiumPage })

const plans = [
 { name: 'Free', price: 'Rp0', period: 'selamanya', description: 'Untuk mulai mencoba Agentic AI.', features: ['Akses fitur dasar', 'Model AI gratis', 'Tanpa biaya langganan'], icon: Sparkles, featured: false },
 { name: 'Pro', price: 'Rp49.000', period: '/ bulan', description: 'Untuk penggunaan AI yang lebih intensif.', features: ['Akses model pilihan', 'Batas penggunaan lebih tinggi', 'Dukungan prioritas'], icon: BadgeCheck, featured: true },
 { name: 'Premium', price: 'Rp99.000', period: '/ bulan', description: 'Untuk pengguna yang membutuhkan kemampuan lebih lengkap.', features: ['Akses model premium', 'Batas penggunaan tertinggi', 'Fitur eksklusif'], icon: Crown, featured: false },
]

function SubscriptionPremiumPage() {
 const [noticeOpen, setNoticeOpen] = useState(false)
 return <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'><div className='flex flex-1 flex-col gap-6 p-4 pb-10 sm:p-6'>
  <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'><div><div className='mb-2 flex items-center gap-2 text-sm font-medium text-primary'><CreditCard className='size-4' />Subscription</div><h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>Subscription &amp; Premium</h1><p className='mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base'>Lihat contoh paket dan fitur langganan. Halaman ini masih berupa tampilan demo.</p></div><Badge variant='secondary' className='w-fit'>Demo · Belum aktif</Badge></div>
  <div className='grid gap-4 sm:grid-cols-3'><Card><CardContent className='flex items-center gap-4 p-5'><div className='rounded-lg bg-muted p-3'><CreditCard className='size-5' /></div><div><p className='text-sm text-muted-foreground'>Paket tersedia</p><p className='text-2xl font-semibold'>3</p></div></CardContent></Card><Card><CardContent className='flex items-center gap-4 p-5'><div className='rounded-lg bg-muted p-3'><BadgeCheck className='size-5' /></div><div><p className='text-sm text-muted-foreground'>Langganan aktif</p><p className='text-2xl font-semibold'>—</p></div></CardContent></Card><Card><CardContent className='flex items-center gap-4 p-5'><div className='rounded-lg bg-muted p-3'><Sparkles className='size-5' /></div><div><p className='text-sm text-muted-foreground'>Pendapatan</p><p className='text-2xl font-semibold'>—</p></div></CardContent></Card></div>
  <div><h2 className='text-lg font-semibold'>Pilih paket</h2><p className='mt-1 text-sm text-muted-foreground'>Harga dan fitur di bawah hanya contoh untuk rancangan antarmuka.</p></div>
  <div className='grid gap-4 lg:grid-cols-3'>{plans.map((plan) => { const Icon = plan.icon; return <Card key={plan.name} className={plan.featured ? 'relative border-primary shadow-md' : ''}>{plan.featured && <Badge className='absolute right-4 top-4'>Rekomendasi</Badge>}<CardHeader><div className='mb-2 flex size-11 items-center justify-center rounded-xl bg-muted'><Icon className='size-5' /></div><CardTitle>{plan.name}</CardTitle><CardDescription>{plan.description}</CardDescription><div className='pt-3'><span className='text-3xl font-bold tracking-tight'>{plan.price}</span><span className='ml-1 text-sm text-muted-foreground'>{plan.period}</span></div></CardHeader><CardContent className='flex flex-col gap-5'><ul className='space-y-3'>{plan.features.map((feature) => <li key={feature} className='flex items-start gap-2 text-sm'><Check className='mt-0.5 size-4 shrink-0 text-primary' /><span>{feature}</span></li>)}</ul><Button className='w-full' variant={plan.featured ? 'default' : 'outline'} onClick={() => setNoticeOpen(true)}>{plan.name === 'Free' ? 'Paket saat ini' : 'Pilih paket'}</Button></CardContent></Card> })}</div>
  {noticeOpen && <Card className='border-amber-500/40'><CardContent className='flex flex-col gap-3 p-4 sm:flex-row sm:items-start'><Info className='mt-0.5 size-5 shrink-0 text-amber-600' /><div className='flex-1'><p className='font-semibold'>Fitur belum bisa digunakan</p><p className='mt-1 text-sm text-muted-foreground'>Pembelian langganan belum tersedia. Fitur ini akan diaktifkan pada pembaruan berikutnya.</p></div><Button variant='outline' size='sm' onClick={() => setNoticeOpen(false)}>Tutup</Button></CardContent></Card>}
  <p className='text-xs text-muted-foreground'>Catatan: halaman ini hanya mockup. Belum ada pembayaran, transaksi, atau aktivasi langganan otomatis.</p>
 </div></div>
}
