import { fireEvent, render, screen } from '@testing-library/react'
import { InputArea } from './InputArea'

describe('InputArea', () => {
  it('disables submit for empty or whitespace-only input', () => {
    const onSend = vi.fn()

    render(<InputArea isLoading={false} onSend={onSend} />)

    const textarea = screen.getByPlaceholderText('Напишите сообщение...')
    const sendButton = screen.getByRole('button', { name: 'Отправить сообщение' })

    expect(sendButton).toBeDisabled()

    fireEvent.change(textarea, { target: { value: '   ' } })
    expect(sendButton).toBeDisabled()

    fireEvent.change(textarea, { target: { value: 'hello' } })
    expect(sendButton).toBeEnabled()
  })

  it('submits by click and Enter, but not by Shift+Enter', () => {
    const onSend = vi.fn()

    render(<InputArea isLoading={false} onSend={onSend} />)

    const textarea = screen.getByPlaceholderText('Напишите сообщение...')
    const sendButton = screen.getByRole('button', { name: 'Отправить сообщение' })

    fireEvent.change(textarea, { target: { value: 'click submit' } })
    fireEvent.click(sendButton)
    expect(onSend).toHaveBeenCalledWith('click submit')

    fireEvent.change(textarea, { target: { value: 'enter submit' } })
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: false })
    expect(onSend).toHaveBeenCalledWith('enter submit')

    fireEvent.change(textarea, { target: { value: 'line 1' } })
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: true })
    expect(onSend).toHaveBeenCalledTimes(2)
  })

  it('shows Stop button while loading and calls onStop', () => {
    const onSend = vi.fn()
    const onStop = vi.fn()

    render(<InputArea isLoading onSend={onSend} onStop={onStop} />)

    expect(screen.queryByRole('button', { name: 'Отправить сообщение' })).not.toBeInTheDocument()

    const stopButton = screen.getByRole('button', { name: 'Остановить генерацию' })
    expect(stopButton).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Напишите сообщение...')).toBeDisabled()

    fireEvent.click(stopButton)
    expect(onStop).toHaveBeenCalledTimes(1)
  })
})
