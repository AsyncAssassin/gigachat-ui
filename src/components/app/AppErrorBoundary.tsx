import type { ReactNode } from 'react'
import { Component } from 'react'
import styles from './AppErrorBoundary.module.css'

interface AppErrorBoundaryProps {
  children: ReactNode
  onResetUi?: () => void
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public constructor(props: AppErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(error: unknown): void {
    console.error('App runtime error captured by ErrorBoundary', error)
  }

  private handleReset = () => {
    this.props.onResetUi?.()
    this.setState({ hasError: false })
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <section className={styles.fallback} role="alert">
        <div className={styles.card}>
          <h1>Что-то пошло не так</h1>
          <p>
            Интерфейс временно недоступен из-за runtime-ошибки. Данные чатов в localStorage
            сохранены.
          </p>
          <div className={styles.actions}>
            <button type="button" onClick={this.handleReset}>
              Сбросить UI
            </button>
            <button type="button" onClick={this.handleReload} className={styles.ghost}>
              Перезагрузить страницу
            </button>
          </div>
        </div>
      </section>
    )
  }
}
