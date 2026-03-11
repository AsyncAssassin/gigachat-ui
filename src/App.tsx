import { useEffect, useMemo, useState } from 'react'
import { AuthForm } from './components/auth/AuthForm'
import { AppLayout } from './components/layout/AppLayout'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { mockChats } from './mocks/chats'
import { mockMessages } from './mocks/messages'
import { defaultSettings } from './mocks/settings'
import type { Chat, Message } from './types/chat'
import type { ThemeMode } from './types/common'
import type { ChatSettings } from './types/settings'

function createAssistantReply(prompt: string): string {
  return `Понял запрос: **${prompt.slice(0, 80)}**\n\nВот быстрый ответ:\n- я учёл контекст чата\n- сформировал короткий план\n- могу продолжить подробнее по пунктам`;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [chats, setChats] = useState<Chat[]>(mockChats)
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [activeChatId, setActiveChatId] = useState<string | null>(mockChats[0]?.id ?? null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [settings, setSettings] = useState<ChatSettings>(defaultSettings)
  const [theme, setTheme] = useState<ThemeMode>(defaultSettings.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const isOverlayOpen = isSidebarOpen || isSettingsOpen
    const previousOverflow = document.body.style.overflow
    const previousOverscrollBehavior = document.body.style.overscrollBehavior

    if (isOverlayOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.overscrollBehavior = 'none'
    } else {
      document.body.style.overflow = previousOverflow || ''
      document.body.style.overscrollBehavior = previousOverscrollBehavior || ''
    }

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscrollBehavior
    }
  }, [isSidebarOpen, isSettingsOpen])

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [chats, activeChatId],
  )

  const activeMessages = useMemo(
    () => messages.filter((message) => message.chatId === activeChatId),
    [messages, activeChatId],
  )

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleCreateChat = () => {
    const chatId = `chat-${crypto.randomUUID()}`
    const newChat: Chat = {
      id: chatId,
      title: 'Новый чат',
      lastMessage: 'Начните новый диалог',
      lastMessageAt: new Date().toISOString(),
    }

    setChats((prev) => [newChat, ...prev])
    setActiveChatId(chatId)
    setIsSidebarOpen(false)
  }

  const handleDeleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId))
    setMessages((prev) => prev.filter((message) => message.chatId !== chatId))

    if (activeChatId === chatId) {
      const nextChat = chats.find((chat) => chat.id !== chatId)
      setActiveChatId(nextChat?.id ?? null)
    }
  }

  const handleEditChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, title: `${chat.title} (edited)` } : chat,
      ),
    )
  }

  const handleSendMessage = (text: string) => {
    if (!activeChatId) return

    const userMessage: Message = {
      id: `msg-${crypto.randomUUID()}`,
      chatId: activeChatId,
      role: 'user',
      senderName: 'Вы',
      content: text,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              lastMessage: text,
              lastMessageAt: new Date().toISOString(),
            }
          : chat,
      ),
    )

    setIsTyping(true)
    window.setTimeout(() => {
      const answer = createAssistantReply(text)
      const assistantMessage: Message = {
        id: `msg-${crypto.randomUUID()}`,
        chatId: activeChatId,
        role: 'assistant',
        senderName: 'GigaChat',
        content: answer,
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                lastMessage: answer,
                lastMessageAt: new Date().toISOString(),
              }
            : chat,
        ),
      )
      setIsTyping(false)
    }, 900)
  }

  const handleSaveSettings = (nextSettings: ChatSettings) => {
    setSettings(nextSettings)
    setTheme(nextSettings.theme)
    setIsSettingsOpen(false)
  }

  const handleResetSettings = (): ChatSettings => {
    setSettings(defaultSettings)
    setTheme(defaultSettings.theme)
    return defaultSettings
  }

  if (!isAuthenticated) {
    return <AuthForm onLogin={handleLogin} />
  }

  return (
    <>
      <AppLayout
        chats={chats}
        activeChatId={activeChatId}
        activeChat={activeChat}
        messages={activeMessages}
        isTyping={isTyping}
        isSidebarOpen={isSidebarOpen}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        onSelectChat={(chatId) => {
          setActiveChatId(chatId)
          setIsSidebarOpen(false)
        }}
        onCreateChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
        onEditChat={handleEditChat}
        onSendMessage={handleSendMessage}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      {isSettingsOpen ? (
        <SettingsPanel
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
          onReset={handleResetSettings}
        />
      ) : null}
    </>
  )
}
