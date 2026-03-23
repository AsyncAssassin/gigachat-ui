import { fireEvent, render, screen } from '@testing-library/react'
import { AppErrorBoundary } from './AppErrorBoundary'

describe('AppErrorBoundary', () => {
  it('renders fallback when child throws and recovers after reset', () => {
    const onResetUi = vi.fn()
    let shouldThrow = true

    const ThrowingChild = () => {
      if (shouldThrow) {
        throw new Error('Crash')
      }

      return <div>Recovered UI</div>
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AppErrorBoundary onResetUi={onResetUi}>
        <ThrowingChild />
      </AppErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument()

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить UI' }))

    expect(onResetUi).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Recovered UI')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
