import { create } from 'zustand'
import { mockChats } from '../mocks/chats'
import { defaultSettings } from '../mocks/settings'
import type { Chat } from '../types/chat'
import type { Message } from '../types/message'
import type { ChatSettings } from '../types/settings'

interface ChatState {
  chats: Chat[]
  activeChatId: string | null
  settings: ChatSettings
  messagesByChat: Record<string, Message[]>
  isLoadingByChat: Record<string, boolean>
}

interface ChatActions {
  createChat: () => string
  selectChat: (chatId: string | null) => void
  renameChat: (chatId: string, title?: string) => void
  deleteChat: (chatId: string) => void
  updateChatPreview: (chatId: string, lastMessage: string, timestamp: string) => void
  addMessage: (chatId: string, message: Message) => void
  updateMessage: (
    chatId: string,
    messageId: string,
    updater: (message: Message) => Message,
  ) => void
  setChatLoading: (chatId: string, isLoading: boolean) => void
  setSettings: (settings: ChatSettings) => void
  resetSettings: () => ChatSettings
  resetChatState: () => void
}

export type ChatStore = ChatState & ChatActions

const EMPTY_MESSAGES: Message[] = []

function cloneChats(chats: Chat[]): Chat[] {
  return chats.map((chat) => ({ ...chat }))
}

function getInitialState(): ChatState {
  return {
    chats: cloneChats(mockChats),
    activeChatId: mockChats[0]?.id ?? null,
    settings: { ...defaultSettings },
    messagesByChat: {},
    isLoadingByChat: {},
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useChatStore = create<ChatStore>((set) => ({
  ...getInitialState(),

  createChat: () => {
    const chatId = `chat-${generateId()}`
    const newChat: Chat = {
      id: chatId,
      title: 'Новый чат',
      lastMessage: 'Начните новый диалог',
      lastMessageAt: new Date().toISOString(),
    }

    set((state) => ({
      ...state,
      chats: [newChat, ...state.chats],
      activeChatId: chatId,
    }))

    return chatId
  },

  selectChat: (chatId) => {
    set((state) => ({
      ...state,
      activeChatId: chatId,
    }))
  },

  renameChat: (chatId, title) => {
    set((state) => ({
      ...state,
      chats: state.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              title: title?.trim() || `${chat.title} (edited)`,
            }
          : chat,
      ),
    }))
  },

  deleteChat: (chatId) => {
    set((state) => {
      const nextChats = state.chats.filter((chat) => chat.id !== chatId)
      const nextMessagesByChat = { ...state.messagesByChat }
      const nextIsLoadingByChat = { ...state.isLoadingByChat }

      delete nextMessagesByChat[chatId]
      delete nextIsLoadingByChat[chatId]

      return {
        ...state,
        chats: nextChats,
        activeChatId:
          state.activeChatId === chatId
            ? (nextChats[0]?.id ?? null)
            : state.activeChatId,
        messagesByChat: nextMessagesByChat,
        isLoadingByChat: nextIsLoadingByChat,
      }
    })
  },

  updateChatPreview: (chatId, lastMessage, timestamp) => {
    set((state) => ({
      ...state,
      chats: state.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              lastMessage,
              lastMessageAt: timestamp,
            }
          : chat,
      ),
    }))
  },

  addMessage: (chatId, message) => {
    set((state) => ({
      ...state,
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: [...(state.messagesByChat[chatId] ?? []), message],
      },
    }))
  },

  updateMessage: (chatId, messageId, updater) => {
    set((state) => ({
      ...state,
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: (state.messagesByChat[chatId] ?? []).map((message) =>
          message.id === messageId ? updater(message) : message,
        ),
      },
    }))
  },

  setChatLoading: (chatId, isLoading) => {
    set((state) => ({
      ...state,
      isLoadingByChat: {
        ...state.isLoadingByChat,
        [chatId]: isLoading,
      },
    }))
  },

  setSettings: (settings) => {
    set((state) => ({
      ...state,
      settings: { ...settings },
    }))
  },

  resetSettings: () => {
    const nextSettings = { ...defaultSettings }

    set((state) => ({
      ...state,
      settings: nextSettings,
    }))

    return nextSettings
  },

  resetChatState: () => {
    set({
      ...getInitialState(),
    })
  },
}))

export function selectActiveChat(state: ChatStore): Chat | null {
  return state.chats.find((chat) => chat.id === state.activeChatId) ?? null
}

export function selectMessagesForChat(chatId: string | null) {
  return (state: ChatStore): Message[] => {
    if (!chatId) {
      return EMPTY_MESSAGES
    }

    return state.messagesByChat[chatId] ?? EMPTY_MESSAGES
  }
}

export function selectLoadingForChat(chatId: string | null) {
  return (state: ChatStore): boolean => {
    if (!chatId) {
      return false
    }

    return state.isLoadingByChat[chatId] ?? false
  }
}
