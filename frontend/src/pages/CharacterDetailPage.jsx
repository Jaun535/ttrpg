import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { charactersApi, campaignsApi } from '../api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/common/Layout'
import { Btn, Card, Spinner, ConfirmDialog, Modal, FormField, TagInput } from '../components/common/UI'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'

const STATUS_COLORS = { alive: 'var(--success)', dead: 'var(--danger)', unknown: 'var(--warning)', retired: 'var(--text-muted)' }
const STATUS_LABELS_ES = { alive: 'Vivo', dead: 'Muerto', unknown: 'Desconocido', retired: 'Retirado' }
const STATUSES = ['alive', 'dead', 'unknown', 'retired']

function EditCharacterModal({ open, onClose, campaign, character, isGm }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: character.name || '',
    race: character.race || '',
    character_class: character.character_class || '',
    level: character.level || 1,
    status: character.status || 'alive',
    description: character.description || '',
    personality: character.personality || '',
    backstory: character.backstory || '',
    notes: character.notes || '',
    is_public: character.is_public ?? true,
    tags: character.tags || [],
    stats: character.stats || {},
  })
  const [portrait, setPortrait] = useState(null)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const mutation = useMutation({
    mutationFn: async () => {
      const resp = await charactersApi.update(campaign.slug, character.id, form)
      if (portrait) await charactersApi.uploadPortrait(campaign.slug, character.id, portrait)
      return resp
    },
    onSuccess: () => {
      qc.invalidateQueries(['character', campaign.slug, String(character.id)])
      qc.invalidateQueries(['characters', campaign.slug])
      onClose()
    },
    onError: err => setError(err.response?.data?.error || 'Error al guardar'),
  })

  return (
    <Modal open={open} onClose={onClose} title={`Editar — ${character.name}`} width={620}>
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
        <FormField label="Nuevo retrato (opcional)">
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
        <>
          <FormField label="Notas del GM (privadas)">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </FormField>
          <FormField>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_public} onChange={e => set('is_public', e.target.checked)} style={{ width: 'auto' }} />
              <span style={{ fontSize: '0.88rem' }}>Visible para todos los jugadores</span>
            </label>
          </FormField>
        </>
      )}
      <FormField label="Tags">
        <TagInput tags={form.tags} onChange={t => set('tags', t)} />
      </FormField>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.name.trim()}>
          Guardar cambios
        </Btn>
      </div>
    </Modal>
  )
}

export default function CharacterDetailPage() {
  const { slug, id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: campaign } = useQuery({
    queryKey: ['campaign', slug],
    queryFn: () => campaignsApi.get(slug).then(r => r.data),
  })
  const { data: char, isLoading } = useQuery({
    queryKey: ['character', slug, id],
    queryFn: () => charactersApi.get(slug, id).then(r => r.data),
  })

  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const isGm = campaign?.my_role === 'gm' || campaign?.my_role === 'co_gm' || user?.is_site_admin
  const canEdit = isGm || char?.player?.id === user?.id || char?.creator?.id === user?.id

  const deleteMutation = useMutation({
    mutationFn: () => charactersApi.delete(slug, id),
    onSuccess: () => navigate(`/campaigns/${slug}/${char?.is_npc ? 'npcs' : 'characters'}`),
  })

  if (isLoading) return <Layout campaign={campaign}><Spinner /></Layout>
  if (!char) return <Layout campaign={campaign}><p style={{ color: 'var(--text-secondary)' }}>Personaje no encontrado.</p></Layout>

  return (
    <Layout campaign={campaign}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Btn variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Volver
        </Btn>
        {canEdit && (
          <>
            <Btn size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
              <Edit size={16} /> Editar
            </Btn>
            <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(true)}>
              <Trash2 size={16} /> Eliminar
            </Btn>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        {/* Columna izquierda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {char.portrait_url ? (
            <img src={char.portrait_url} alt={char.name}
              style={{ width: '100%', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }} />
          ) : (
            <div style={{
              width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-lg)',
              background: char.is_npc ? 'var(--danger-light)' : 'var(--accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '4rem', border: '1px solid var(--border)'
            }}>
              {char.is_npc ? '🗡️' : '🧙'}
            </div>
          )}

          <Card>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-gold)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              Información
            </h3>
            {[
              ['Estado', <span style={{ color: STATUS_COLORS[char.status] }}>{STATUS_LABELS_ES[char.status] || char.status}</span>],
              char.race        && ['Raza', char.race],
              char.character_class && ['Clase', char.character_class],
              char.level       && ['Nivel', char.level],
              char.player      && ['Jugador', char.player.display_name || char.player.username],
              char.creator     && ['Creado por', char.creator.display_name || char.creator.username],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0',
                borderBottom: '1px solid var(--border)', fontSize: '0.85rem'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </Card>

          {char.tags?.length > 0 && (
            <Card>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {char.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
              </div>
            </Card>
          )}
        </div>

        {/* Columna derecha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--accent-gold)' }}>
                {char.name}
              </h1>
              {char.is_npc && (
                <span style={{
                  fontSize: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)',
                  padding: '0.1rem 0.4rem', borderRadius: 4
                }}>NPC</span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {[char.race, char.character_class].filter(Boolean).join(' · ')}
            </p>
          </div>

          {char.description && (
            <Card>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-gold)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Descripción</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{char.description}</p>
            </Card>
          )}
          {char.personality && (
            <Card>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-gold)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Personalidad</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{char.personality}</p>
            </Card>
          )}
          {char.backstory && (
            <Card>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-gold)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Trasfondo</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{char.backstory}</p>
            </Card>
          )}
          {isGm && char.notes && (
            <Card style={{ borderColor: 'var(--gm-color)', background: 'var(--danger-light)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gm-color)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Notas del GM
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{char.notes}</p>
            </Card>
          )}
          {char.stats && Object.keys(char.stats).length > 0 && (
            <Card>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-gold)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                Estadísticas
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem' }}>
                {Object.entries(char.stats).map(([k, v]) => (
                  <div key={k} style={{
                    textAlign: 'center', background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)', padding: '0.5rem'
                  }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent)' }}>{v}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{k}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {editOpen && (
        <EditCharacterModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          campaign={campaign}
          character={char}
          isGm={isGm}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Eliminar personaje"
        message={`¿Eliminar a "${char.name}" permanentemente? Esta acción no se puede deshacer.`}
      />
    </Layout>
  )
}
