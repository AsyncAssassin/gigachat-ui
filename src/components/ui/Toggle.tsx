import styles from './Toggle.module.css'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className={styles.wrapper}>
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={styles.switch}
        data-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} />
      </button>
    </label>
  )
}
