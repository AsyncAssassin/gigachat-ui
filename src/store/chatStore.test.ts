import { defaultSettings } from '../mocks/settings'
import type { Message } from '../types/message'
import { useChatStore } from './chatStore'

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
    useChatStore.getState().resetChatState()
  })

  afterEach(() => {
    useChatStore.getState().resetChatState()
  })

  it('creates and selects chats', () => {
    const state = useChatStore.getState()
    const initialCount = state.chats.length

    const newChatId = state.createChat()
    const next = useChatStore.getState()

    expect(next.chats).toHaveLength(initialCount + 1)
    expect(next.chats[0]?.id).toBe(newChatId)
    expect(next.activeChatId).toBe(newChatId)

    next.selectChat('chat-2')
    expect(useChatStore.getState().activeChatId).toBe('chat-2')
  })

  it('renames chat using explicit title or fallback suffix', () => {
    const state = useChatStore.getState()

    state.renameChat('chat-1', 'Новый заголовок')
    expect(useChatStore.getState().chats.find((chat) => chat.id === 'chat-1')?.title).toBe(
      'Новый заголовок',
    )

    state.renameChat('chat-1')
    expect(useChatStore.getState().chats.find((chat) => chat.id === 'chat-1')?.title).toContain(
      '(edited)',
    )
  })

  it('deletes chat with related loading and messages state', () => {
    const state = useChatStore.getState()
    const message = createMessage()

    state.selectChat('chat-1')
    state.addMessage('chat-1', message)
    state.setChatLoading('chat-1', true)
    state.deleteChat('chat-1')

    const next = useChatStore.getState()

    expect(next.chats.some((chat) => chat.id === 'chat-1')).toBe(false)
    expect(next.messagesByChat['chat-1']).toBeUndefined()
    expect(next.isLoadingByChat['chat-1']).toBeUndefined()
    expect(next.activeChatId).toBe(next.chats[0]?.id ?? null)
  })

  it('adds and updates messages by chat', () => {
    const state = useChatStore.getState()

    state.addMessage('chat-1', createMessage({ id: 'msg-1', content: 'draft' }))
    state.updateMessage('chat-1', 'msg-1', (message) => ({
      ...message,
      content: `${message.content} updated`,
    }))

    expect(useChatStore.getState().messagesByChat['chat-1']?.[0]?.content).toBe('draft updated')
  })

  it('stores loading flags per chat', () => {
    const state = useChatStore.getState()

    state.setChatLoading('chat-1', true)
    state.setChatLoading('chat-2', false)

    expect(useChatStore.getState().isLoadingByChat['chat-1']).toBe(true)
    expect(useChatStore.getState().isLoadingByChat['chat-2']).toBe(false)
  })

  it('updates and resets settings', () => {
    const state = useChatStore.getState()

    state.setSettings({
      ...defaultSettings,
      temperature: 0.2,
      topP: 0.8,
      repetitionPenalty: 1.2,
    })

    expect(useChatStore.getState().settings.temperature).toBe(0.2)
    expect(useChatStore.getState().settings.topP).toBe(0.8)
    expect(useChatStore.getState().settings.repetitionPenalty).toBe(1.2)

    const reset = state.resetSettings()

    expect(reset).toEqual(defaultSettings)
    expect(useChatStore.getState().settings).toEqual(defaultSettings)
  })
})
