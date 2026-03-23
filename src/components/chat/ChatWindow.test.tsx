import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createGigaChatCompletion } from '../../api/gigachat'
import { useChatStore } from '../../store/chatStore'
import type { Chat } from '../../types/chat'
import { ChatWindow } from './ChatWindow'

vi.mock('../../api/gigachat', () => ({
  createGigaChatCompletion: vi.fn(),
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

  beforeEach(() => {
    useChatStore.getState().resetChatState()
    vi.clearAllMocks()
  })

  afterEach(() => {
    useChatStore.getState().resetChatState()
  })

  it('adds assistant message from successful REST completion', async () => {
    mockCreateCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'assistant response',
          },
        },
      ],
    })

    render(<ChatWindow chat={chatOne} onOpenSettings={vi.fn()} />)

    sendMessage('hello')

    expect(screen.getByText('hello')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('assistant response')).toBeInTheDocument()
    })

    expect(mockCreateCompletion).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Отправить сообщение' })).toBeInTheDocument()
  })

  it('stops active request and restores input state', async () => {
    mockCreateCompletion.mockImplementation(
      (_request, signal) =>
        new Promise((_, reject) => {
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
      expect(mockCreateCompletion).toHaveBeenCalledTimes(1)
    })

    const stopButton = screen.getByRole('button', { name: 'Остановить генерацию' })
    fireEvent.click(stopButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Отправить сообщение' })).toBeInTheDocument()
    })

    expect(screen.getByText('stop me')).toBeInTheDocument()
    expect(screen.queryByText('assistant response')).not.toBeInTheDocument()
  })

  it('shows error message when backend request fails', async () => {
    mockCreateCompletion.mockRejectedValue(new Error('Backend unavailable'))

    render(<ChatWindow chat={chatOne} onOpenSettings={vi.fn()} />)

    sendMessage('hello')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Backend unavailable')
    })
  })
})
