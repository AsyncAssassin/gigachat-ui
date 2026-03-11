import styles from './Slider.module.css'

interface SliderProps {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}

export function Slider({ label, min, max, step, value, onChange }: SliderProps) {
  return (
    <label className={styles.wrapper}>
      <div className={styles.header}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <input
        className={styles.input}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
