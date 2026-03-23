import type { Chat } from '../../types/chat'
import { ChatItem } from './ChatItem'
import styles from './ChatList.module.css'

interface ChatListProps {
  chats: Chat[]
  activeChatId: string | null
  onSelectChat: (chatId: string) => void
  onEditChat: (chatId: string, title: string) => void
  onDeleteChat: (chatId: string) => void
}

export function ChatList({
  chats,
  activeChatId,
  onSelectChat,
  onEditChat,
  onDeleteChat,
}: ChatListProps) {
  return (
    <div className={styles.list}>
      {chats.map((chat) => (
        <ChatItem
          key={chat.id}
          chat={chat}
          isActive={chat.id === activeChatId}
          onSelect={onSelectChat}
          onEdit={onEditChat}
          onDelete={onDeleteChat}
        />
      ))}
    </div>
  )
}
