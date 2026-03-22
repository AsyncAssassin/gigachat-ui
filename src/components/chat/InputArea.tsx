import { useEffect, useRef, useState } from 'react'
import { Paperclip, SendHorizontal, Square } from 'lucide-react'
import { autoSizeTextarea } from '../../utils/textareaAutoSize'
import { Button } from '../ui/Button'
import styles from './InputArea.module.css'

interface InputAreaProps {
  disabled?: boolean
  isLoading: boolean
  onSend: (text: string) => void
  onStop?: () => void
}

export function InputArea({ disabled = false, isLoading, onSend, onStop }: InputAreaProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

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

    onSend(nextText)
    setText('')
  }

  const handleStop = () => {
    if (disabled || !isLoading) {
      return
    }

    onStop?.()
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
        className={styles.actionBtn}
        disabled={isInputDisabled}
        aria-label="Прикрепить файл"
        type="button"
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
          className={styles.actionBtn}
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
          className={styles.actionBtn}
          aria-label="Отправить сообщение"
          disabled={isSubmitDisabled}
          type="submit"
        />
      )}
    </form>
  )
}
