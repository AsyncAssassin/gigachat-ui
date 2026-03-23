import { defaultSettings } from '../mocks/settings'
import type { Message } from '../types/message'
import { useChatStore } from './chatStore'

const STORAGE_KEY = 'gigachat-ui.chat-state.v1'

function createStorageMock(): Storage {
  const data = new Map<string, string>()

  return {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null
    },
    removeItem(key: string) {
      data.delete(key)
    },
    setItem(key: string, value: string) {
      data.set(key, value)
    },
  }
}

function createMessage(partial: Partial<Message> = {}): Message {
  return {
    id: partial.id ?? 'msg-1',
    role: partial.role ?? 'user',
    content: partial.content ?? 'hello',
    timestamp: partial.timestamp ?? '2026-03-24T00:00:00.000Z',
  }
}

describe('chatStore', () => {
  beforeEach(() => {
    const storage = createStorageMock()
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    })

    storage.removeItem(STORAGE_KEY)
    useChatStore.getState().clearPersistedState()
    useChatStore.getState().resetChatState()
  })

  afterEach(() => {
    vi.useRealTimers()
    window.localStorage.removeItem(STORAGE_KEY)
    useChatStore.getState().clearPersistedState()
    useChatStore.getState().resetChatState()
  })

  it('creates and selects chats', () => {
    const state = useChatStore.getState()
    const initialCount = state.chats.length

    const firstChatId = state.createChat()
    const secondChatId = state.createChat()
    const next = useChatStore.getState()

    expect(next.chats).toHaveLength(initialCount + 2)
    expect(next.chats[0]?.id).toBe(secondChatId)
    expect(next.chats[0]?.title).toBe('Новый чат')
    expect(next.chats[0]?.isTitleManual).toBe(false)
    expect(next.activeChatId).toBe(secondChatId)

    next.selectChat(firstChatId)
    expect(useChatStore.getState().activeChatId).toBe(firstChatId)
  })

  it('renames chat only with non-empty title and marks it as manual', () => {
    const state = useChatStore.getState()
    const chatId = state.createChat()

    state.renameChat(chatId, '   ')
    expect(useChatStore.getState().chats.find((chat) => chat.id === chatId)?.title).toBe('Новый чат')

    state.renameChat(chatId, 'Новый заголовок')
    const renamed = useChatStore.getState().chats.find((chat) => chat.id === chatId)
    expect(renamed?.title).toBe('Новый заголовок')
    expect(renamed?.isTitleManual).toBe(true)
  })

  it('applies auto title only once for default chat title', () => {
    const state = useChatStore.getState()
    const newChatId = state.createChat()

    state.applyAutoTitle(newChatId, '   Первый   запрос    для   названия чата ')
    expect(useChatStore.getState().chats.find((chat) => chat.id === newChatId)?.title).toBe(
      'Первый запрос для названия чата',
    )

    state.applyAutoTitle(newChatId, 'Второй заголовок не должен перезаписать')
    expect(useChatStore.getState().chats.find((chat) => chat.id === newChatId)?.title).toBe(
      'Первый запрос для названия чата',
    )
  })

  it('does not overwrite manual title by auto title', () => {
    const state = useChatStore.getState()
    const newChatId = state.createChat()

    state.renameChat(newChatId, 'Мое ручное название')
    state.applyAutoTitle(newChatId, 'Автоназвание')

    expect(useChatStore.getState().chats.find((chat) => chat.id === newChatId)?.title).toBe(
      'Мое ручное название',
    )
  })

  it('deletes chat with related loading and messages state', () => {
    const state = useChatStore.getState()
    const chatId = state.createChat()
    const message = createMessage()

    state.selectChat(chatId)
    state.addMessage(chatId, message)
    state.setChatLoading(chatId, true)
    state.deleteChat(chatId)

    const next = useChatStore.getState()

    expect(next.chats.some((chat) => chat.id === chatId)).toBe(false)
    expect(next.messagesByChat[chatId]).toBeUndefined()
    expect(next.isLoadingByChat[chatId]).toBeUndefined()
    expect(next.activeChatId).toBe(next.chats[0]?.id ?? null)
  })

  it('persists domain state and restores it on reset', () => {
    vi.useFakeTimers()

    const state = useChatStore.getState()
    const chatId = state.createChat()
    state.selectChat(chatId)
    state.applyAutoTitle(chatId, 'Тест автозаголовка')
    state.addMessage(chatId, createMessage({ id: 'msg-persist', content: 'persisted message' }))
    state.setSettings({
      ...defaultSettings,
      model: 'GigaChat-Pro',
      temperature: 0.2,
      topP: 0.8,
      repetitionPenalty: 1.2,
    })
    state.setChatLoading(chatId, true)

    vi.advanceTimersByTime(300)

    const rawSnapshot = window.localStorage.getItem(STORAGE_KEY)
    expect(rawSnapshot).toBeTruthy()

    const parsed = JSON.parse(rawSnapshot ?? '{}') as {
      data?: { isLoadingByChat?: unknown; chats?: Array<{ id: string }> }
    }
    expect(parsed.data?.isLoadingByChat).toBeUndefined()
    expect(parsed.data?.chats?.some((chat) => chat.id === chatId)).toBe(true)

    useChatStore.getState().resetChatState()
    const restored = useChatStore.getState()

    expect(restored.activeChatId).toBe(chatId)
    expect(restored.settings.model).toBe('GigaChat-Pro')
    expect(restored.messagesByChat[chatId]?.[0]?.content).toBe('persisted message')
    expect(restored.isLoadingByChat[chatId]).toBeUndefined()
  })

  it('falls back to initial state when persisted snapshot is corrupted', () => {
    window.localStorage.setItem(STORAGE_KEY, '{broken-json')
    useChatStore.getState().resetChatState()

    const next = useChatStore.getState()
    expect(next.chats).toEqual([])
    expect(next.activeChatId).toBeNull()
  })

  it('migrates legacy snapshot without isTitleManual', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        chats: [
          {
            id: 'legacy-chat',
            title: 'Legacy title',
            lastMessage: 'Legacy message',
            lastMessageAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        activeChatId: 'legacy-chat',
        messagesByChat: {
          'legacy-chat': [],
        },
        settings: defaultSettings,
      }),
    )

    useChatStore.getState().resetChatState()
    const migrated = useChatStore.getState().chats.find((chat) => chat.id === 'legacy-chat')

    expect(migrated?.isTitleManual).toBe(false)
  })
})
