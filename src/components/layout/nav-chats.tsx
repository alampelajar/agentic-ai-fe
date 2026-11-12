import { useState } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { deleteTask, getTasks, updateTask, type BackendTask } from '@/features/tasks/data/api'
import { useAuthStore } from '@/stores/auth-store'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

export const CHAT_HISTORY_KEY = ['sidebar-chat-history']
const VISIBLE_LIMIT = 5
const PINS_STORAGE_KEY = 'chat-history-pins'

// Pin hanya disimpan di peramban ini (backend belum punya field pin).
function readPins(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PINS_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function writePins(pins: string[]) {
  try {
    localStorage.setItem(PINS_STORAGE_KEY, JSON.stringify(pins))
  } catch {
    // penyimpanan tidak tersedia: pin hanya berlaku selama sesi ini
  }
}

const byRecent = (a: BackendTask, b: BackendTask) =>
  +new Date(b.updated_at || b.created_at) - +new Date(a.updated_at || a.created_at)

/** Percakapan = task. Yang dipin di atas, lalu terbaru di atas. */
export function NavChats() {
  const { t } = useTranslation()
  const { setOpenMobile, state, isMobile } = useSidebar()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((s) => s.auth.accessToken)
  const href = useLocation({ select: (l) => l.href })
  const activeId = new URL(href, 'http://local').searchParams.get('task')?.replace(/^["']+|["']+$/g, '') ?? null
  const onChat = href.split('?')[0].replace(/\/$/, '') === '/ai'

  const [pins, setPins] = useState<string[]>(readPins)
  const [renaming, setRenaming] = useState<BackendTask | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [deleting, setDeleting] = useState<BackendTask | null>(null)
  const [showAll, setShowAll] = useState(false)

  const { data: chats = [], isError } = useQuery({
    queryKey: CHAT_HISTORY_KEY,
    queryFn: async () => (await getTasks()).sort(byRecent),
    enabled: !!accessToken,
    staleTime: 30_000,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: CHAT_HISTORY_KEY })

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => updateTask(id, { title }),
    onSuccess: () => {
      setRenaming(null)
      void refresh()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t('chatHistory.failed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: (_data, id) => {
      setDeleting(null)
      setPins((current) => {
        const next = current.filter((pin) => pin !== String(id))
        writePins(next)
        return next
      })
      void refresh()
      toast.success(t('chatHistory.deleted'))
      if (onChat && activeId === String(id)) void navigate({ to: '/ai' })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t('chatHistory.failed')),
  })

  const togglePin = (id: number) => {
    setPins((current) => {
      const key = String(id)
      const next = current.includes(key) ? current.filter((pin) => pin !== key) : [key, ...current]
      writePins(next)
      return next
    })
  }

  // Saat sidebar diciutkan jadi ikon, daftar judul tidak muat.
  if (state === 'collapsed' && !isMobile) return null

  const pinned = chats.filter((chat) => pins.includes(String(chat.id)))
  const rest = chats.filter((chat) => !pins.includes(String(chat.id)))
  // Yang dipin dulu, lalu terbaru; awalnya hanya 5 teratas yang ditampilkan.
  const ordered = [...pinned, ...rest]
  const visible = showAll ? ordered : ordered.slice(0, VISIBLE_LIMIT)

  const renderRow = (chat: BackendTask) => {
    const title = chat.title?.trim() || t('agentic.newChat')
    const isPinned = pins.includes(String(chat.id))
    return (
      <SidebarMenuItem key={chat.id}>
        <SidebarMenuButton
          asChild
          isActive={onChat && activeId === String(chat.id)}
          tooltip={title}
          // Two buttons (pin, options) sit on the right: always on phones, on hover from md up.
          // Keep room for both so a long title never runs under them, and nothing shifts on hover.
          className='group-has-data-[sidebar=menu-action]/menu-item:pe-14'
        >
          <Link to='/ai' search={{ task: String(chat.id) }} onClick={() => setOpenMobile(false)}>
            {isPinned ? <Pin /> : <MessageSquare />}
            <span className='truncate'>{title}</span>
          </Link>
        </SidebarMenuButton>
        {/* Tombol pin: terpisah dari tombol titik tiga. Di layar lebar muncul saat kursor di baris, di HP selalu tampil. */}
        <SidebarMenuAction
          showOnHover
          className='inset-e-7'
          aria-label={isPinned ? t('chatHistory.unpin') : t('chatHistory.pin')}
          title={isPinned ? t('chatHistory.unpin') : t('chatHistory.pin')}
          onClick={() => togglePin(chat.id)}
        >
          {isPinned ? <PinOff /> : <Pin />}
        </SidebarMenuAction>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover aria-label={t('chatHistory.options')}>
              <MoreHorizontal />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? 'bottom' : 'right'} align='start'>
            <DropdownMenuItem
              onSelect={() => {
                setDraftTitle(chat.title ?? '')
                setRenaming(chat)
              }}
            >
              <Pencil />
              {t('chatHistory.rename')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant='destructive' onSelect={() => setDeleting(chat)}>
              <Trash2 />
              {t('chatHistory.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    )
  }

  const trimmed = draftTitle.trim()

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>{t('chatHistory.title')}</SidebarGroupLabel>
        <SidebarMenu>
          {chats.length === 0 && (
            <li className='px-2 py-1 text-xs text-muted-foreground'>
              {isError ? t('chatHistory.error') : t('chatHistory.empty')}
            </li>
          )}
          {visible.map(renderRow)}
          {chats.length > VISIBLE_LIMIT && (
            <SidebarMenuItem>
              <SidebarMenuButton className='text-muted-foreground' onClick={() => setShowAll((v) => !v)}>
                <MoreHorizontal />
                <span>{showAll ? t('chatHistory.showLess') : t('chatHistory.showMore')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroup>

      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className='sm:max-w-sm'>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (renaming && trimmed) renameMutation.mutate({ id: renaming.id, title: trimmed.slice(0, 255) })
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('chatHistory.renameTitle')}</DialogTitle>
            </DialogHeader>
            <Input
              autoFocus
              className='my-4'
              value={draftTitle}
              maxLength={255}
              onChange={(event) => setDraftTitle(event.target.value)}
              aria-label={t('chatHistory.renameTitle')}
            />
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setRenaming(null)}>
                {t('chatHistory.cancel')}
              </Button>
              <Button type='submit' disabled={!trimmed || renameMutation.isPending}>
                {t('chatHistory.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('chatHistory.deleteTitle')}
        desc={t('chatHistory.deleteDesc', { title: deleting?.title?.trim() || t('agentic.newChat') })}
        confirmText={t('chatHistory.delete')}
        cancelBtnText={t('chatHistory.cancel')}
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </>
  )
}
