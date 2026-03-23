import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    expect(onSend).toHaveBeenCalledWith({ text: 'click submit', attachments: [] })

    fireEvent.change(textarea, { target: { value: 'enter submit' } })
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: false })
    expect(onSend).toHaveBeenCalledWith({ text: 'enter submit', attachments: [] })

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

  it('attaches image and sends multimodal payload', async () => {
    const onSend = vi.fn()

    render(<InputArea isLoading={false} onSend={onSend} />)

    const fileInput = screen.getByLabelText('Выбрать изображение') as HTMLInputElement
    const file = new File(['image-content'], 'cat.png', { type: 'image/png' })

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/cat.png/)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Напишите сообщение...'), {
      target: { value: 'Что на картинке?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Отправить сообщение' }))

    expect(onSend).toHaveBeenCalledTimes(1)
    const payload = onSend.mock.calls[0]?.[0]
    expect(payload.text).toBe('Что на картинке?')
    expect(payload.attachments).toHaveLength(1)
    expect(payload.attachments[0]).toMatchObject({
      fileName: 'cat.png',
      mimeType: 'image/png',
    })
    expect(payload.attachments[0]?.base64.length).toBeGreaterThan(0)
  })

  it('removes selected attachment before send', async () => {
    const onSend = vi.fn()

    render(<InputArea isLoading={false} onSend={onSend} />)

    const fileInput = screen.getByLabelText('Выбрать изображение') as HTMLInputElement
    const file = new File(['image-content'], 'cat.png', { type: 'image/png' })

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/cat.png/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Удалить вложение' }))

    expect(screen.queryByText(/cat.png/)).not.toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Напишите сообщение...'), {
      target: { value: 'Без вложения' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Отправить сообщение' }))

    expect(onSend).toHaveBeenCalledWith({ text: 'Без вложения', attachments: [] })
  })

  it('shows validation error for unsupported image type', async () => {
    const onSend = vi.fn()

    render(<InputArea isLoading={false} onSend={onSend} />)

    const fileInput = screen.getByLabelText('Выбрать изображение') as HTMLInputElement
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' })

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Поддерживаются только JPG, PNG, TIFF и BMP.')
    })

    expect(screen.queryByText(/notes.txt/)).not.toBeInTheDocument()
  })
})
