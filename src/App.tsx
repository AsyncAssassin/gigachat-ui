import { useEffect, useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { SettingsPanel } from './components/settings/SettingsPanel'
import type { ChatSettings } from './types/settings'
import { selectActiveChat, useChatStore } from './store/chatStore'

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const chats = useChatStore((state) => state.chats)
  const activeChatId = useChatStore((state) => state.activeChatId)
  const activeChat = useChatStore(selectActiveChat)
  const messagesByChat = useChatStore((state) => state.messagesByChat)
  const settings = useChatStore((state) => state.settings)

  const createChat = useChatStore((state) => state.createChat)
  const selectChat = useChatStore((state) => state.selectChat)
  const renameChat = useChatStore((state) => state.renameChat)
  const deleteChat = useChatStore((state) => state.deleteChat)
  const setSettings = useChatStore((state) => state.setSettings)
  const resetSettings = useChatStore((state) => state.resetSettings)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

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

  const handleCreateChat = () => {
    createChat()
    setIsSidebarOpen(false)
  }

  const handleDeleteChat = (chatId: string) => {
    deleteChat(chatId)
  }

  const handleEditChat = (chatId: string, title: string) => {
    renameChat(chatId, title)
  }

  const handleSaveSettings = (nextSettings: ChatSettings) => {
    setSettings(nextSettings)
    setIsSettingsOpen(false)
  }

  const handleResetSettings = (): ChatSettings => {
    return resetSettings()
  }

  return (
    <>
      <AppLayout
        chats={chats}
        activeChatId={activeChatId}
        activeChat={activeChat}
        messagesByChat={messagesByChat}
        isSidebarOpen={isSidebarOpen}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        onSelectChat={(chatId) => {
          selectChat(chatId)
          setIsSidebarOpen(false)
        }}
        onCreateChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
        onEditChat={handleEditChat}
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
