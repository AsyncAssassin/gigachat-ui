import { create } from 'zustand'
import { defaultSettings } from '../mocks/settings'
import type { Chat } from '../types/chat'
import type { Message } from '../types/message'
import type { ChatSettings } from '../types/settings'

const EMPTY_MESSAGES: Message[] = []
const DEFAULT_CHAT_TITLE = 'Новый чат'
const STORAGE_KEY = 'gigachat-ui.chat-state.v1'
const PERSIST_VERSION = 1
const PERSIST_DEBOUNCE_MS = 280

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
  renameChat: (chatId: string, title: string) => void
  applyAutoTitle: (chatId: string, sourceText: string) => void
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
  hydrateFromStorage: () => void
  clearPersistedState: () => void
  resetChatState: () => void
}

type PersistedDomainState = {
  chats: Chat[]
  activeChatId: string | null
  messagesByChat: Record<string, Message[]>
  settings: ChatSettings
}

type PersistedSnapshotV1 = {
  version: number
  data: PersistedDomainState
}

export type ChatStore = ChatState & ChatActions

let persistTimer: ReturnType<typeof setTimeout> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function toSafeChat(value: unknown): Chat | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === 'string' ? value.id : null
  const title = typeof value.title === 'string' ? value.title : null
  const lastMessage = typeof value.lastMessage === 'string' ? value.lastMessage : null
  const lastMessageAt = typeof value.lastMessageAt === 'string' ? value.lastMessageAt : null

  if (!id || !title || lastMessage == null || !lastMessageAt) {
    return null
  }

  return {
    id,
    title,
    lastMessage,
    lastMessageAt,
    isTitleManual: typeof value.isTitleManual === 'boolean' ? value.isTitleManual : false,
  }
}

function toSafeMessage(value: unknown): Message | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === 'string' ? value.id : null
  const role = value.role
  const content = typeof value.content === 'string' ? value.content : null
  const timestamp = typeof value.timestamp === 'string' ? value.timestamp : null

  if (!id || !content || !timestamp || (role !== 'user' && role !== 'assistant')) {
    return null
  }

  return {
    id,
    role,
    content,
    timestamp,
  }
}

function toSafeMessagesByChat(value: unknown): Record<string, Message[]> {
  if (!isRecord(value)) {
    return {}
  }

  const result: Record<string, Message[]> = {}
  for (const [chatId, maybeMessages] of Object.entries(value)) {
    if (!Array.isArray(maybeMessages)) {
      continue
    }

    const normalizedMessages = maybeMessages
      .map((item) => toSafeMessage(item))
      .filter((item): item is Message => Boolean(item))

    result[chatId] = normalizedMessages
  }

  return result
}

function toSafeSettings(value: unknown): ChatSettings {
  if (!isRecord(value)) {
    return { ...defaultSettings }
  }

  const model = typeof value.model === 'string' ? value.model : defaultSettings.model
  const temperature =
    typeof value.temperature === 'number' && Number.isFinite(value.temperature)
      ? value.temperature
      : defaultSettings.temperature
  const topP =
    typeof value.topP === 'number' && Number.isFinite(value.topP) ? value.topP : defaultSettings.topP
  const maxTokens =
    typeof value.maxTokens === 'number' && Number.isFinite(value.maxTokens)
      ? value.maxTokens
      : defaultSettings.maxTokens
  const repetitionPenalty =
    typeof value.repetitionPenalty === 'number' && Number.isFinite(value.repetitionPenalty)
      ? value.repetitionPenalty
      : defaultSettings.repetitionPenalty
  const systemPrompt =
    typeof value.systemPrompt === 'string' ? value.systemPrompt : defaultSettings.systemPrompt
  const theme = value.theme === 'dark' ? 'dark' : 'light'

  return {
    model,
    temperature,
    topP,
    maxTokens,
    repetitionPenalty,
    systemPrompt,
    theme,
  }
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null
    }

    const candidate = window.localStorage as unknown as Partial<Storage>
    if (
      typeof candidate.getItem !== 'function' ||
      typeof candidate.setItem !== 'function' ||
      typeof candidate.removeItem !== 'function'
    ) {
      return null
    }

    return candidate as Storage
  } catch {
    return null
  }
}

function resolveActiveChatId(activeChatId: string | null, chats: Chat[]): string | null {
  if (!activeChatId) {
    return chats[0]?.id ?? null
  }

  return chats.some((chat) => chat.id === activeChatId)
    ? activeChatId
    : (chats[0]?.id ?? null)
}

function readPersistedDomainState(): PersistedDomainState | null {
  const storage = getStorage()
  if (!storage) {
    return null
  }

  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return null
  }

  if (!isRecord(parsed)) {
    return null
  }

  const candidate = resolvePersistCandidate(parsed)
  if (!candidate) {
    return null
  }

  const chats = Array.isArray(candidate.chats)
    ? candidate.chats.map((chat) => toSafeChat(chat)).filter((chat): chat is Chat => Boolean(chat))
    : []
  const messagesByChat = toSafeMessagesByChat(candidate.messagesByChat)
  const settings = toSafeSettings(candidate.settings)
  const activeChatId =
    typeof candidate.activeChatId === 'string' || candidate.activeChatId === null
      ? candidate.activeChatId
      : null

  return {
    chats,
    messagesByChat,
    settings,
    activeChatId: resolveActiveChatId(activeChatId, chats),
  }
}

function resolvePersistCandidate(value: Record<string, unknown>): Record<string, unknown> | null {
  if (typeof value.version === 'number' && value.version >= PERSIST_VERSION && isRecord(value.data)) {
    return value.data
  }

  if ('chats' in value && 'messagesByChat' in value && 'settings' in value) {
    return value
  }

  return null
}

function buildInitialState(): ChatState {
  const baseState: ChatState = {
    chats: [],
    activeChatId: null,
    settings: { ...defaultSettings },
    messagesByChat: {},
    isLoadingByChat: {},
  }

  const persisted = readPersistedDomainState()
  if (!persisted) {
    return baseState
  }

  return {
    chats: persisted.chats,
    activeChatId: resolveActiveChatId(persisted.activeChatId, persisted.chats),
    settings: persisted.settings,
    messagesByChat: persisted.messagesByChat,
    isLoadingByChat: {},
  }
}

function toPersistedState(state: ChatState): PersistedSnapshotV1 {
  return {
    version: PERSIST_VERSION,
    data: {
      chats: state.chats.map((chat) => ({ ...chat })),
      activeChatId: state.activeChatId,
      messagesByChat: Object.fromEntries(
        Object.entries(state.messagesByChat).map(([chatId, messages]) => [
          chatId,
          messages.map((message) => ({ ...message })),
        ]),
      ),
      settings: { ...state.settings },
    },
  }
}

function schedulePersist(state: ChatStore) {
  const storage = getStorage()
  if (!storage) {
    return
  }

  if (persistTimer) {
    clearTimeout(persistTimer)
  }

  persistTimer = setTimeout(() => {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(toPersistedState(state)))
    } catch {
      // Best-effort persistence only.
    } finally {
      persistTimer = null
    }
  }, PERSIST_DEBOUNCE_MS)
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function buildAutoTitle(sourceText: string): string {
  const normalized = normalizeWhitespace(sourceText)
  if (!normalized) {
    return ''
  }

  const words = normalized.split(' ').slice(0, 8)
  const byWordLimit = words.join(' ')
  const byLengthLimit = byWordLimit.slice(0, 60).trim()

  return byLengthLimit
}

export const useChatStore = create<ChatStore>((set) => ({
  ...buildInitialState(),

  createChat: () => {
    const chatId = `chat-${generateId()}`
    const newChat: Chat = {
      id: chatId,
      title: DEFAULT_CHAT_TITLE,
      lastMessage: 'Начните новый диалог',
      lastMessageAt: new Date().toISOString(),
      isTitleManual: false,
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
    const normalizedTitle = normalizeWhitespace(title).slice(0, 80)
    if (!normalizedTitle) {
      return
    }

    set((state) => ({
      ...state,
      chats: state.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              title: normalizedTitle,
              isTitleManual: true,
            }
          : chat,
      ),
    }))
  },

  applyAutoTitle: (chatId, sourceText) => {
    const nextTitle = buildAutoTitle(sourceText)
    if (!nextTitle) {
      return
    }

    set((state) => ({
      ...state,
      chats: state.chats.map((chat) => {
        if (chat.id !== chatId) {
          return chat
        }

        if (chat.isTitleManual || chat.title !== DEFAULT_CHAT_TITLE) {
          return chat
        }

        return {
          ...chat,
          title: nextTitle,
        }
      }),
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

  hydrateFromStorage: () => {
    const persisted = readPersistedDomainState()
    if (!persisted) {
      return
    }

    set((state) => ({
      ...state,
      chats: persisted.chats,
      activeChatId: resolveActiveChatId(persisted.activeChatId, persisted.chats),
      settings: persisted.settings,
      messagesByChat: persisted.messagesByChat,
      isLoadingByChat: {},
    }))
  },

  clearPersistedState: () => {
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }

    const storage = getStorage()
    storage?.removeItem(STORAGE_KEY)
  },

  resetChatState: () => {
    set({
      ...buildInitialState(),
    })
  },
}))

useChatStore.subscribe((state) => {
  schedulePersist(state)
})

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
