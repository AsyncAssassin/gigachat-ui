import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconOnly?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconOnly = false,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        styles.button,
        styles[variant],
        styles[size],
        iconOnly && styles.iconOnly,
        className,
      )}
      {...props}
    >
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      {!iconOnly ? <span>{children}</span> : null}
    </button>
  )
}
