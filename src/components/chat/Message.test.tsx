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

  it('renders fenced code block with syntax highlight classes', () => {
    const codeMessage: MessageType = {
      ...assistantMessage,
      content: '```js\nconst answer = 42\n```',
    }

    const { container } = render(<Message message={codeMessage} />)

    const codeBlock = container.querySelector('code.hljs.language-js')
    expect(codeBlock).toBeInTheDocument()
    if (!codeBlock) {
      throw new Error('Code block is not rendered')
    }

    expect(codeBlock.tagName.toLowerCase()).toBe('code')
    expect(codeBlock.className).toContain('hljs')
    expect(codeBlock.className).toContain('language-js')
    expect(codeBlock.closest('pre')).toBeInTheDocument()
  })

  it('keeps inline code rendering without breaking markdown', () => {
    const inlineCodeMessage: MessageType = {
      ...assistantMessage,
      content: 'Use `npm run dev:all` to start app.',
    }

    render(<Message message={inlineCodeMessage} />)

    const inlineCode = screen.getByText('npm run dev:all')
    expect(inlineCode.tagName.toLowerCase()).toBe('code')
    expect(inlineCode.closest('pre')).not.toBeInTheDocument()
  })
})
