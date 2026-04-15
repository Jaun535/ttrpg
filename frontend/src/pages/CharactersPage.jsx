import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { charactersApi, campaignsApi } from '../api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/common/Layout'
import { Btn, Card, Modal, FormField, EmptyState, Spinner, TagInput, PageHeader, SearchBar, ConfirmDialog } from '../components/common/UI'
import { Users, Plus, Swords, Shield, User } from 'lucide-react'

const STATUSES = ['alive', 'dead', 'unknown', 'retired']
const STATUS_COLORS = { alive: 'var(--success)', dead: 'var(--danger)', unknown: 'var(--warning)', retired: 'var(--text-muted)' }
const STATUS_LABELS_ES = { alive: 'Vivo', dead: 'Muerto', unknown: 'Desconocido', retired: 'Retirado' }

function CharacterCard({ character, onClick }) {
  return (
    <Card onClick={onClick} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      {character.portrait_url ? (
        <img src={character.portrait_url} alt={character.name}
          style={{ width: 64, height: 64, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 64, height: 64, borderRadius: 'var(--radius-sm)', flexShrink: 0,
          background: character.is_npc ? 'var(--danger-light)' : 'var(--accent-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem'
        }}>
          {character.is_npc ? '🗡️' : '🧙'}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{character.name}</h3>
          <span style={{ fontSize: '0.72rem', color: STATUS_COLORS[character.status], fontWeight: 600 }}>
            ● {STATUS_LABELS_ES[character.status] || character.status}
          </span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', marginBottom: '0.25rem' }}>
          {[character.race, character.character_class, character.level ? `Nv.${character.level}` : null].filter(Boolean).join(' · ')}
        </p>
        {character.player && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
            Jugador: {character.player.display_name || character.player.username}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {character.tags?.map(t => <span key={t} className="tag-chip">{t}</span>)}
        </div>
      </div>
    </Card>
  )
}

function CharacterModal({ open, onClose, campaign, character, isNpc }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isGm = campaign?.my_role === 'gm' || campaign?.my_role === 'co_gm' || user?.is_site_admin

  const blank = { name: '', race: '', character_class: '', level: 1, status: 'alive',
    backstory: '', description: '', personality: '', notes: '', is_public: true, is_npc: isNpc || false, tags: [] }

  const [form, setForm] = useState(character || blank)
  const [portrait, setPortrait] = useState(null)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      let resp
      if (character) {
        resp = await charactersApi.update(campaign.slug, character.id, form)
      } else {
        resp = await charactersApi.create(campaign.slug, { ...form, is_npc: isNpc })
      }
      if (portrait) {
        await charactersApi.uploadPortrait(campaign.slug, resp.data.id, portrait)
      }
      return resp
    },
    onSuccess: () => {
      qc.invalidateQueries(['characters', campaign.slug])
      onClose()
    },
    onError: err => setError(err.response?.data?.error || 'Error'),
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={character ? 'Editar personaje' : (isNpc ? 'Nuevo NPC' : 'Nuevo personaje')} width={620}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
        <FormField label="Nombre *" error={error}>
          <input value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
        </FormField>
        <FormField label="Estado">
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS_ES[s]}</option>)}
          </select>
        </FormField>
        <FormField label="Raza / Especie">
          <input value={form.race} onChange={e => set('race', e.target.value)} placeholder="Humano, Elfo..." />
        </FormField>
        <FormField label="Clase / Rol">
          <input value={form.character_class} onChange={e => set('character_class', e.target.value)} placeholder="Guerrero, Mago..." />
        </FormField>
        <FormField label="Nivel">
          <input type="number" value={form.level} onChange={e => set('level', parseInt(e.target.value) || 1)} min={1} />
        </FormField>
        <FormField label="Retrato (imagen)">
          <input type="file" accept="image/*" onChange={e => setPortrait(e.target.files[0])} style={{ paddingTop: '0.4rem' }} />
        </FormField>
      </div>

      <FormField label="Descripción física">
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
      </FormField>
      <FormField label="Personalidad">
        <textarea value={form.personality} onChange={e => set('personality', e.target.value)} rows={2} />
      </FormField>
      <FormField label="Trasfondo">
        <textarea value={form.backstory} onChange={e => set('backstory', e.target.value)} rows={3} />
      </FormField>
      {isGm && (
        <FormField label="Notas del GM (privadas)">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
        </FormField>
      )}
      <FormField label="Tags">
        <TagInput tags={form.tags} onChange={t => set('tags', t)} />
      </FormField>
      {isGm && (
        <FormField>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_public} onChange={e => set('is_public', e.target.checked)} style={{ width: 'auto' }} />
            <span style={{ fontSize: '0.88rem' }}>Visible para todos los jugadores</span>
          </label>
        </FormField>
      )}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.name.trim()}>
          {character ? 'Guardar' : 'Crear'}
        </Btn>
      </div>
    </Modal>
  )
}

export default function CharactersPage({ npc }) {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: campaign } = useQuery({ queryKey: ['campaign', slug], queryFn: () => campaignsApi.get(slug).then(r => r.data) })
  const { data: characters = [], isLoading } = useQuery({
    queryKey: ['characters', slug, npc],
    queryFn: () => charactersApi.list(slug, { npc: npc ? 'true' : 'false' }).then(r => r.data),
  })

  const isGm = campaign?.my_role === 'gm' || campaign?.my_role === 'co_gm' || user?.is_site_admin
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  const allTags = [...new Set(characters.flatMap(c => c.tags || []))]
  const filtered = characters.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchTag = !tagFilter || c.tags?.includes(tagFilter)
    return matchSearch && matchTag
  })

  return (
    <Layout campaign={campaign}>
      <PageHeader
        title={npc ? 'NPCs' : 'Personajes Jugadores'}
        subtitle={`${filtered.length} personaje${filtered.length !== 1 ? 's' : ''}`}
        actions={
          (isGm || !npc) && (
            <Btn onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> {npc ? 'Nuevo NPC' : 'Nuevo personaje'}
            </Btn>
          )
        }
      />

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre..." style={{ flex: '1 1 200px' }} />
        {allTags.length > 0 && (
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} style={{ width: 'auto', flex: '0 1 160px' }}>
            <option value="">Todos los tags</option>
            {allTags.map(t => <option key={t}>{t}</option>)}
          </select>
        )}
      </div>

      {isLoading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState icon={npc ? Swords : Users} title={`No hay ${npc ? 'NPCs' : 'personajes'} todavía`}
          action={(isGm || !npc) && <Btn onClick={() => setCreateOpen(true)}>Crear {npc ? 'NPC' : 'personaje'}</Btn>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(c => (
            <CharacterCard key={c.id} character={c} onClick={() => navigate(`/campaigns/${slug}/characters/${c.id}`)} />
          ))}
        </div>
      )}

      <CharacterModal open={createOpen} onClose={() => setCreateOpen(false)} campaign={campaign} isNpc={npc} />
    </Layout>
  )
}
