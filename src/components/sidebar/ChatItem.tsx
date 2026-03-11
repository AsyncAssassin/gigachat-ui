import { Pencil, Trash2 } from 'lucide-react'
import type { Chat } from '../../types/chat'
import { formatDateLabel } from '../../utils/formatDateLabel'
import { Button } from '../ui/Button'
import styles from './ChatItem.module.css'

interface ChatItemProps {
  chat: Chat
  isActive: boolean
  onSelect: (chatId: string) => void
  onEdit: (chatId: string) => void
  onDelete: (chatId: string) => void
}

export function ChatItem({
  chat,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: ChatItemProps) {
  return (
    <div
      className={styles.item}
      data-active={isActive}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(chat.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(chat.id)
        }
      }}
    >
      <div className={styles.main}>
        <strong className={styles.title}>{chat.title}</strong>
        <span className={styles.date}>{formatDateLabel(chat.lastMessageAt)}</span>
      </div>

      <p className={styles.preview}>{chat.lastMessage}</p>

      <div className={styles.actions}>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={<Pencil size={14} />}
          aria-label="Переименовать чат"
          onClick={(event) => {
            event.stopPropagation()
            onEdit(chat.id)
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={<Trash2 size={14} />}
          aria-label="Удалить чат"
          onClick={(event) => {
            event.stopPropagation()
            onDelete(chat.id)
          }}
        />
      </div>
    </div>
  )
}
