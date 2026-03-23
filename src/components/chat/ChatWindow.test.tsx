import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createGigaChatCompletion, streamGigaChatCompletion } from '../../api/gigachat'
import { useChatStore } from '../../store/chatStore'
import type { Chat } from '../../types/chat'
import { ChatWindow } from './ChatWindow'

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

const chatOne: Chat = {
  id: 'chat-1',
  title: 'Chat One',
  lastMessage: 'Start',
  lastMessageAt: new Date().toISOString(),
  isTitleManual: false,
}

function sendMessage(text: string) {
  const input = screen.getByPlaceholderText('Напишите сообщение...') as HTMLTextAreaElement
  const form = input.closest('form')

  if (!form) {
    throw new Error('Input form is not found')
  }

  fireEvent.change(input, { target: { value: text } })
  fireEvent.submit(form)
}

describe('ChatWindow', () => {
  const mockCreateCompletion = vi.mocked(createGigaChatCompletion)
  const mockStreamCompletion = vi.mocked(streamGigaChatCompletion)

  beforeEach(() => {
    useChatStore.getState().resetChatState()
    vi.clearAllMocks()
  })

  afterEach(() => {
    useChatStore.getState().resetChatState()
  })

  it('streams assistant response token by token', async () => {
    mockStreamCompletion.mockImplementation(async (_request, options) => {
      options?.onDelta?.('assistant ')
      options?.onDelta?.('response')
      options?.onDone?.()

      return {
        hasChunks: true,
        content: 'assistant response',
      }
    })

    render(<ChatWindow chat={chatOne} onOpenSettings={vi.fn()} onCreateChat={vi.fn()} />)

    sendMessage('hello')

    expect(screen.getByText('hello')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('assistant response')).toBeInTheDocument()
    })

    expect(mockStreamCompletion).toHaveBeenCalledTimes(1)
    expect(mockCreateCompletion).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Отправить сообщение' })).toBeInTheDocument()
  })

  it('applies auto-title from first user message for new chat', async () => {
    const createdChatId = useChatStore.getState().createChat()
    const createdChat = useChatStore.getState().chats.find((chat) => chat.id === createdChatId)

    if (!createdChat) {
      throw new Error('Expected created chat')
    }

    mockStreamCompletion.mockImplementation(async (_request, options) => {
      options?.onDelta?.('ok')
      options?.onDone?.()

      return {
        hasChunks: true,
        content: 'ok',
      }
    })

    render(<ChatWindow chat={createdChat} onOpenSettings={vi.fn()} onCreateChat={vi.fn()} />)

    sendMessage('   Первый   запрос   для   автоназвания ')

    await waitFor(() => {
      expect(screen.getByText('ok')).toBeInTheDocument()
    })

    const updatedChat = useChatStore.getState().chats.find((chat) => chat.id === createdChatId)
    expect(updatedChat?.title).toBe('Первый запрос для автоназвания')
    expect(updatedChat?.isTitleManual).toBe(false)
  })

  it('stops active request and restores input state', async () => {
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

    render(<ChatWindow chat={chatOne} onOpenSettings={vi.fn()} onCreateChat={vi.fn()} />)

    sendMessage('stop me')

    await waitFor(() => {
      expect(mockStreamCompletion).toHaveBeenCalledTimes(1)
    })

    const stopButton = screen.getByRole('button', { name: 'Остановить генерацию' })
    fireEvent.click(stopButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Отправить сообщение' })).toBeInTheDocument()
    })

    expect(screen.getByText('stop me')).toBeInTheDocument()
    expect(screen.queryByText('assistant response')).not.toBeInTheDocument()
  })

  it('falls back to REST when stream fails before first chunk', async () => {
    mockStreamCompletion.mockRejectedValue(new Error('Stream is unavailable'))
    mockCreateCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'fallback answer',
          },
        },
      ],
    })

    render(<ChatWindow chat={chatOne} onOpenSettings={vi.fn()} onCreateChat={vi.fn()} />)

    sendMessage('hello')

    await waitFor(() => {
      expect(screen.getByText('fallback answer')).toBeInTheDocument()
    })

    expect(mockStreamCompletion).toHaveBeenCalledTimes(1)
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1)
  })

  it('keeps partial content and shows error on mid-stream failure', async () => {
    mockStreamCompletion.mockImplementation(async (_request, options) => {
      options?.onDelta?.('partial answer')
      throw new Error('Stream interrupted')
    })

    render(<ChatWindow chat={chatOne} onOpenSettings={vi.fn()} onCreateChat={vi.fn()} />)

    sendMessage('hello')

    await waitFor(() => {
      expect(screen.getByText('partial answer')).toBeInTheDocument()
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Stream interrupted')
    expect(mockCreateCompletion).not.toHaveBeenCalled()
  })

  it('clears error and succeeds on retry via re-send', async () => {
    mockStreamCompletion
      .mockRejectedValueOnce(new Error('Stream unavailable'))
      .mockImplementationOnce(async (_request, options) => {
        options?.onDelta?.('retry success')
        options?.onDone?.()

        return {
          hasChunks: true,
          content: 'retry success',
        }
      })

    mockCreateCompletion.mockRejectedValueOnce(new Error('Completion request failed'))

    render(<ChatWindow chat={chatOne} onOpenSettings={vi.fn()} onCreateChat={vi.fn()} />)

    sendMessage('first try')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Completion request failed')
    })

    sendMessage('second try')

    await waitFor(() => {
      expect(screen.getByText('retry success')).toBeInTheDocument()
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(mockStreamCompletion).toHaveBeenCalledTimes(2)
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1)
  })

  it('shows create-chat CTA when no active chat is selected', () => {
    const onCreateChat = vi.fn()

    render(<ChatWindow chat={null} onOpenSettings={vi.fn()} onCreateChat={onCreateChat} />)

    const createButton = screen.getByRole('button', { name: 'Создать чат, чтобы начать' })
    expect(createButton).toBeInTheDocument()

    fireEvent.click(createButton)
    expect(onCreateChat).toHaveBeenCalledTimes(1)
    expect(screen.queryByPlaceholderText('Напишите сообщение...')).not.toBeInTheDocument()
  })
})
