import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ImportError, importImage } from '../model/export'
import { useEditorStore } from '../model/store'
import type { Point } from '../model/types'

/** Reads image files and places them on the canvas, telling the user about any that fail. */
export function useImportImages() {
  const { t } = useTranslation()
  const store = useEditorStore()
  return useCallback(
    async (files: File[], point?: Point) => {
      let offset = 0
      for (const file of files) {
        try {
          const image = await importImage(file)
          const at = point ? { x: point.x + offset, y: point.y + offset } : undefined
          store.getState().placeImage({ name: file.name || 'Image', ...image }, at)
          offset += 24
        } catch (error) {
          const reason = error instanceof ImportError ? error.reason : 'read'
          toast.error(t(`designStudio.importError.${reason}`, { name: file.name }))
        }
      }
    },
    [store, t],
  )
}
