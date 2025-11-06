import { useEffect, useMemo, useRef, useState } from 'react'

export type Option = { value: string; label: string }

interface Props {
  values: string[]
  onChange: (values: string[]) => void
  options: Option[]
  placeholder?: string
  disabled?: boolean
  leftIcon?: React.ReactNode
  maxSelections?: number
}

export default function MultiSelect({ 
  values, 
  onChange, 
  options, 
  placeholder, 
  disabled, 
  leftIcon,
  maxSelections 
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedLabels = useMemo(() => 
    values.map(value => options.find(o => o.value === value)?.label).filter(Boolean),
    [options, values]
  )

  const displayText = useMemo(() => {
    if (values.length === 0) return ''
    if (values.length === 1) return selectedLabels[0] || ''
    return `${values.length} stores selected`
  }, [selectedLabels, values.length])

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

  const toggleOption = (optionValue: string) => {
    const isSelected = values.includes(optionValue)
    
    if (isSelected) {
      // Remove from selection
      onChange(values.filter(v => v !== optionValue))
    } else {
      // Add to selection (if under max limit)
      if (!maxSelections || values.length < maxSelections) {
        onChange([...values, optionValue])
      }
    }
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <div ref={containerRef} className={`relative ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      {leftIcon && values.length === 0 && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
          {leftIcon}
        </div>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls="multi-select-list"
          aria-autocomplete="list"
          disabled={disabled}
          value={open ? query : displayText}
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
            if (e.key === 'ArrowDown') { 
              e.preventDefault(); 
              setHighlight(h => Math.min(h + 1, filtered.length - 1)) 
            }
            else if (e.key === 'ArrowUp') { 
              e.preventDefault(); 
              setHighlight(h => Math.max(h - 1, 0)) 
            }
            else if (e.key === 'Enter') { 
              e.preventDefault(); 
              const item = filtered[highlight]; 
              if (item) toggleOption(item.value) 
            }
            else if (e.key === 'Escape') { 
              setOpen(false) 
            }
          }}
          placeholder={placeholder}
          className={`w-full ${leftIcon && values.length === 0 ? 'pl-10' : 'pl-3'} pr-16 py-3 border rounded-2xl`}
        />
        
        {/* Clear button */}
        {values.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              clearAll()
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕
          </button>
        )}
        
        {/* Right caret */}
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</div>
      </div>

      {/* Selected store chips without icons */}
      {values.length > 1 && !open && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedLabels.map((label, index) => (
            <div 
              key={values[index]}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
            >
              <span className="text-blue-800">{label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleOption(values[index])
                }}
                className="ml-2 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center text-blue-600"
                title="Remove store"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {open && (
        <ul
          id="multi-select-list"
          ref={listRef}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-xl border bg-white shadow-lg"
          onMouseDown={(e) => {
            // prevent input blur before click handler fires
            e.preventDefault()
          }}
        >
          {maxSelections && (
            <li className="px-3 py-2 text-xs text-gray-500 border-b bg-gray-50">
              {values.length}/{maxSelections} selected
            </li>
          )}
          
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">No results</li>
          )}
          
          {filtered.map((option, i) => {
            const isSelected = values.includes(option.value)
            const isDisabled = maxSelections && !isSelected && values.length >= maxSelections
            
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between ${
                  i === highlight ? 'bg-gray-100' : ''
                } ${isSelected ? 'bg-blue-50' : ''} ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => !isDisabled && toggleOption(option.value)}
              >
                <span className={isSelected ? 'font-medium text-blue-700' : ''}>
                  {option.label}
                </span>
                {isSelected && (
                  <span className="text-blue-600 font-bold">✓</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}