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
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({})
  const [isLoadingByChat, setIsLoadingByChat] = useState<Record<string, boolean>>({})
  const timeoutByChatRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const activeChatId = chat?.id ?? null
  const messages = activeChatId ? messagesByChat[activeChatId] ?? [] : []
  const isLoading = activeChatId ? isLoadingByChat[activeChatId] ?? false : false

  useEffect(() => {
    const timeoutStore = timeoutByChatRef

    return () => {
      const pendingTimeouts = Object.values(timeoutStore.current)
      for (const timeoutId of pendingTimeouts) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  const handleSendMessage = (text: string) => {
    if (!activeChatId || isLoading) {
      return
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setMessagesByChat((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] ?? []), userMessage],
    }))
    onChatPreviewChange?.(activeChatId, userMessage.content, userMessage.timestamp)
    setIsLoadingByChat((prev) => ({
      ...prev,
      [activeChatId]: true,
    }))

    const delayMs = 1000 + Math.floor(Math.random() * 1000)

    const existingTimeout = timeoutByChatRef.current[activeChatId]
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    timeoutByChatRef.current[activeChatId] = setTimeout(() => {
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: createAssistantReply(text),
        timestamp: new Date().toISOString(),
      }

      setMessagesByChat((prev) => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] ?? []), assistantMessage],
      }))
      onChatPreviewChange?.(activeChatId, assistantMessage.content, assistantMessage.timestamp)
      setIsLoadingByChat((prev) => ({
        ...prev,
        [activeChatId]: false,
      }))
      delete timeoutByChatRef.current[activeChatId]
    }, delayMs)
  }

  const handleStopGeneration = () => {
    if (!activeChatId) {
      return
    }

    const activeTimeout = timeoutByChatRef.current[activeChatId]
    if (activeTimeout) {
      clearTimeout(activeTimeout)
      delete timeoutByChatRef.current[activeChatId]
    }

    setIsLoadingByChat((prev) => ({
      ...prev,
      [activeChatId]: false,
    }))
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
        <InputArea
          disabled={!chat}
          isLoading={isLoading}
          onSend={handleSendMessage}
          onStop={handleStopGeneration}
        />
      </div>
    </section>
  )
}
