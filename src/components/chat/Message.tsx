import { Copy } from 'lucide-react'
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
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

        <Button
          variant="ghost"
          size="sm"
          icon={<Copy size={14} />}
          className={styles.copyBtn}
          onClick={handleCopy}
        >
          Копировать
        </Button>
      </div>
    </article>
  )
}
