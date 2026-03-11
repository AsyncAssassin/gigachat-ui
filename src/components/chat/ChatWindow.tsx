import { Settings } from 'lucide-react'
import type { Chat, Message as MessageType } from '../../types/chat'
import { Button } from '../ui/Button'
import { EmptyState } from './EmptyState'
import { InputArea } from './InputArea'
import { MessageList } from './MessageList'
import styles from './ChatWindow.module.css'

interface ChatWindowProps {
  chat: Chat | null
  messages: MessageType[]
  isTyping: boolean
  onOpenSettings: () => void
  onSendMessage: (text: string) => void
}

export function ChatWindow({
  chat,
  messages,
  isTyping,
  onOpenSettings,
  onSendMessage,
}: ChatWindowProps) {
  return (
    <section className={styles.window}>
      <header className={styles.header}>
        <div>
          <h2>{chat?.title ?? 'Чат не выбран'}</h2>
          <p>{chat ? `${messages.length} сообщений` : 'Выберите чат или создайте новый'}</p>
        </div>

        <Button
          variant="secondary"
          icon={<Settings size={16} />}
          onClick={onOpenSettings}
        >
          Настройки
        </Button>
      </header>

      <div className={styles.body}>
        {chat ? (
          messages.length > 0 ? (
            <MessageList messages={messages} isTyping={isTyping} />
          ) : (
            <EmptyState />
          )
        ) : (
          <EmptyState />
        )}
      </div>

      <InputArea disabled={!chat} onSend={onSendMessage} onStop={() => undefined} />
    </section>
  )
}
