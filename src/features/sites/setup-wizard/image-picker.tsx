import { useId, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { removeImage, uploadImage, type SiteImage } from '../data/api'
import { siteErrorText } from '../errors'
import { OptionalMark } from './parts'

/** Logo and photos, uploaded at once so the planner and the agent can use them. */
export function ImagePicker({
  siteId,
  images,
  onChange,
  occasion,
}: {
  siteId: number
  images: SiteImage[]
  onChange: (images: SiteImage[]) => void
  occasion: boolean
}) {
  const { t } = useTranslation()
  const logoId = useId()
  const photosId = useId()
  const [uploading, setUploading] = useState<'logo' | 'photos' | null>(null)

  const upload = async (files: FileList | null, logo: boolean) => {
    if (!files || files.length === 0) return
    setUploading(logo ? 'logo' : 'photos')
    try {
      let current = images
      for (const file of Array.from(files))
        current = await uploadImage(siteId, file, logo)
      onChange(current)
    } catch (error) {
      toast.error(siteErrorText(t, error))
    } finally {
      setUploading(null)
    }
  }

  const remove = async (image: SiteImage) => {
    try {
      onChange(await removeImage(siteId, image.src))
    } catch (error) {
      toast.error(siteErrorText(t, error))
    }
  }

  const logo = images.find((image) => image.logo)
  const photos = images.filter((image) => !image.logo)

  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <div className='space-y-2'>
        <p className='text-sm font-medium'>
          {t('siteBuilder.wizard.logo')} <OptionalMark />
        </p>
        <p className='text-xs text-muted-foreground'>
          {t('siteBuilder.wizard.logoHelp')}
        </p>
        {logo ? (
          <ImageChip image={logo} onRemove={() => void remove(logo)} />
        ) : null}
        <UploadButton
          id={logoId}
          label={t('siteBuilder.wizard.chooseLogo')}
          busy={uploading === 'logo'}
          onFiles={(files) => void upload(files, true)}
        />
      </div>
      <div className='space-y-2'>
        <p className='text-sm font-medium'>
          {t('siteBuilder.wizard.photos')} <OptionalMark />
        </p>
        <p className='text-xs text-muted-foreground'>
          {occasion
            ? t('siteBuilder.wizard.photosHelpEvent')
            : t('siteBuilder.wizard.photosHelp')}
        </p>
        <div className='flex flex-wrap gap-2'>
          {photos.map((image) => (
            <ImageChip
              key={image.src}
              image={image}
              onRemove={() => void remove(image)}
            />
          ))}
        </div>
        <UploadButton
          id={photosId}
          label={t('siteBuilder.wizard.choosePhotos')}
          multiple
          busy={uploading === 'photos'}
          onFiles={(files) => void upload(files, false)}
        />
      </div>
    </div>
  )
}

function ImageChip({
  image,
  onRemove,
}: {
  image: SiteImage
  onRemove: () => void
}) {
  const { t } = useTranslation()
  return (
    <span className='inline-flex max-w-full items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs'>
      <span className='truncate'>{image.alt}</span>
      <button
        type='button'
        onClick={onRemove}
        aria-label={t('siteBuilder.wizard.removeImage', { name: image.alt })}
        className='rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
      >
        <X className='size-3' />
      </button>
    </span>
  )
}

function UploadButton({
  id,
  label,
  multiple,
  busy,
  onFiles,
}: {
  id: string
  label: string
  multiple?: boolean
  busy: boolean
  onFiles: (files: FileList | null) => void
}) {
  const { t } = useTranslation()
  return (
    <div>
      <input
        id={id}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        multiple={multiple}
        className='peer sr-only'
        disabled={busy}
        onChange={(event) => {
          onFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <label
        htmlFor={id}
        className='inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring hover:bg-accent'
      >
        {busy ? (
          <Loader2 className='size-4 animate-spin' />
        ) : (
          <ImagePlus className='size-4' />
        )}
        {busy ? t('siteBuilder.wizard.uploading') : label}
      </label>
    </div>
  )
}
