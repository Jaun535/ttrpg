import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignsApi } from '../api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/common/Layout'
import { Btn, Card, Modal, FormField, EmptyState, Spinner, TagInput, PageHeader } from '../components/common/UI'
import { Plus, Swords, Users, BookOpen, Hash } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_LABELS = {
  active: { label: 'Activa', color: 'var(--success)' },
  paused: { label: 'Pausada', color: 'var(--warning)' },
  completed: { label: 'Completada', color: 'var(--text-muted)' },
  archived: { label: 'Archivada', color: 'var(--text-muted)' },
}

const SYSTEMS = ['D&D 5e', 'Pathfinder 2e', 'Call of Cthulhu', 'Vampire: The Masquerade',
  'Starfinder', 'GURPS', 'World of Darkness', 'Shadowrun', 'Fate Core', 'Otro']

function CampaignCard({ campaign, onClick }) {
  const status = STATUS_LABELS[campaign.status] || STATUS_LABELS.active
  const myRole = campaign.my_role

  return (
    <Card onClick={onClick} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      {campaign.cover_image_url ? (
        <img src={campaign.cover_image_url} alt={campaign.name}
          style={{ width: 72, height: 72, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 72, height: 72, borderRadius: 'var(--radius-sm)', flexShrink: 0,
          background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem'
        }}>⚔️</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>{campaign.name}</h3>
          <span style={{ fontSize: '0.72rem', color: status.color, fontWeight: 600 }}>● {status.label}</span>
        </div>
        {campaign.system && (
          <p style={{ fontSize: '0.78rem', color: 'var(--accent-gold)', marginBottom: '0.3rem' }}>{campaign.system}</p>
        )}
        {campaign.description && (
          <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '0.5rem',
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {campaign.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {myRole && <span className={`role-badge ${myRole}`}>{myRole.replace('_', '-')}</span>}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={12} /> {campaign.member_count}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {formatDistanceToNow(new Date(campaign.updated_at), { locale: es, addSuffix: true })}
          </span>
          {campaign.tags?.map(t => <span key={t} className="tag-chip">{t}</span>)}
        </div>
      </div>
    </Card>
  )
}

function CreateCampaignModal({ open, onClose }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', description: '', system: '', is_public: false, tags: [] })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => campaignsApi.create({ ...form }),
    onSuccess: (r) => {
      qc.invalidateQueries(['campaigns'])
      onClose()
      navigate(`/campaigns/${r.data.slug}`)
    },
    onError: (err) => setError(err.response?.data?.error || 'Error al crear'),
  })

  const reset = () => { setForm({ name: '', description: '', system: '', is_public: false, tags: [] }); setError('') }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Nueva campaña" width={560}>
      <FormField label="Nombre *" error={error}>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="La Maldición del Cuervo" autoFocus />
      </FormField>
      <FormField label="Sistema de juego">
        <select value={form.system} onChange={e => setForm(p => ({ ...p, system: e.target.value }))}>
          <option value="">Seleccionar...</option>
          {SYSTEMS.map(s => <option key={s}>{s}</option>)}
        </select>
      </FormField>
      <FormField label="Descripción">
        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Una breve descripción de la campaña..." rows={3} />
      </FormField>
      <FormField label="Tags">
        <TagInput tags={form.tags} onChange={tags => setForm(p => ({ ...p, tags }))} />
      </FormField>
      <FormField label="">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_public}
            onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))} style={{ width: 'auto' }} />
          <span style={{ fontSize: '0.88rem' }}>Campaña pública (visible sin login)</span>
        </label>
      </FormField>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <Btn variant="ghost" onClick={() => { reset(); onClose() }}>Cancelar</Btn>
        <Btn onClick={() => mutation.mutate()} loading={mutation.isPending}
          disabled={!form.name.trim()}>
          Crear campaña
        </Btn>
      </div>
    </Modal>
  )
}

function JoinModal({ open, onClose }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [slug, setSlug] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => campaignsApi.join(slug.trim(), code.trim()),
    onSuccess: () => { qc.invalidateQueries(['campaigns']); navigate(`/campaigns/${slug.trim()}`); onClose() },
    onError: (err) => setError(err.response?.data?.error || 'Error al unirse'),
  })

  return (
    <Modal open={open} onClose={onClose} title="Unirse a campaña" width={420}>
      <FormField label="Slug o nombre de la campaña">
        <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="la-maldicion-del-cuervo" />
      </FormField>
      <FormField label="Código de invitación (si es privada)" error={error}>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="abc123XY" />
      </FormField>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="gold" onClick={() => mutation.mutate()} loading={mutation.isPending}
          disabled={!slug.trim()}>
          Unirse
        </Btn>
      </div>
    </Modal>
  )
}

export default function HomePage() {
  const { data, isLoading } = useQuery({ queryKey: ['campaigns'], queryFn: () => campaignsApi.list().then(r => r.data) })
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [filter, setFilter] = useState('all')

  const campaigns = data || []
  const myCampaigns = campaigns.filter(c => c.my_role)
  const publicCampaigns = campaigns.filter(c => !c.my_role)
  const shown = filter === 'mine' ? myCampaigns : filter === 'public' ? publicCampaigns : campaigns

  return (
    <Layout>
      <PageHeader
        title="Mis campañas"
        subtitle={`${campaigns.length} campaña${campaigns.length !== 1 ? 's' : ''} disponible${campaigns.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <Btn variant="ghost" onClick={() => setJoinOpen(true)}>
              <Hash size={16} /> Unirse con código
            </Btn>
            <Btn onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Nueva campaña
            </Btn>
          </>
        }
      />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'all', label: `Todas (${campaigns.length})` },
          { key: 'mine', label: `Mis campañas (${myCampaigns.length})` },
          { key: 'public', label: `Públicas (${publicCampaigns.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
            padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
            background: filter === tab.key ? 'var(--accent-light)' : 'transparent',
            color: filter === tab.key ? 'var(--accent-hover)' : 'var(--text-secondary)',
            border: `1px solid ${filter === tab.key ? 'var(--accent)' : 'var(--border)'}`,
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Swords}
          title="No hay campañas"
          description="Crea una nueva campaña o únete a una existente con un código de invitación."
          action={
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Btn variant="ghost" onClick={() => setJoinOpen(true)}>Unirse con código</Btn>
              <Btn onClick={() => setCreateOpen(true)}>Crear campaña</Btn>
            </div>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {shown.map(c => (
            <CampaignCard key={c.id} campaign={c} onClick={() => navigate(`/campaigns/${c.slug}`)} />
          ))}
        </div>
      )}

      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </Layout>
  )
}
