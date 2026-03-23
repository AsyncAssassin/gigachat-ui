import { fireEvent, render, screen } from '@testing-library/react'
import type { Chat } from '../../types/chat'
import { ChatItem } from './ChatItem'

const chat: Chat = {
  id: 'chat-1',
  title: 'Original title',
  lastMessage: 'Preview text',
  lastMessageAt: '2026-03-24T00:00:00.000Z',
  isTitleManual: false,
}

describe('ChatItem', () => {
  it('saves edited title on Enter', () => {
    const onEdit = vi.fn()

    render(
      <ChatItem
        chat={chat}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText('Переименовать чат'))
    const input = screen.getByDisplayValue('Original title')
    fireEvent.change(input, { target: { value: 'Updated title' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith('chat-1', 'Updated title')
  })

  it('cancels edit on Escape', () => {
    const onEdit = vi.fn()

    render(
      <ChatItem
        chat={chat}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText('Переименовать чат'))
    const input = screen.getByDisplayValue('Original title')
    fireEvent.change(input, { target: { value: 'Should not save' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.getByText('Original title')).toBeInTheDocument()
  })

  it('does not save empty title on blur', () => {
    const onEdit = vi.fn()

    render(
      <ChatItem
        chat={chat}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText('Переименовать чат'))
    const input = screen.getByDisplayValue('Original title')
    fireEvent.change(input, { target: { value: '    ' } })
    fireEvent.blur(input)

    expect(onEdit).not.toHaveBeenCalled()
  })
})
