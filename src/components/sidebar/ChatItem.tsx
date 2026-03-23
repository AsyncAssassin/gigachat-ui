import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { Chat } from '../../types/chat'
import { formatDateLabel } from '../../utils/formatDateLabel'
import { Button } from '../ui/Button'
import styles from './ChatItem.module.css'

interface ChatItemProps {
  chat: Chat
  isActive: boolean
  onSelect: (chatId: string) => void
  onEdit: (chatId: string, title: string) => void
  onDelete: (chatId: string) => void
}

export function ChatItem({
  chat,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: ChatItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(chat.title)
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isEditing) {
      return
    }

    const input = titleInputRef.current
    if (input) {
      input.focus()
      input.select()
    }
  }, [isEditing])

  const saveTitle = () => {
    const nextTitle = draftTitle.trim().replace(/\s+/g, ' ').slice(0, 80)
    setIsEditing(false)

    if (!nextTitle) {
      setDraftTitle(chat.title)
      return
    }

    if (nextTitle !== chat.title) {
      onEdit(chat.id, nextTitle)
    }
  }

  const cancelEdit = () => {
    setDraftTitle(chat.title)
    setIsEditing(false)
  }

  return (
    <div
      className={styles.item}
      data-active={isActive}
      data-editing={isEditing}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (isEditing) {
          return
        }

        onSelect(chat.id)
      }}
      onKeyDown={(event) => {
        if (isEditing) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(chat.id)
        }
      }}
    >
      <div className={styles.main}>
        {isEditing ? (
          <input
            ref={titleInputRef}
            className={styles.titleInput}
            value={draftTitle}
            maxLength={80}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                saveTitle()
              }

              if (event.key === 'Escape') {
                event.preventDefault()
                cancelEdit()
              }
            }}
          />
        ) : (
          <strong className={styles.title}>{chat.title}</strong>
        )}
        <div className={styles.metaRight}>
          <span className={styles.date}>{formatDateLabel(chat.lastMessageAt)}</span>

          <div className={styles.actions}>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={<Pencil size={14} />}
              aria-label="Переименовать чат"
              onClick={(event) => {
                event.stopPropagation()
                setDraftTitle(chat.title)
                setIsEditing(true)
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
      </div>

      <p className={styles.preview}>{chat.lastMessage}</p>
    </div>
  )
}
