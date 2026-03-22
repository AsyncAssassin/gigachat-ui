import { act, fireEvent, render, screen } from '@testing-library/react'
import { useChatStore } from '../../store/chatStore'
import type { Chat } from '../../types/chat'
import { ChatWindow } from './ChatWindow'

const chatOne: Chat = {
  id: 'chat-1',
  title: 'Chat One',
  lastMessage: 'Start',
  lastMessageAt: new Date().toISOString(),
}

const chatTwo: Chat = {
  id: 'chat-2',
  title: 'Chat Two',
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
  beforeEach(() => {
    useChatStore.getState().resetChatState()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    useChatStore.getState().resetChatState()
  })

  it('keeps messages isolated by chat when switching during loading', () => {
    const { rerender } = render(
      <ChatWindow
        chat={chatOne}
        onOpenSettings={vi.fn()}
      />,
    )

    sendMessage('first message')
    expect(screen.getByText('first message')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Напишите сообщение...')).toBeDisabled()

    rerender(
      <ChatWindow
        chat={chatTwo}
        onOpenSettings={vi.fn()}
      />,
    )

    expect(screen.queryByText('first message')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Напишите сообщение...')).toBeEnabled()

    sendMessage('second message')
    expect(screen.getByText('second message')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Напишите сообщение...')).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(2100)
    })

    rerender(
      <ChatWindow
        chat={chatOne}
        onOpenSettings={vi.fn()}
      />,
    )

    expect(screen.getByText('first message')).toBeInTheDocument()
    expect(screen.getByText(/Принял: "first message"/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Напишите сообщение...')).toBeEnabled()

    rerender(
      <ChatWindow
        chat={chatTwo}
        onOpenSettings={vi.fn()}
      />,
    )

    expect(screen.getByText('second message')).toBeInTheDocument()
    expect(screen.getByText(/Принял: "second message"/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Напишите сообщение...')).toBeEnabled()
  })

  it('stops assistant generation for the active chat', () => {
    render(
      <ChatWindow
        chat={chatOne}
        onOpenSettings={vi.fn()}
      />,
    )

    sendMessage('stop me')

    const stopButton = screen.getByRole('button', { name: 'Остановить генерацию' })
    fireEvent.click(stopButton)

    act(() => {
      vi.advanceTimersByTime(2100)
    })

    expect(screen.getByText('stop me')).toBeInTheDocument()
    expect(screen.queryByText(/Принял: "stop me"/)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Напишите сообщение...')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Отправить сообщение' })).toBeInTheDocument()
  })
})
