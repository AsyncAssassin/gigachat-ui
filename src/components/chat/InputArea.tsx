import { useEffect, useRef, useState } from 'react'
import { Paperclip, SendHorizontal, Square } from 'lucide-react'
import { autoSizeTextarea } from '../../utils/textareaAutoSize'
import { Button } from '../ui/Button'
import styles from './InputArea.module.css'

interface InputAreaProps {
  disabled?: boolean
  onSend: (text: string) => void
  onStop: () => void
}

export function InputArea({ disabled = false, onSend, onStop }: InputAreaProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (textareaRef.current) {
      autoSizeTextarea(textareaRef.current)
    }
  }, [text])

  const submit = () => {
    const nextText = text.trim()
    if (!nextText || disabled) return
    onSend(nextText)
    setText('')
  }

  return (
    <div className={styles.area}>
      <Button
        variant="ghost"
        iconOnly
        icon={<Paperclip size={16} />}
        disabled={disabled}
        aria-label="Прикрепить файл"
      />

      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        disabled={disabled}
        placeholder="Напишите сообщение..."
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
      />

      <Button
        variant="secondary"
        iconOnly
        icon={<Square size={14} />}
        aria-label="Остановить ответ"
        disabled
        onClick={onStop}
      />

      <Button
        iconOnly
        icon={<SendHorizontal size={16} />}
        aria-label="Отправить сообщение"
        disabled={disabled || !text.trim()}
        onClick={submit}
      />
    </div>
  )
}
