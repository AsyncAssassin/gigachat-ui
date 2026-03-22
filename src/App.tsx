import { useEffect, useMemo, useState } from 'react'
import { AuthForm } from './components/auth/AuthForm'
import { AppLayout } from './components/layout/AppLayout'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { mockChats } from './mocks/chats'
import { defaultSettings } from './mocks/settings'
import type { Chat } from './types/chat'
import type { ThemeMode } from './types/common'
import type { ChatSettings } from './types/settings'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [chats, setChats] = useState<Chat[]>(mockChats)
  const [activeChatId, setActiveChatId] = useState<string | null>(mockChats[0]?.id ?? null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
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
    setChats((prev) => {
      const nextChats = prev.filter((chat) => chat.id !== chatId)

      if (activeChatId === chatId) {
        setActiveChatId(nextChats[0]?.id ?? null)
      }

      return nextChats
    })
  }

  const handleEditChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, title: `${chat.title} (edited)` } : chat,
      ),
    )
  }

  const handleChatPreviewChange = (chatId: string, lastMessage: string, timestamp: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              lastMessage,
              lastMessageAt: timestamp,
            }
          : chat,
      ),
    )
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        onChatPreviewChange={handleChatPreviewChange}
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
