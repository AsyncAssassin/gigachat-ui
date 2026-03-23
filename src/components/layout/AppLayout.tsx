import { Menu } from 'lucide-react'
import type { Chat } from '../../types/chat'
import type { Message } from '../../types/message'
import { ChatWindow } from '../chat/ChatWindow'
import { Sidebar } from '../sidebar/Sidebar'
import { Button } from '../ui/Button'
import styles from './AppLayout.module.css'

interface AppLayoutProps {
  chats: Chat[]
  activeChatId: string | null
  activeChat: Chat | null
  messagesByChat: Record<string, Message[]>
  isSidebarOpen: boolean
  onOpenSidebar: () => void
  onCloseSidebar: () => void
  onSelectChat: (chatId: string) => void
  onCreateChat: () => void
  onEditChat: (chatId: string, title: string) => void
  onDeleteChat: (chatId: string) => void
  onOpenSettings: () => void
}

export function AppLayout({
  chats,
  activeChatId,
  activeChat,
  messagesByChat,
  isSidebarOpen,
  onOpenSidebar,
  onCloseSidebar,
  onSelectChat,
  onCreateChat,
  onEditChat,
  onDeleteChat,
  onOpenSettings,
}: AppLayoutProps) {
  return (
    <main className={styles.layout}>
      <div className={styles.mobileTopbar}>
        <Button
          variant="secondary"
          iconOnly
          icon={<Menu size={16} />}
          aria-label="Открыть меню"
          onClick={onOpenSidebar}
        />
        <strong>GigaChat UI</strong>
      </div>

      <div className={styles.shell}>
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          messagesByChat={messagesByChat}
          isMobileOpen={isSidebarOpen}
          onCloseMobile={onCloseSidebar}
          onSelectChat={onSelectChat}
          onCreateChat={onCreateChat}
          onEditChat={onEditChat}
          onDeleteChat={onDeleteChat}
        />

        <ChatWindow
          chat={activeChat}
          onOpenSettings={onOpenSettings}
          onCreateChat={onCreateChat}
        />
      </div>
    </main>
  )
}
