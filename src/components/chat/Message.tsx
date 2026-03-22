import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message as MessageType } from '../../types/message'
import { Button } from '../ui/Button'
import styles from './Message.module.css'

type MessageVariant = 'user' | 'assistant'

interface MessageProps {
  message: MessageType
  variant?: MessageVariant
}

export function Message({ message, variant }: MessageProps) {
  const resolvedVariant: MessageVariant = variant ?? message.role
  const isUser = resolvedVariant === 'user'
  const [isCopied, setIsCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current)
      }
    }
  }, [])

  const handleCopy = async () => {
    if (isUser) {
      return
    }

    try {
      await navigator.clipboard.writeText(message.content)
      setIsCopied(true)

      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current)
      }

      copiedTimerRef.current = setTimeout(() => {
        setIsCopied(false)
        copiedTimerRef.current = null
      }, 2000)
    } catch {
      // Ignore clipboard errors in unsupported environments.
    }
  }

  return (
    <article className={styles.row} data-role={resolvedVariant}>
      {!isUser ? <div className={styles.avatar}>🤖</div> : null}

      <div className={styles.bubble}>
        <div className={styles.meta}>
          <strong>{isUser ? 'Вы' : 'Ассистент'}</strong>
          <span>{new Date(message.timestamp).toLocaleTimeString('ru-RU')}</span>
        </div>

        <div className={styles.markdown}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>

        {!isUser ? (
          <Button
            variant={isCopied ? 'secondary' : 'ghost'}
            size="sm"
            icon={isCopied ? <Check size={14} /> : <Copy size={14} />}
            className={styles.copyBtn}
            onClick={handleCopy}
          >
            {isCopied ? 'Скопировано' : 'Копировать'}
          </Button>
        ) : null}
      </div>
    </article>
  )
}
