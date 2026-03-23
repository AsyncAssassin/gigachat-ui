import { Settings } from 'lucide-react'
import { useChatSession } from '../../hooks/useChatSession'
import type { Chat } from '../../types/chat'
import {
  selectLoadingForChat,
  selectMessagesForChat,
  useChatStore,
} from '../../store/chatStore'
import { Button } from '../ui/Button'
import { ErrorMessage } from '../ui/ErrorMessage'
import { EmptyState } from './EmptyState'
import { InputArea } from './InputArea'
import { MessageList } from './MessageList'
import styles from './ChatWindow.module.css'

interface ChatWindowProps {
  chat: Chat | null
  onOpenSettings: () => void
}

export function ChatWindow({ chat, onOpenSettings }: ChatWindowProps) {
  const activeChatId = chat?.id ?? null
  const messages = useChatStore(selectMessagesForChat(activeChatId))
  const isLoading = useChatStore(selectLoadingForChat(activeChatId))
  const chatSession = useChatSession({
    activeChatId,
    messages,
    isLoading,
  })

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
            <MessageList messages={messages} isTyping={isLoading} />
          ) : (
            <EmptyState />
          )
        ) : (
          <EmptyState />
        )}
      </div>

      <div className={styles.footer}>
        <ErrorMessage message={chatSession.error} />
        <InputArea
          disabled={!chat}
          isLoading={isLoading}
          onSend={chatSession.sendMessage}
          onStop={chatSession.stopGeneration}
        />
      </div>
    </section>
  )
}
