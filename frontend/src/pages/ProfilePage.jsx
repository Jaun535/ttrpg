import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, adminApi, campaignsApi } from '../api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/common/Layout'
import { Btn, Card, FormField, Spinner, PageHeader } from '../components/common/UI'
import { User, Shield, Users } from 'lucide-react'

/* ─── PROFILE PAGE ───────────────────────────────────────────── */
export function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ display_name: user?.display_name || '', bio: user?.bio || '', password: '' })
  const [avatarFile, setAvatarFile] = useState(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const updated = await authApi.updateMe({ display_name: form.display_name, bio: form.bio, password: form.password || undefined })
      if (avatarFile) {
        const avatarResp = await authApi.uploadAvatar(avatarFile)
        return { ...updated.data, avatar_url: avatarResp.data.avatar_url }
      }
      return updated.data
    },
    onSuccess: (data) => { updateUser(data); setSaved(true); setTimeout(() => setSaved(false), 2500) },
    onError: err => setError(err.response?.data?.error || 'Error al guardar'),
  })

  return (
    <Layout>
      <PageHeader title="Mi perfil" subtitle="Configuración de tu cuenta" />
      <div style={{ maxWidth: 540 }}>
        <Card>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt={user.username} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'white', fontWeight: 700 }}>{user?.username?.[0]?.toUpperCase()}</div>
            }
            <div>
              <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{user?.display_name || user?.username}</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>@{user?.username}</p>
              {user?.is_site_admin && <span style={{ fontSize: '0.72rem', background: 'var(--accent-light)', color: 'var(--accent)', padding: '0.1rem 0.4rem', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}><Shield size={10} /> Admin</span>}
            </div>
          </div>

          <FormField label="Nombre visible">
            <input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} />
          </FormField>
          <FormField label="Sobre mí">
            <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Cuéntanos algo sobre ti..." />
          </FormField>
          <FormField label="Avatar (imagen)">
            <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files[0])} style={{ paddingTop: '0.4rem' }} />
          </FormField>
          <FormField label="Nueva contraseña (dejar vacío para no cambiar)" error={error}>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 8 caracteres" minLength={8} />
          </FormField>

          <Btn onClick={() => mutation.mutate()} loading={mutation.isPending} style={{ width: '100%', justifyContent: 'center' }}>
            {saved ? '✓ Guardado' : 'Guardar cambios'}
          </Btn>
        </Card>
      </div>
    </Layout>
  )
}

/* ─── ADMIN PAGE ─────────────────────────────────────────────── */
export function AdminPage() {
  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.listUsers().then(r => r.data) })
  const qc = useQueryClient()

  const toggleAdmin = useMutation({
    mutationFn: ({ id, is_site_admin }) => adminApi.updateUser(id, { is_site_admin }),
    onSuccess: () => qc.invalidateQueries(['admin-users']),
  })
  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => adminApi.updateUser(id, { is_active }),
    onSuccess: () => qc.invalidateQueries(['admin-users']),
  })

  return (
    <Layout>
      <PageHeader title="Administración" subtitle={`${users.length} usuarios registrados`} />
      {isLoading ? <Spinner /> : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Usuario', 'Email', 'Registrado', 'Admin', 'Activo', 'Acción'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <div style={{ fontWeight: 500 }}>{u.display_name || u.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('es') : ''}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <span style={{ color: u.is_site_admin ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {u.is_site_admin ? '✓ Admin' : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <span style={{ color: u.is_active ? 'var(--success)' : 'var(--danger)' }}>
                        {u.is_active ? 'Activo' : 'Desactivado'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <Btn size="sm" variant="ghost"
                          onClick={() => toggleAdmin.mutate({ id: u.id, is_site_admin: !u.is_site_admin })}>
                          {u.is_site_admin ? 'Quitar admin' : 'Hacer admin'}
                        </Btn>
                        <Btn size="sm" variant={u.is_active ? 'danger' : 'secondary'}
                          onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}>
                          {u.is_active ? 'Desactivar' : 'Activar'}
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Layout>
  )
}

/* ─── JOIN PAGE (via link) ───────────────────────────────────── */
export function JoinPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => campaignsApi.join(slug.trim(), code),
    onSuccess: () => navigate(`/campaigns/${slug.trim()}`),
    onError: err => setError(err.response?.data?.error || 'Error'),
  })

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <p>Debes iniciar sesión para unirte a esta campaña.</p>
        <Btn onClick={() => navigate(`/login?next=/join/${code}`)}>Iniciar sesión</Btn>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <Card style={{ maxWidth: 440, width: '100%' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-gold)', marginBottom: '1rem' }}>Unirse a campaña</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Código de invitación: <code style={{ background: 'var(--bg-elevated)', padding: '0.1em 0.4em', borderRadius: 4 }}>{code}</code>
        </p>
        <FormField label="Slug de la campaña" error={error}>
          <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="nombre-de-la-campana" autoFocus />
        </FormField>
        <Btn onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!slug.trim()} style={{ width: '100%', justifyContent: 'center' }}>
          Unirse
        </Btn>
      </Card>
    </div>
  )
}
