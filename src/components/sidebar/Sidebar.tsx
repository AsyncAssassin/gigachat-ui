import { useMemo, useState } from 'react'
import { PanelLeftClose, Plus } from 'lucide-react'
import type { Chat } from '../../types/chat'
import type { Message } from '../../types/message'
import { Button } from '../ui/Button'
import { ChatList } from './ChatList'
import { SearchInput } from './SearchInput'
import styles from './Sidebar.module.css'

interface SidebarProps {
  chats: Chat[]
  activeChatId: string | null
  messagesByChat: Record<string, Message[]>
  isMobileOpen: boolean
  onCloseMobile: () => void
  onSelectChat: (chatId: string) => void
  onCreateChat: () => void
  onEditChat: (chatId: string, title: string) => void
  onDeleteChat: (chatId: string) => void
}

export function Sidebar({
  chats,
  activeChatId,
  messagesByChat,
  isMobileOpen,
  onCloseMobile,
  onSelectChat,
  onCreateChat,
  onEditChat,
  onDeleteChat,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState<string | null>(null)

  const pendingDeleteChat = pendingDeleteChatId
    ? chats.find((chat) => chat.id === pendingDeleteChatId) ?? null
    : null

  const filteredChats = useMemo(() => {
    const query = normalizeSearch(searchQuery)
    if (!query) {
      return chats
    }

    return chats.filter((chat) => {
      if (normalizeSearch(chat.title).includes(query)) {
        return true
      }

      const messages = messagesByChat[chat.id] ?? []
      return messages.some((message) => normalizeSearch(message.content).includes(query))
    })
  }, [chats, messagesByChat, searchQuery])

  const hasChats = chats.length > 0
  const hasSearchQuery = normalizeSearch(searchQuery).length > 0

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
          onDeleteChat={(chatId) => setPendingDeleteChatId(chatId)}
        />

        {!hasChats ? <p className={styles.emptySearch}>Чатов пока нет</p> : null}
        {hasChats && filteredChats.length === 0 && hasSearchQuery ? (
          <p className={styles.emptySearch}>Ничего не найдено</p>
        ) : null}
      </aside>

      {pendingDeleteChat ? (
        <div className={styles.dialogOverlay} role="presentation">
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-chat-title"
          >
            <h3 id="delete-chat-title">Удалить чат?</h3>
            <p>
              Чат "{pendingDeleteChat.title}" будет удалён без возможности восстановления.
            </p>
            <div className={styles.dialogActions}>
              <Button
                variant="secondary"
                onClick={() => {
                  setPendingDeleteChatId(null)
                }}
              >
                Отмена
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  onDeleteChat(pendingDeleteChat.id)
                  setPendingDeleteChatId(null)
                }}
              >
                Удалить
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function normalizeSearch(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ')
}
