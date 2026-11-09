import { useCallback, useEffect, useRef, useState } from 'react'
import type { StoreApi } from 'zustand'
import { DesignApiError, MAX_DOCUMENT_BYTES, saveDesignProject } from './data/api'
import type { EditorState } from './model/store'

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'offline' | 'conflict' | 'too-large'

const SAVE_DELAY_MS = 1200
const RETRY_DELAY_MS = 10000

export const draftKey = (id: number) => `design-studio-draft-${id}`

export type StoredDraft = { revision: number; name: string; document: unknown }

export function readDraft(id: number): StoredDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(id))
    return raw ? (JSON.parse(raw) as StoredDraft) : null
  } catch {
    return null
  }
}

function writeDraft(id: number, revision: number, name: string, serialized: string) {
  try {
    localStorage.setItem(draftKey(id), `{"revision":${revision},"name":${JSON.stringify(name)},"document":${serialized}}`)
  } catch {
    // Storage can be full or unavailable; the server copy is still the main one.
  }
}

export function clearDraft(id: number) {
  try {
    localStorage.removeItem(draftKey(id))
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}

/**
 * Saves the design shortly after each change, one request at a time. Every
 * change is also kept in this browser until the server has it, so a lost
 * connection or a closed tab does not lose work.
 */
export function useAutoSave(projectId: number, store: StoreApi<EditorState>, name: string, initialRevision: number, startDirty: boolean) {
  const [status, setStatus] = useState<SaveStatus>(startDirty ? 'unsaved' : 'saved')
  const revision = useRef(initialRevision)
  const nameRef = useRef(name)
  const savedDoc = useRef(startDirty ? null : store.getState().history.present)
  const savedName = useRef(name)
  const saving = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const blocked = useRef(false)
  const saveRef = useRef<() => Promise<void>>(async () => {})

  const save = useCallback(async () => {
    if (saving.current || blocked.current) return
    const doc = store.getState().history.present
    const currentName = nameRef.current.trim() || savedName.current
    if (doc === savedDoc.current && currentName === savedName.current) {
      setStatus('saved')
      return
    }
    // A drag in progress is not worth saving: its end triggers another save.
    if (store.getState().history.base) return
    const serialized = JSON.stringify(doc)
    writeDraft(projectId, revision.current, currentName, serialized)
    if (new Blob([serialized]).size > MAX_DOCUMENT_BYTES) {
      setStatus('too-large')
      return
    }
    saving.current = true
    setStatus('saving')
    try {
      revision.current = await saveDesignProject(projectId, { name: currentName, serialized, revision: revision.current })
      savedDoc.current = doc
      savedName.current = currentName
      if (store.getState().history.present === doc && nameRef.current.trim() === currentName) {
        clearDraft(projectId)
        setStatus('saved')
      } else {
        setStatus('unsaved')
        timer.current = window.setTimeout(() => void saveRef.current(), SAVE_DELAY_MS)
      }
    } catch (error) {
      if (error instanceof DesignApiError && error.status === 409) {
        blocked.current = true
        setStatus('conflict')
      } else if (error instanceof DesignApiError && error.status === 413) {
        setStatus('too-large')
      } else {
        setStatus('offline')
        timer.current = window.setTimeout(() => void saveRef.current(), RETRY_DELAY_MS)
      }
    } finally {
      saving.current = false
    }
  }, [projectId, store])

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const schedule = useCallback(() => {
    if (blocked.current) return
    setStatus('unsaved')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void save(), SAVE_DELAY_MS)
  }, [save])

  useEffect(() => {
    if (startDirty) schedule()
    return store.subscribe((state, previous) => {
      if (state.history.present !== previous.history.present || state.history.base !== previous.history.base) schedule()
    })
  }, [store, schedule, startDirty])

  useEffect(() => {
    nameRef.current = name
    if (name.trim() && name.trim() !== savedName.current) schedule()
  }, [name, schedule])

  // Offer a last chance to stay, and save what is pending when leaving the editor.
  const pending = useCallback(() => store.getState().history.present !== savedDoc.current || nameRef.current.trim() !== savedName.current, [store])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pending()) event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      window.clearTimeout(timer.current)
      if (pending() && !blocked.current) void save()
    }
  }, [pending, save])

  return { status, saveNow: save }
}
