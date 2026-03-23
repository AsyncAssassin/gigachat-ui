import { act, renderHook, waitFor } from '@testing-library/react'
import { createGigaChatCompletion, streamGigaChatCompletion } from '../../api/gigachat'
import { useChatStore } from '../../store/chatStore'
import { useChatSession } from '../useChatSession'

vi.mock('../../api/gigachat', () => ({
  createGigaChatCompletion: vi.fn(),
  streamGigaChatCompletion: vi.fn(),
  extractAssistantTextFromCompletion: (payload: unknown) => {
    const source = payload as {
      choices?: Array<{ message?: { content?: string } }>
    }

    return source.choices?.[0]?.message?.content ?? ''
  },
}))

describe('useChatSession', () => {
  const mockCreateCompletion = vi.mocked(createGigaChatCompletion)
  const mockStreamCompletion = vi.mocked(streamGigaChatCompletion)

  beforeEach(() => {
    useChatStore.getState().resetChatState()
    vi.clearAllMocks()
  })

  afterEach(() => {
    useChatStore.getState().resetChatState()
  })

  function renderSession(chatId = 'chat-1') {
    const messages = useChatStore.getState().messagesByChat[chatId] ?? []

    return renderHook(() =>
      useChatSession({
        activeChatId: chatId,
        messages,
        isLoading: false,
      }),
    )
  }

  it('streams assistant response and appends chunks', async () => {
    mockStreamCompletion.mockImplementation(async (_request, options) => {
      options?.onDelta?.('Hel')
      options?.onDelta?.('lo')
      return { hasChunks: true, content: 'Hello' }
    })

    const { result } = renderSession()

    await act(async () => {
      await result.current.sendMessage('hello')
    })

    const chatMessages = useChatStore.getState().messagesByChat['chat-1'] ?? []
    expect(chatMessages.some((message) => message.role === 'assistant' && message.content === 'Hello')).toBe(
      true,
    )
    expect(mockCreateCompletion).not.toHaveBeenCalled()
  })

  it('stops active stream and clears loading state', async () => {
    mockStreamCompletion.mockImplementation(
      (_request, options) =>
        new Promise((_, reject) => {
          const signal = options?.signal
          if (!signal) {
            return
          }

          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    )

    const { result } = renderSession()

    act(() => {
      void result.current.sendMessage('stop')
    })

    await waitFor(() => {
      expect(useChatStore.getState().isLoadingByChat['chat-1']).toBe(true)
    })

    act(() => {
      result.current.stopGeneration()
    })

    await waitFor(() => {
      expect(useChatStore.getState().isLoadingByChat['chat-1']).toBe(false)
    })
  })

  it('falls back to REST when streaming fails before first chunk', async () => {
    mockStreamCompletion.mockRejectedValue(new Error('Stream unavailable'))
    mockCreateCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Fallback response',
          },
        },
      ],
    })

    const { result } = renderSession()

    await act(async () => {
      await result.current.sendMessage('hello')
    })

    const chatMessages = useChatStore.getState().messagesByChat['chat-1'] ?? []
    expect(chatMessages.some((message) => message.content === 'Fallback response')).toBe(true)
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1)
  })

  it('keeps partial response and exposes error for mid-stream failure', async () => {
    mockStreamCompletion.mockImplementation(async (_request, options) => {
      options?.onDelta?.('partial answer')
      throw new Error('Stream interrupted')
    })

    const { result } = renderSession()

    await act(async () => {
      await result.current.sendMessage('hello')
    })

    const chatMessages = useChatStore.getState().messagesByChat['chat-1'] ?? []
    expect(chatMessages.some((message) => message.content === 'partial answer')).toBe(true)
    expect(result.current.error).toBe('Stream interrupted')
    expect(mockCreateCompletion).not.toHaveBeenCalled()
  })
})
