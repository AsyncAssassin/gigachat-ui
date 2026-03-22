import { act, fireEvent, render, screen } from '@testing-library/react'
import type { Message as MessageType } from '../../types/message'
import { Message } from './Message'

const assistantMessage: MessageType = {
  id: 'assistant-1',
  role: 'assistant',
  content: 'assistant answer',
  timestamp: '2026-03-23T00:00:00.000Z',
}

const userMessage: MessageType = {
  id: 'user-1',
  role: 'user',
  content: 'user question',
  timestamp: '2026-03-23T00:00:00.000Z',
}

describe('Message', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows copy button for assistant message and provides copied feedback', async () => {
    render(<Message message={assistantMessage} />)

    const copyButton = screen.getByRole('button', { name: 'Копировать' })
    await act(async () => {
      fireEvent.click(copyButton)
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('assistant answer')
    expect(screen.getByRole('button', { name: 'Скопировано' })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByRole('button', { name: 'Копировать' })).toBeInTheDocument()
  })

  it('does not show copy button for user message', () => {
    render(<Message message={userMessage} />)
    expect(screen.queryByRole('button', { name: 'Копировать' })).not.toBeInTheDocument()
  })
})
