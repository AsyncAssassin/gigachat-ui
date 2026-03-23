import { fireEvent, render, screen } from '@testing-library/react'
import type { Chat } from '../../types/chat'
import type { Message } from '../../types/message'
import { Sidebar } from './Sidebar'

const chats: Chat[] = [
  {
    id: 'chat-1',
    title: 'React roadmap',
    lastMessage: 'Roadmap preview',
    lastMessageAt: '2026-03-24T10:00:00.000Z',
    isTitleManual: false,
  },
  {
    id: 'chat-2',
    title: 'TypeScript prep',
    lastMessage: 'TS preview',
    lastMessageAt: '2026-03-24T11:00:00.000Z',
    isTitleManual: false,
  },
]

const messagesByChat: Record<string, Message[]> = {
  'chat-1': [
    {
      id: 'm1',
      role: 'user',
      content: 'React hooks and roadmap notes',
      timestamp: '2026-03-24T10:00:00.000Z',
    },
  ],
  'chat-2': [
    {
      id: 'm2',
      role: 'assistant',
      content: 'Event loop deep dive',
      timestamp: '2026-03-24T11:00:00.000Z',
    },
  ],
}

describe('Sidebar', () => {
  it('searches chats by title and message content', () => {
    render(
      <Sidebar
        chats={chats}
        activeChatId="chat-1"
        messagesByChat={messagesByChat}
        isMobileOpen={false}
        onCloseMobile={vi.fn()}
        onSelectChat={vi.fn()}
        onCreateChat={vi.fn()}
        onEditChat={vi.fn()}
        onDeleteChat={vi.fn()}
      />,
    )

    const searchInput = screen.getByPlaceholderText('Поиск чата')

    fireEvent.change(searchInput, { target: { value: 'typescript' } })
    expect(screen.getByText('TypeScript prep')).toBeInTheDocument()
    expect(screen.queryByText('React roadmap')).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'event loop' } })
    expect(screen.getByText('TypeScript prep')).toBeInTheDocument()
    expect(screen.queryByText('React roadmap')).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'hooks' } })
    expect(screen.getByText('React roadmap')).toBeInTheDocument()
    expect(screen.queryByText('TypeScript prep')).not.toBeInTheDocument()
  })

  it('requires delete confirmation before removing chat', () => {
    const onDeleteChat = vi.fn()

    render(
      <Sidebar
        chats={chats}
        activeChatId="chat-1"
        messagesByChat={messagesByChat}
        isMobileOpen={false}
        onCloseMobile={vi.fn()}
        onSelectChat={vi.fn()}
        onCreateChat={vi.fn()}
        onEditChat={vi.fn()}
        onDeleteChat={onDeleteChat}
      />,
    )

    fireEvent.click(screen.getAllByLabelText('Удалить чат')[0]!)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Чат "React roadmap" будет удалён без возможности восстановления.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(onDeleteChat).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByLabelText('Удалить чат')[0]!)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(onDeleteChat).toHaveBeenCalledTimes(1)
    expect(onDeleteChat).toHaveBeenCalledWith('chat-1')
  })
})
