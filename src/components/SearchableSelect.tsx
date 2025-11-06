import { useEffect, useMemo, useRef, useState } from 'react'

export type Option = { value: string; label: string }

interface Props {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  disabled?: boolean
  leftIcon?: React.ReactNode
}

export default function SearchableSelect({ value, onChange, options, placeholder, disabled, leftIcon }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedLabel = useMemo(() => options.find(o => o.value === value)?.label ?? '', [options, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open) setQuery('')
    setHighlight(0)
  }, [open])

  // close when clicking outside
  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  const commit = (val: string) => {
    onChange(val)
    setOpen(false)
    // move focus out of the way on mobile keyboards
    inputRef.current?.blur()
  }

  return (
    <div ref={containerRef} className={`relative ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      {leftIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {leftIcon}
        </div>
      )}
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls="searchable-select-list"
        aria-autocomplete="list"
        disabled={disabled}
        value={open ? query : selectedLabel}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={(e) => {
          // If blur goes to an item inside the popup, keep it open
          const next = e.relatedTarget as Node | null
          if (next && containerRef.current?.contains(next)) return
          setOpen(false)
        }}
        onKeyDown={(e) => {
          if (!open) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
          else if (e.key === 'Enter') { e.preventDefault(); const item = filtered[highlight]; if (item) commit(item.value) }
          else if (e.key === 'Escape') { setOpen(false) }
        }}
        placeholder={placeholder}
        className={`w-full ${leftIcon ? 'pl-10' : 'pl-3'} pr-10 py-3 border rounded-2xl`}
      />
      {/* right caret */}
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</div>

      {open && (
        <ul
          id="searchable-select-list"
          ref={listRef}
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-xl border bg-white shadow-lg"
          onMouseDown={(e) => {
            // prevent input blur before click handler fires
            e.preventDefault()
          }}
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">No results</li>
          )}
          {filtered.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`px-3 py-2 cursor-pointer text-sm ${i === highlight ? 'bg-gray-100' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => commit(o.value)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}