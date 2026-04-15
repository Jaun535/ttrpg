import { useState, useRef, useEffect } from 'react'
import { X, Search, Loader } from 'lucide-react'

/* ─── TagInput ──────────────────────────────────────────────── */
export function TagInput({ tags = [], onChange, placeholder = 'Añadir tag...' }) {
  const [input, setInput] = useState('')

  const addTag = (val) => {
    const cleaned = val.trim().toLowerCase().replace(/\s+/g, '-')
    if (cleaned && !tags.includes(cleaned)) {
      onChange([...tags, cleaned])
    }
    setInput('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center',
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem', minHeight: 38
    }}>
      {tags.map(tag => (
        <span key={tag} className="tag-chip" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {tag}
          <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', lineHeight: 1, padding: 0 }}>
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => input && addTag(input)}
        placeholder={tags.length === 0 ? placeholder : ''}
        style={{ border: 'none', background: 'none', outline: 'none', flex: '1 1 80px', minWidth: 60, padding: '0.1rem 0', width: 'auto' }}
      />
    </div>
  )
}

/* ─── SearchBar ─────────────────────────────────────────────── */
export function SearchBar({ value, onChange, placeholder = 'Buscar...', style }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <Search size={16} style={{
        position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)',
        color: 'var(--text-muted)', pointerEvents: 'none'
      }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ paddingLeft: '2rem' }}
      />
    </div>
  )
}

/* ─── Modal ─────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, width = 560 }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: width,
        maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)'
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-gold)' }}>{title}</h3>
          <button onClick={onClose} style={{
            color: 'var(--text-muted)', borderRadius: '4px', padding: '0.25rem'
          }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '1.25rem' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ─── Button ────────────────────────────────────────────────── */
export function Btn({ children, variant = 'primary', size = 'md', loading, disabled, style, ...props }) {
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff', border: 'none' },
    secondary: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
    danger: { background: 'var(--danger)', color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
    gold: { background: 'var(--accent-gold)', color: '#1a1200', border: 'none' },
  }
  const sizes = {
    sm: { padding: '0.3rem 0.7rem', fontSize: '0.8rem' },
    md: { padding: '0.5rem 1rem', fontSize: '0.88rem' },
    lg: { padding: '0.65rem 1.4rem', fontSize: '0.95rem' },
  }
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        borderRadius: 'var(--radius-sm)', fontWeight: 500, cursor: 'pointer',
        opacity: (disabled || loading) ? 0.6 : 1, transition: 'opacity 0.15s, transform 0.1s',
        ...variants[variant], ...sizes[size], ...style
      }}
      {...props}
    >
      {loading && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  )
}

/* ─── FormField ─────────────────────────────────────────────── */
export function FormField({ label, error, children, hint }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 500 }}>
          {label}
        </label>
      )}
      {children}
      {hint && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{hint}</p>}
      {error && <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>{error}</p>}
    </div>
  )
}

/* ─── Card ──────────────────────────────────────────────────── */
export function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '1.25rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: onClick ? 'border-color 0.15s, transform 0.1s' : undefined,
        ...style
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = 'var(--border-light)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {children}
    </div>
  )
}

/* ─── EmptyState ────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
      {Icon && <Icon size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />}
      <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{title}</p>
      {description && <p style={{ fontSize: '0.88rem', marginBottom: '1.5rem' }}>{description}</p>}
      {action}
    </div>
  )
}

/* ─── Spinner ───────────────────────────────────────────────── */
export function Spinner({ size = 24 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <Loader size={size} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ─── PageHeader ────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', color: 'var(--accent-gold)', marginBottom: subtitle ? '0.25rem' : 0 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

/* ─── ConfirmDialog ─────────────────────────────────────────── */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Eliminar', variant = 'danger' }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={400}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{message}</p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant={variant} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Btn>
      </div>
    </Modal>
  )
}
