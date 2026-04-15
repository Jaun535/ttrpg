import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignsApi, searchApi } from '../api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/common/Layout'
import { Btn, Card, Modal, FormField, Spinner, TagInput, PageHeader, SearchBar, ConfirmDialog } from '../components/common/UI'
import { Users, BookOpen, Scroll, FolderOpen, Settings, Search, Link, RefreshCw, Crown, Shield, User, Swords, Copy } from 'lucide-react'

const ROLE_LABELS = { gm: 'GM', co_gm: 'Co-GM', player: 'Jugador', spectator: 'Espectador' }

function MembersPanel({ campaign, isGm }) {
  const qc = useQueryClient()
  const [changeRole, setChangeRole] = useState(null)

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => campaignsApi.updateMemberRole(campaign.slug, userId, role),
    onSuccess: () => { qc.invalidateQueries(['campaign', campaign.slug]); setChangeRole(null) },
  })
  const removeMutation = useMutation({
    mutationFn: (userId) => campaignsApi.removeMember(campaign.slug, userId),
    onSuccess: () => qc.invalidateQueries(['campaign', campaign.slug]),
  })

  const roleIcon = { gm: Crown, co_gm: Shield, player: User, spectator: User }

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem', color: 'var(--accent-gold)' }}>
        Miembros ({campaign.members?.length || 0})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {campaign.members?.map(member => {
          const Icon = roleIcon[member.role] || User
          return (
            <div key={member.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 0.75rem', background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)'
            }}>
              {member.user.avatar_url
                ? <img src={member.user.avatar_url} alt={member.user.username} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600 }}>
                    {member.user.username[0].toUpperCase()}
                  </div>
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{member.user.display_name || member.user.username}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{member.user.username}</div>
              </div>
              <span className={`role-badge ${member.role}`}>{ROLE_LABELS[member.role]}</span>
              {isGm && (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <Btn size="sm" variant="ghost" onClick={() => setChangeRole(member)}>Rol</Btn>
                  <Btn size="sm" variant="danger" onClick={() => removeMutation.mutate(member.user.id)}>✕</Btn>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {changeRole && (
        <Modal open={!!changeRole} onClose={() => setChangeRole(null)} title={`Cambiar rol — ${changeRole.user.username}`} width={360}>
          <FormField label="Nuevo rol">
            <select defaultValue={changeRole.role}
              onChange={e => roleMutation.mutate({ userId: changeRole.user.id, role: e.target.value })}>
              <option value="player">Jugador</option>
              <option value="co_gm">Co-GM</option>
              <option value="gm">GM</option>
              <option value="spectator">Espectador</option>
            </select>
          </FormField>
          <Btn variant="ghost" onClick={() => setChangeRole(null)} style={{ width: '100%', justifyContent: 'center' }}>Cerrar</Btn>
        </Modal>
      )}
    </div>
  )
}

function InvitePanel({ campaign }) {
  const qc = useQueryClient()
  const [joinCode, setJoinCode] = useState(null)
  const [copied, setCopied] = useState(false)

  const fetchCode = useMutation({
    mutationFn: () => campaignsApi.getJoinCode(campaign.slug),
    onSuccess: r => setJoinCode(r.data.join_code),
  })
  const regenCode = useMutation({
    mutationFn: () => campaignsApi.regenJoinCode(campaign.slug),
    onSuccess: r => setJoinCode(r.data.join_code),
  })

  const copyLink = () => {
    const url = `${window.location.origin}/join/${joinCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem', color: 'var(--accent-gold)' }}>
        Código de invitación
      </h3>
      {!joinCode ? (
        <Btn variant="ghost" onClick={() => fetchCode.mutate()} loading={fetchCode.isPending}>
          <Link size={16} /> Mostrar código
        </Btn>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--bg-elevated)', padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)'
          }}>
            <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.1em', color: 'var(--accent-gold)' }}>
              {joinCode}
            </code>
            <Btn size="sm" variant="ghost" onClick={copyLink}>
              <Copy size={14} /> {copied ? '¡Copiado!' : 'Copiar enlace'}
            </Btn>
          </div>
          <Btn size="sm" variant="ghost" onClick={() => regenCode.mutate()} loading={regenCode.isPending}>
            <RefreshCw size={14} /> Regenerar código
          </Btn>
        </div>
      )}
    </div>
  )
}

function CampaignSearch({ slug }) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['search', slug, q],
    queryFn: () => searchApi.search(slug, q).then(r => r.data.results),
    enabled: q.length >= 2,
  })

  const typeIcon = { wiki: '📖', character: '🧙', log: '📜', document: '📁' }
  const typeRoute = {
    wiki: (id) => `/campaigns/${slug}/wiki/${id}`,
    character: (id) => `/campaigns/${slug}/characters/${id}`,
    log: (id) => `/campaigns/${slug}/logs/${id}`,
    document: (id) => `/campaigns/${slug}/documents`,
  }

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem', color: 'var(--accent-gold)' }}>
        Búsqueda global
      </h3>
      <SearchBar value={q} onChange={setQ} placeholder="Buscar en toda la campaña..." />
      {q.length >= 2 && data && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {data.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '0.5rem' }}>Sin resultados</p>
          ) : data.map((r, i) => (
            <div key={i} onClick={() => navigate(typeRoute[r.type](r.id))} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)', cursor: 'pointer', border: '1px solid var(--border)'
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: '1rem' }}>{typeIcon[r.type]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{r.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.type}</div>
              </div>
              {r.tags?.map(t => <span key={t} className="tag-chip">{t}</span>)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const QUICK_LINKS = [
  { label: 'Personajes', icon: Users, path: 'characters', color: 'var(--accent)' },
  { label: 'NPCs', icon: Swords, path: 'npcs', color: 'var(--warning)' },
  { label: 'Wiki', icon: BookOpen, path: 'wiki', color: 'var(--accent-gold)' },
  { label: 'Sesiones', icon: Scroll, path: 'logs', color: 'var(--success)' },
  { label: 'Documentos', icon: FolderOpen, path: 'documents', color: '#6b8fd4' },
]

export default function CampaignPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', slug],
    queryFn: () => campaignsApi.get(slug).then(r => r.data),
  })

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leaveConfirm, setLeaveConfirm] = useState(false)

  const leaveMutation = useMutation({
    mutationFn: () => campaignsApi.leave(slug),
    onSuccess: () => { qc.invalidateQueries(['campaigns']); navigate('/') },
  })

  if (isLoading) return <Layout><Spinner /></Layout>
  if (!campaign) return <Layout><p>Campaña no encontrada.</p></Layout>

  const isGm = campaign.my_role === 'gm' || campaign.my_role === 'co_gm' || user?.is_site_admin

  return (
    <Layout campaign={campaign}>
      {/* Hero */}
      <div style={{
        position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        marginBottom: '1.5rem', minHeight: 200,
        background: campaign.cover_image_url ? 'none' : 'var(--accent-light)',
        border: '1px solid var(--border)',
      }}>
        {campaign.cover_image_url && (
          <img src={campaign.cover_image_url} alt={campaign.name}
            style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{
          position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem'
        }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#fff', marginBottom: '0.3rem' }}>
            {campaign.name}
          </h1>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {campaign.system && <span style={{ fontSize: '0.85rem', color: 'var(--accent-gold)' }}>{campaign.system}</span>}
            {campaign.my_role && <span className={`role-badge ${campaign.my_role}`}>{ROLE_LABELS[campaign.my_role]}</span>}
            {campaign.tags?.map(t => <span key={t} className="tag-chip">{t}</span>)}
          </div>
        </div>
        {isGm && (
          <button onClick={() => setSettingsOpen(true)} style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.8rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem'
          }}>
            <Settings size={14} /> Configurar
          </button>
        )}
      </div>

      {campaign.description && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{campaign.description}</p>
        </Card>
      )}

      {/* Quick nav */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {QUICK_LINKS.map(link => {
          const Icon = link.icon
          return (
            <Card key={link.path} onClick={() => navigate(`/campaigns/${slug}/${link.path}`)}
              style={{ textAlign: 'center', padding: '1.25rem 0.75rem' }}>
              <Icon size={28} style={{ color: link.color, marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{link.label}</div>
            </Card>
          )
        })}
      </div>

      {/* Two columns: search + members */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <Card>
          <CampaignSearch slug={slug} />
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card>
            <MembersPanel campaign={campaign} isGm={isGm} />
          </Card>
          {isGm && (
            <Card>
              <InvitePanel campaign={campaign} />
            </Card>
          )}
          {campaign.my_role && campaign.my_role !== 'gm' && (
            <Btn variant="danger" onClick={() => setLeaveConfirm(true)} style={{ width: '100%', justifyContent: 'center' }}>
              Abandonar campaña
            </Btn>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={leaveConfirm} onClose={() => setLeaveConfirm(false)}
        onConfirm={() => leaveMutation.mutate()}
        title="Abandonar campaña"
        message={`¿Seguro que quieres abandonar "${campaign.name}"?`}
        confirmLabel="Abandonar" />

      <CampaignSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} campaign={campaign} />
    </Layout>
  )
}


function CampaignSettingsModal({ open, onClose, campaign }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: campaign.name, description: campaign.description || '',
    system: campaign.system || '', is_public: campaign.is_public,
    status: campaign.status, tags: campaign.tags || []
  })
  const [coverFile, setCoverFile] = useState(null)
  const [error, setError] = useState('')
  const SYSTEMS = ['D&D 5e', 'Pathfinder 2e', 'Call of Cthulhu', 'Vampire: The Masquerade', 'Starfinder', 'GURPS', 'World of Darkness', 'Shadowrun', 'Fate Core', 'Otro']

  const mutation = useMutation({
    mutationFn: async () => {
      await campaignsApi.update(campaign.slug, form)
      if (coverFile) await campaignsApi.uploadCover(campaign.slug, coverFile)
    },
    onSuccess: () => { qc.invalidateQueries(['campaign', campaign.slug]); onClose() },
    onError: (err) => setError(err.response?.data?.error || 'Error'),
  })

  return (
    <Modal open={open} onClose={onClose} title="Configurar campaña" width={560}>
      <FormField label="Nombre" error={error}>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
      </FormField>
      <FormField label="Sistema">
        <select value={form.system} onChange={e => setForm(p => ({ ...p, system: e.target.value }))}>
          <option value="">Seleccionar...</option>
          {SYSTEMS.map(s => <option key={s}>{s}</option>)}
        </select>
      </FormField>
      <FormField label="Estado">
        <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
          <option value="active">Activa</option>
          <option value="paused">Pausada</option>
          <option value="completed">Completada</option>
          <option value="archived">Archivada</option>
        </select>
      </FormField>
      <FormField label="Descripción">
        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
      </FormField>
      <FormField label="Tags">
        <TagInput tags={form.tags} onChange={tags => setForm(p => ({ ...p, tags }))} />
      </FormField>
      <FormField label="Imagen de portada">
        <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files[0])} style={{ paddingTop: '0.4rem' }} />
      </FormField>
      <FormField>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_public} onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))} style={{ width: 'auto' }} />
          <span style={{ fontSize: '0.88rem' }}>Campaña pública</span>
        </label>
      </FormField>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => mutation.mutate()} loading={mutation.isPending}>Guardar cambios</Btn>
      </div>
    </Modal>
  )
}
