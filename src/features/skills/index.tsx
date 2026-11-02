import { useEffect, useRef, useState } from 'react'
import { Check, FileArchive, FilePlus2, GitBranch, Loader2, Search, Trash2, Upload, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { createSkill, deleteSkill, getSkills, importSkillGithub, importSkillZip, type Skill, updateSkill, validateSkill } from './data/api'

const emptyManifest = { id: '', name: '', version: '1.0.0', description: '', author: '', platforms: ['windows'], instructions: 'SKILL.md', tools: [], requested_permissions: [] }

export function Skills() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [githubURL, setGithubURL] = useState('')
  const [manifest, setManifest] = useState(emptyManifest)
  const [instructions, setInstructions] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = async (term = search) => {
    setLoading(true)
    try { setSkills(await getSkills(term)) } catch (error) { toast.error(error instanceof Error ? error.message : 'Skill gagal dimuat.') } finally { setLoading(false) }
  }
  useEffect(() => { void refresh('') }, [])

  const run = async (action: () => Promise<void>) => { setWorking(true); try { await action(); await refresh() } catch (error) { toast.error(error instanceof Error ? error.message : 'Operasi skill gagal.') } finally { setWorking(false) } }
  const setField = (field: keyof typeof manifest, value: string) => setManifest((current) => ({ ...current, [field]: value }))

  return <Main className='space-y-6'>
    <div className='flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between'>
      <div><p className='text-sm text-muted-foreground'>Agentic workspace</p><h1 className='text-2xl font-semibold tracking-tight'>Skills</h1><p className='mt-1 max-w-2xl text-sm text-muted-foreground'>Kelola instruksi dan kemampuan yang dapat dipakai agent tanpa mengubah source code aplikasi.</p></div>
      <div className='flex gap-2'><Button onClick={() => document.getElementById('create-skill')?.scrollIntoView({ behavior: 'smooth' })}><FilePlus2 className='mr-2 size-4' />Buat skill</Button><Button variant='outline' onClick={() => fileRef.current?.click()}><Upload className='mr-2 size-4' />Import ZIP</Button><input ref={fileRef} type='file' accept='.zip,application/zip' className='hidden' onChange={(event) => { const file = event.target.files?.[0]; if (file) void run(async () => { await importSkillZip(file); toast.success('Skill berhasil diimpor.') }); event.target.value = '' }} /></div>
    </div>

    <div className='grid gap-3 sm:grid-cols-3'>{[['Terpasang', skills.length], ['Aktif', skills.filter((skill) => skill.is_enabled).length], ['Perlu perhatian', skills.filter((skill) => skill.validation_status === 'error').length]].map(([label, value]) => <Card key={String(label)} className='gap-3 py-4'><CardContent className='px-5'><p className='text-sm text-muted-foreground'>{label}</p><p className='mt-1 text-2xl font-semibold tabular-nums'>{value}</p></CardContent></Card>)}</div>

    <Tabs defaultValue='installed' className='space-y-4'><TabsList><TabsTrigger value='installed'>Installed</TabsTrigger><TabsTrigger value='discover'>Discover</TabsTrigger><TabsTrigger value='create'>Create skill</TabsTrigger></TabsList>
      <TabsContent value='installed' className='space-y-4'><div className='flex max-w-xl items-center gap-2'><Search className='size-4 text-muted-foreground' /><Input value={search} placeholder='Cari nama, slug, atau deskripsi' onChange={(event) => { setSearch(event.target.value); void refresh(event.target.value) }} /></div><div className='grid gap-4 lg:grid-cols-2'>{loading ? <p className='text-sm text-muted-foreground'>Memuat skill…</p> : skills.length === 0 ? <Card className='lg:col-span-2'><CardContent className='py-12 text-center'><WandSparkles className='mx-auto mb-3 size-8 text-muted-foreground' /><p className='font-medium'>Belum ada skill</p><p className='mt-1 text-sm text-muted-foreground'>Buat skill sendiri atau impor paket yang sudah divalidasi.</p></CardContent></Card> : skills.map((skill) => <SkillCard key={skill.id} skill={skill} working={working} onToggle={() => void run(async () => { await updateSkill(skill.id, { is_enabled: !skill.is_enabled }); toast.success(skill.is_enabled ? 'Skill dinonaktifkan.' : 'Skill diaktifkan.') })} onValidate={() => void run(async () => { const result = await validateSkill(skill.id); toast[result.valid ? 'success' : 'error'](result.valid ? 'Skill valid.' : result.error || 'Skill tidak valid.') })} onDelete={() => { if (window.confirm(`Hapus skill ${skill.name}?`)) void run(async () => { await deleteSkill(skill.id); toast.success('Skill dihapus.') }) }} />)}</div></TabsContent>
      <TabsContent value='discover' className='space-y-4'><Card><CardHeader><CardTitle>Import dari GitHub</CardTitle><CardDescription>Hanya repository publik HTTPS yang berisi manifest.json dan SKILL.md. Paket tidak dieksekusi.</CardDescription></CardHeader><CardContent className='flex max-w-2xl gap-2'><Input value={githubURL} onChange={(event) => setGithubURL(event.target.value)} placeholder='https://github.com/owner/repository' /><Button disabled={!githubURL.trim() || working} onClick={() => void run(async () => { await importSkillGithub(githubURL); setGithubURL(''); toast.success('Skill GitHub berhasil diimpor.') })}><GitBranch className='mr-2 size-4' />Import</Button></CardContent></Card></TabsContent>
      <TabsContent value='create' id='create-skill'><Card><CardHeader><CardTitle>Buat skill</CardTitle><CardDescription>Editor MVP menyimpan instruksi dan manifest tervalidasi. Tool harus berasal dari registry yang dikenal.</CardDescription></CardHeader><CardContent><form className='grid gap-4 lg:grid-cols-2' onSubmit={(event) => { event.preventDefault(); void run(async () => { await createSkill({ ...manifest, id: manifest.id.trim().toLowerCase(), name: manifest.name.trim(), description: manifest.description.trim(), author: manifest.author.trim() }, instructions); setManifest(emptyManifest); setInstructions(''); toast.success('Skill berhasil dibuat.') }) }}><div className='space-y-4'><div className='grid gap-2'><Label htmlFor='skill-id'>Slug / ID</Label><Input id='skill-id' required value={manifest.id} onChange={(event) => setField('id', event.target.value)} placeholder='coding-assistant' /></div><div className='grid gap-2'><Label htmlFor='skill-name'>Nama</Label><Input id='skill-name' required value={manifest.name} onChange={(event) => setField('name', event.target.value)} placeholder='Coding Assistant' /></div><div className='grid gap-2'><Label htmlFor='skill-version'>Versi</Label><Input id='skill-version' required value={manifest.version} onChange={(event) => setField('version', event.target.value)} /></div><div className='grid gap-2'><Label htmlFor='skill-author'>Author</Label><Input id='skill-author' value={manifest.author} onChange={(event) => setField('author', event.target.value)} placeholder='Nama atau organisasi' /></div><div className='grid gap-2'><Label htmlFor='skill-description'>Deskripsi</Label><Textarea id='skill-description' value={manifest.description} onChange={(event) => setField('description', event.target.value)} /></div></div><div className='space-y-4'><div className='grid gap-2'><Label htmlFor='skill-instructions'>SKILL.md</Label><Textarea id='skill-instructions' required className='min-h-72 font-mono text-sm' value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder='# Coding Assistant&#10;&#10;Instruksi operasional skill…' /></div><p className='text-xs text-muted-foreground'>Tool dan permission akan diperketat oleh backend pada fase berikutnya. Jangan memasukkan secret ke instruksi.</p><Button type='submit' disabled={working || !instructions.trim()}>{working ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Check className='mr-2 size-4' />}Simpan skill</Button></div></form></CardContent></Card></TabsContent>
    </Tabs>
  </Main>
}

function SkillCard({ skill, working, onToggle, onValidate, onDelete }: { skill: Skill; working: boolean; onToggle: () => void; onValidate: () => void; onDelete: () => void }) {
  return <Card className='gap-4 py-5'><CardHeader className='gap-2 px-5'><div className='flex items-start justify-between gap-3'><div><CardTitle className='text-base'>{skill.name}</CardTitle><CardDescription className='mt-1'>{skill.slug} · v{skill.current_version || '—'}</CardDescription></div><Badge variant={skill.is_enabled ? 'default' : 'secondary'}>{skill.is_enabled ? 'Enabled' : skill.status}</Badge></div><p className='text-sm text-muted-foreground'>{skill.description || 'Tidak ada deskripsi.'}</p></CardHeader><CardContent className='space-y-4 px-5'><div className='flex flex-wrap gap-1.5'>{skill.tools.length ? skill.tools.map((tool) => <Badge key={tool} variant='outline'>{tool}</Badge>) : <span className='text-xs text-muted-foreground'>Tidak meminta tool</span>}</div>{skill.validation_status === 'error' && <p className='text-sm text-destructive'>{skill.validation_error}</p>}<div className='flex flex-wrap gap-2 border-t pt-3'><Button size='sm' variant={skill.is_enabled ? 'outline' : 'default'} disabled={working} onClick={onToggle}>{skill.is_enabled ? 'Disable' : 'Enable'}</Button><Button size='sm' variant='ghost' disabled={working} onClick={onValidate}>Validate</Button><Button size='sm' variant='ghost' className='text-destructive' disabled={working} onClick={onDelete}><Trash2 className='mr-1.5 size-4' />Hapus</Button><span className='ml-auto flex items-center gap-1 text-xs text-muted-foreground'><FileArchive className='size-3.5' />{skill.source}</span></div></CardContent></Card>
}
