import { useEffect, useRef } from 'react'
import type { Message as MessageType } from '../../types/message'
import { Message } from './Message'
import { TypingIndicator } from './TypingIndicator'
import styles from './MessageList.module.css'

interface MessageListProps {
  messages: MessageType[]
  isTyping: boolean
}

export function MessageList({ messages, isTyping }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className={styles.list}>
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          variant={message.role === 'user' ? 'user' : 'assistant'}
        />
      ))}

      <TypingIndicator isVisible={isTyping} />
      <div ref={bottomRef} />
    </div>
  )
}
