export type MessageRole = 'user' | 'assistant'

export interface Chat {
  id: string
  title: string
  lastMessage: string
  lastMessageAt: string
}

export interface Message {
  id: string
  chatId: string
  role: MessageRole
  senderName: string
  content: string
  createdAt: string
}
