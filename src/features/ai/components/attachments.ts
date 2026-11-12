/**
 * What a chat message can carry. Images go to the model as images; documents are read as text by
 * the backend (handlers/chat_files.go), so they work with every model. Keep both lists in step.
 */
export const MAX_ATTACHMENTS = 5
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']

const DOCUMENT_EXTENSIONS = [
  '.pdf', '.docx',
  '.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.log',
  '.html', '.htm', '.css', '.scss', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.go', '.py', '.java', '.kt',
  '.c', '.h', '.cpp', '.hpp', '.cs', '.rs', '.rb', '.php', '.swift', '.dart', '.sql', '.sh', '.bat',
  '.ps1', '.vue', '.svelte',
]

/** The file picker's accept list: the images and documents above. */
export const ATTACHMENT_ACCEPT = [...IMAGE_TYPES, ...DOCUMENT_EXTENSIONS].join(',')

export const isImageAttachment = (file: File) => IMAGE_TYPES.includes(file.type)

const extension = (name: string) => {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot).toLowerCase()
}

export type AttachmentCheck = 'ok' | 'unsupported' | 'tooLarge'

export function checkAttachment(file: File): AttachmentCheck {
  if (!isImageAttachment(file) && !DOCUMENT_EXTENSIONS.includes(extension(file.name))) return 'unsupported'
  if (file.size > MAX_ATTACHMENT_BYTES) return 'tooLarge'
  return 'ok'
}
