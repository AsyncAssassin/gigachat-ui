import { useEffect, useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import { createGigaChatCompletion, extractAssistantTextFromCompletion } from '../../api/gigachat'
import type { Chat } from '../../types/chat'
import type { Message } from '../../types/message'
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

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function ChatWindow({ chat, onOpenSettings }: ChatWindowProps) {
  const abortByChatRef = useRef<Record<string, AbortController>>({})
  const [error, setError] = useState<string | null>(null)

  const activeChatId = chat?.id ?? null
  const messages = useChatStore(selectMessagesForChat(activeChatId))
  const isLoading = useChatStore(selectLoadingForChat(activeChatId))
  const settings = useChatStore((state) => state.settings)

  const addMessage = useChatStore((state) => state.addMessage)
  const setChatLoading = useChatStore((state) => state.setChatLoading)
  const updateChatPreview = useChatStore((state) => state.updateChatPreview)

  useEffect(() => {
    const abortStore = abortByChatRef

    return () => {
      const pendingControllers = Object.values(abortStore.current)
      for (const controller of pendingControllers) {
        controller.abort()
      }
    }
  }, [])

  useEffect(() => {
    setError(null)
  }, [activeChatId])

  const handleSendMessage = async (text: string) => {
    if (!activeChatId || isLoading) {
      return
    }

    const currentChatId = activeChatId
    const existingMessages = [...messages]
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    addMessage(currentChatId, userMessage)
    updateChatPreview(currentChatId, userMessage.content, userMessage.timestamp)
    setChatLoading(currentChatId, true)
    setError(null)

    const existingController = abortByChatRef.current[currentChatId]
    if (existingController) {
      existingController.abort()
    }

    const controller = new AbortController()
    abortByChatRef.current[currentChatId] = controller

    try {
      const completionPayload = await createGigaChatCompletion(
        {
          model: settings.model,
          messages: [
            {
              role: 'system',
              content: settings.systemPrompt,
            },
            ...existingMessages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
            {
              role: userMessage.role,
              content: userMessage.content,
            },
          ],
          temperature: settings.temperature,
          top_p: settings.topP,
          max_tokens: settings.maxTokens,
          repetition_penalty: settings.repetitionPenalty,
          stream: false,
        },
        controller.signal,
      )

      const assistantContent =
        extractAssistantTextFromCompletion(completionPayload) ||
        'GigaChat не вернул текст ответа.'
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      }

      addMessage(currentChatId, assistantMessage)
      updateChatPreview(currentChatId, assistantMessage.content, assistantMessage.timestamp)
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') {
        return
      }

      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Не удалось получить ответ от GigaChat'
      setError(message)
    } finally {
      delete abortByChatRef.current[currentChatId]
      setChatLoading(currentChatId, false)
    }
  }

  const handleStopGeneration = () => {
    if (!activeChatId) {
      return
    }

    const controller = abortByChatRef.current[activeChatId]
    if (controller) {
      controller.abort()
      delete abortByChatRef.current[activeChatId]
    }

    setChatLoading(activeChatId, false)
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
        <ErrorMessage message={error} />
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
