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

    render(<ChatWindow chat={chatOne} onOpenSettings={vi.fn()} />)

    sendMessage('hello')

    expect(screen.getByText('hello')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('assistant response')).toBeInTheDocument()
    })

    expect(mockStreamCompletion).toHaveBeenCalledTimes(1)
    expect(mockCreateCompletion).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Отправить сообщение' })).toBeInTheDocument()
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

    render(<ChatWindow chat={chatOne} onOpenSettings={vi.fn()} />)

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

    render(<ChatWindow chat={chatOne} onOpenSettings={vi.fn()} />)

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

    render(<ChatWindow chat={chatOne} onOpenSettings={vi.fn()} />)

    sendMessage('hello')

    await waitFor(() => {
      expect(screen.getByText('partial answer')).toBeInTheDocument()
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Stream interrupted')
    expect(mockCreateCompletion).not.toHaveBeenCalled()
  })
})
