import { useMemo, useState } from 'react'
import { PanelLeftClose, Plus } from 'lucide-react'
import type { Chat } from '../../types/chat'
import { Button } from '../ui/Button'
import { ChatList } from './ChatList'
import { SearchInput } from './SearchInput'
import styles from './Sidebar.module.css'

interface SidebarProps {
  chats: Chat[]
  activeChatId: string | null
  isMobileOpen: boolean
  onCloseMobile: () => void
  onSelectChat: (chatId: string) => void
  onCreateChat: () => void
  onEditChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
}

export function Sidebar({
  chats,
  activeChatId,
  isMobileOpen,
  onCloseMobile,
  onSelectChat,
  onCreateChat,
  onEditChat,
  onDeleteChat,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredChats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return chats

    return chats.filter((chat) => chat.title.toLowerCase().includes(query))
  }, [chats, searchQuery])

  return (
    <div className={styles.root}>
      <div
        className={styles.overlay}
        data-open={isMobileOpen}
        onClick={onCloseMobile}
        aria-hidden={!isMobileOpen}
      />

      <aside className={styles.sidebar} data-open={isMobileOpen}>
        <div className={styles.header}>
          <Button icon={<Plus size={16} />} onClick={onCreateChat}>
            Новый чат
          </Button>
          <Button
            variant="ghost"
            iconOnly
            icon={<PanelLeftClose size={16} />}
            aria-label="Закрыть меню"
            className={styles.closeBtn}
            onClick={onCloseMobile}
          />
        </div>

        <SearchInput value={searchQuery} onChange={setSearchQuery} />

        <ChatList
          chats={filteredChats}
          activeChatId={activeChatId}
          onSelectChat={onSelectChat}
          onEditChat={onEditChat}
          onDeleteChat={onDeleteChat}
        />
      </aside>
    </div>
  )
}
