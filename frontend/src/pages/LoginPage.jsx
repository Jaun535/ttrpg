import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Btn, FormField } from '../components/common/UI'

function AuthShell({ title, subtitle, children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', background: 'var(--bg-primary)'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚔️</div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-gold)', fontSize: '1.8rem' }}>
            TTRPG Portal
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>{subtitle}</p>
        </div>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-md)'
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            {title}
          </h2>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Iniciar sesión" subtitle="Tu aventura te espera">
      <form onSubmit={handleSubmit}>
        <FormField label="Usuario o email" error={null}>
          <input
            value={form.username}
            onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
            placeholder="aventurero@example.com"
            required
            autoFocus
          />
        </FormField>
        <FormField label="Contraseña" error={error}>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            placeholder="••••••••"
            required
          />
        </FormField>
        <Btn type="submit" loading={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
          Entrar
        </Btn>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
        ¿No tienes cuenta?{' '}
        <Link to="/register" style={{ color: 'var(--accent-gold)' }}>Regístrate</Link>
      </p>
    </AuthShell>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', display_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Crear cuenta" subtitle="Únete a la aventura">
      <form onSubmit={handleSubmit}>
        <FormField label="Nombre de usuario">
          <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
            placeholder="guerrero_del_norte" required minLength={3} />
        </FormField>
        <FormField label="Nombre visible (opcional)">
          <input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
            placeholder="Tu nombre en el portal" />
        </FormField>
        <FormField label="Email">
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            placeholder="aventurero@example.com" required />
        </FormField>
        <FormField label="Contraseña" error={error}>
          <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            placeholder="Mínimo 8 caracteres" required minLength={8} />
        </FormField>
        <Btn type="submit" loading={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
          Crear cuenta
        </Btn>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
        ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--accent-gold)' }}>Inicia sesión</Link>
      </p>
    </AuthShell>
  )
}
