import { useEffect, useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import type { Chat } from '../../types/chat'
import type { Message } from '../../types/message'
import { Button } from '../ui/Button'
import { EmptyState } from './EmptyState'
import { InputArea } from './InputArea'
import { MessageList } from './MessageList'
import styles from './ChatWindow.module.css'

interface ChatWindowProps {
  chat: Chat | null
  onOpenSettings: () => void
  onChatPreviewChange?: (chatId: string, lastMessage: string, timestamp: string) => void
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function createAssistantReply(prompt: string): string {
  return [
    `Принял: "${prompt.slice(0, 80)}"`,
    'Сделал быстрый ответ в учебном режиме.',
    'Если нужно, могу продолжить подробнее по пунктам.',
  ].join('\n')
}

export function ChatWindow({ chat, onOpenSettings, onChatPreviewChange }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleSendMessage = (text: string) => {
    if (!chat || isLoading) {
      return
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    onChatPreviewChange?.(chat.id, userMessage.content, userMessage.timestamp)
    setIsLoading(true)

    const delayMs = 1000 + Math.floor(Math.random() * 1000)

    timeoutRef.current = setTimeout(() => {
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: createAssistantReply(text),
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      onChatPreviewChange?.(chat.id, assistantMessage.content, assistantMessage.timestamp)
      setIsLoading(false)
      timeoutRef.current = null
    }, delayMs)
  }

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
        <InputArea disabled={!chat} isLoading={isLoading} onSend={handleSendMessage} />
      </div>
    </section>
  )
}
