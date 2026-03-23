import { useEffect, useRef, useState } from 'react'
import { Paperclip, SendHorizontal, Square, X } from 'lucide-react'
import { autoSizeTextarea } from '../../utils/textareaAutoSize'
import type { ImageAttachmentInput } from '../../types/attachment'
import { Button } from '../ui/Button'
import styles from './InputArea.module.css'

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/tiff', 'image/bmp'])

interface SendMessageInput {
  text: string
  attachments?: ImageAttachmentInput[]
}

interface SelectedAttachment extends ImageAttachmentInput {
  id: string
  size: number
}

interface InputAreaProps {
  disabled?: boolean
  isLoading: boolean
  onSend: (input: SendMessageInput) => void
  onStop?: () => void
}

export function InputArea({ disabled = false, isLoading, onSend, onStop }: InputAreaProps) {
  const [text, setText] = useState('')
  const [attachment, setAttachment] = useState<SelectedAttachment | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (textareaRef.current) {
      autoSizeTextarea(textareaRef.current)
    }
  }, [text])

  const submit = () => {
    const nextText = text.trim()

    if (!nextText || disabled || isLoading) {
      return
    }

    onSend({
      text: nextText,
      attachments: attachment
        ? [
            {
              mimeType: attachment.mimeType,
              fileName: attachment.fileName,
              base64: attachment.base64,
            },
          ]
        : [],
    })
    setText('')
    setAttachment(null)
    setAttachmentError(null)
  }

  const handleStop = () => {
    if (disabled || !isLoading) {
      return
    }

    onStop?.()
  }

  const handleFilePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setAttachmentError('Поддерживаются только JPG, PNG, TIFF и BMP.')
      return
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setAttachmentError('Максимальный размер изображения — 15 МБ.')
      return
    }

    try {
      const base64 = await convertFileToBase64(file)
      setAttachment({
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        fileName: file.name,
        mimeType: file.type as ImageAttachmentInput['mimeType'],
        base64,
        size: file.size,
      })
      setAttachmentError(null)
    } catch {
      setAttachmentError('Не удалось прочитать изображение.')
    }
  }

  const removeAttachment = () => {
    if (disabled || isLoading) {
      return
    }

    setAttachment(null)
    setAttachmentError(null)
  }

  const isSubmitDisabled = disabled || isLoading || !text.trim()
  const isInputDisabled = disabled || isLoading

  return (
    <form
      className={styles.area}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <Button
        variant="ghost"
        iconOnly
        icon={<Paperclip size={16} />}
        className={`${styles.actionBtn} ${styles.attachButton}`}
        disabled={isInputDisabled}
        aria-label="Прикрепить файл"
        type="button"
        onClick={() => fileInputRef.current?.click()}
      />
      <input
        ref={fileInputRef}
        className={styles.hiddenFileInput}
        type="file"
        accept="image/jpeg,image/png,image/tiff,image/bmp"
        aria-label="Выбрать изображение"
        onChange={handleFilePick}
        disabled={isInputDisabled}
      />

      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        disabled={isInputDisabled}
        placeholder="Напишите сообщение..."
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
      />

      {isLoading ? (
        <Button
          variant="secondary"
          icon={<Square size={14} />}
          className={`${styles.actionBtn} ${styles.submitButton}`}
          aria-label="Остановить генерацию"
          disabled={disabled}
          type="button"
          onClick={handleStop}
        >
          Стоп
        </Button>
      ) : (
        <Button
          iconOnly
          icon={<SendHorizontal size={16} />}
          className={`${styles.actionBtn} ${styles.submitButton}`}
          aria-label="Отправить сообщение"
          disabled={isSubmitDisabled}
          type="submit"
        />
      )}

      {attachment ? (
        <div className={styles.attachment} role="status" aria-live="polite">
          <span className={styles.attachmentName}>
            {attachment.fileName} ({formatBytes(attachment.size)})
          </span>
          <Button
            variant="ghost"
            iconOnly
            type="button"
            icon={<X size={14} />}
            aria-label="Удалить вложение"
            className={styles.removeAttachmentBtn}
            disabled={isInputDisabled}
            onClick={removeAttachment}
          />
        </div>
      ) : null}

      {attachmentError ? (
        <p className={styles.attachmentError} role="alert">
          {attachmentError}
        </p>
      ) : null}
    </form>
  )
}

async function convertFileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function formatBytes(size: number): string {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} КБ`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} МБ`
}
