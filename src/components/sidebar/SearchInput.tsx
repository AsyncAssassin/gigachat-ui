import { Search } from 'lucide-react'
import styles from './SearchInput.module.css'

interface SearchInputProps {
  value: string
  placeholder?: string
  onChange: (value: string) => void
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Поиск чата',
}: SearchInputProps) {
  return (
    <label className={styles.wrapper}>
      <Search size={16} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}
