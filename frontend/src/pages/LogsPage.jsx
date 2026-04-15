import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logsApi, documentsApi, campaignsApi } from '../api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/common/Layout'
import RichEditor from '../components/common/RichEditor'
import { Btn, Card, Modal, FormField, EmptyState, Spinner, TagInput, PageHeader, SearchBar, ConfirmDialog } from '../components/common/UI'
import { Scroll, Plus, FolderOpen, Trash2, Download, ArrowLeft, Edit, Lock, FileText, Image, File } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'

/* ─── LOG MODAL (crear y editar) ─────────────────────────────── */

function LogModal({ open, onClose, campaign, log }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isGm = campaign?.my_role === 'gm' || campaign?.my_role === 'co_gm' || user?.is_site_admin

  const blank = { title: '', content: '', session_number: '', session_date: '', is_gm_only: false, tags: [] }
  const initial = log
    ? { title: log.title, content: log.content || '', session_number: log.session_number || '',
        session_date: log.session_date || '', is_gm_only: log.is_gm_only, tags: log.tags || [] }
    : blank

  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => log
      ? logsApi.update(campaign.slug, log.id, form)
      : logsApi.create(campaign.slug, form),
    onSuccess: () => {
      qc.invalidateQueries(['logs', campaign.slug])
      if (log) qc.invalidateQueries(['log', campaign.slug, String(log.id)])
      onClose()
    },
    onError: err => setError(err.response?.data?.error || 'Error al guardar'),
  })

  return (
    <Modal open={open} onClose={onClose} title={log ? 'Editar crónica' : 'Nueva entrada de sesión'} width={720}>
      <FormField label="Título *" error={error}>
        <input value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
        <FormField label="Número de sesión">
          <input type="number" value={form.session_number}
            onChange={e => set('session_number', e.target.value)} min={1} />
        </FormField>
        <FormField label="Fecha de sesión">
          <input type="date" value={form.session_date}
            onChange={e => set('session_date', e.target.value)} />
        </FormField>
      </div>
      <FormField label="Tags">
        <TagInput tags={form.tags} onChange={t => set('tags', t)} />
      </FormField>
      {isGm && (
        <FormField>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_gm_only}
              onChange={e => set('is_gm_only', e.target.checked)} style={{ width: 'auto' }} />
            <span style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={14} color="var(--gm-color)" /> Solo visible para GM
            </span>
          </label>
        </FormField>
      )}
      <FormField label="Crónica">
        <RichEditor
          content={form.content}
          onChange={html => set('content', html)}
          placeholder="Escribe lo que ocurrió en la sesión..."
        />
      </FormField>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.title.trim()}>
          {log ? 'Guardar cambios' : 'Publicar'}
        </Btn>
      </div>
    </Modal>
  )
}

/* ─── LOGS LIST PAGE ─────────────────────────────────────────── */

export function LogsPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: campaign } = useQuery({
    queryKey: ['campaign', slug],
    queryFn: () => campaignsApi.get(slug).then(r => r.data),
  })
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['logs', slug],
    queryFn: () => logsApi.list(slug).then(r => r.data),
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = logs.filter(l =>
    !search || l.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout campaign={campaign}>
      <PageHeader
        title="Crónicas de sesión"
        subtitle={`${filtered.length} entrada${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <Btn onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Nueva entrada
          </Btn>
        }
      />
      <SearchBar value={search} onChange={setSearch} placeholder="Buscar sesión..."
        style={{ marginBottom: '1.25rem' }} />

      {isLoading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState
          icon={Scroll}
          title="Sin crónicas todavía"
          description="Documenta tus aventuras sesión por sesión."
          action={<Btn onClick={() => setCreateOpen(true)}>Crear primera entrada</Btn>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(log => (
            <Card key={log.id} onClick={() => navigate(`/campaigns/${slug}/logs/${log.id}`)}
              style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{
                minWidth: 56, textAlign: 'center', background: 'var(--accent-light)',
                borderRadius: 'var(--radius-sm)', padding: '0.5rem', flexShrink: 0
              }}>
                {log.session_number ? (
                  <>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
                      {log.session_number}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Sesión
                    </div>
                  </>
                ) : <Scroll size={24} color="var(--accent)" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{log.title}</h3>
                  {log.is_gm_only && <Lock size={12} color="var(--gm-color)" />}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  {log.session_date ? format(new Date(log.session_date), 'dd/MM/yyyy') : ''}
                  {log.session_date && log.author ? ' · ' : ''}
                  {log.author?.display_name || log.author?.username}
                </p>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {log.tags?.map(t => <span key={t} className="tag-chip">{t}</span>)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <LogModal open={createOpen} onClose={() => setCreateOpen(false)} campaign={campaign} />
    </Layout>
  )
}

/* ─── LOG DETAIL PAGE ────────────────────────────────────────── */

export function LogDetailPage() {
  const { slug, id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: campaign } = useQuery({
    queryKey: ['campaign', slug],
    queryFn: () => campaignsApi.get(slug).then(r => r.data),
  })
  const { data: log, isLoading } = useQuery({
    queryKey: ['log', slug, id],
    queryFn: () => logsApi.get(slug, id).then(r => r.data),
  })

  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const isGm = campaign?.my_role === 'gm' || campaign?.my_role === 'co_gm' || user?.is_site_admin
  // El autor puede editar/borrar su propio log; los GMs pueden editar cualquiera
  const canEdit = isGm || log?.author?.id === user?.id

  const deleteMutation = useMutation({
    mutationFn: () => logsApi.delete(slug, id),
    onSuccess: () => navigate(`/campaigns/${slug}/logs`),
  })

  if (isLoading) return <Layout campaign={campaign}><Spinner /></Layout>
  if (!log) return (
    <Layout campaign={campaign}>
      <p style={{ color: 'var(--text-secondary)' }}>Entrada no encontrada.</p>
    </Layout>
  )

  return (
    <Layout campaign={campaign}>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Btn variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${slug}/logs`)}>
          <ArrowLeft size={16} /> Crónicas
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
        {log.session_number && (
          <span style={{
            background: 'var(--accent-light)', color: 'var(--accent)',
            padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.85rem', fontWeight: 600
          }}>
            Sesión {log.session_number}
          </span>
        )}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--accent-gold)' }}>
          {log.title}
        </h1>
        {log.is_gm_only && <Lock size={16} color="var(--gm-color)" />}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {log.session_date
          ? format(new Date(log.session_date), "d 'de' MMMM 'de' yyyy", { locale: es })
          : ''}
        {log.author && ` · Por ${log.author.display_name || log.author.username}`}
      </p>

      {log.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {log.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
        </div>
      )}

      <div className="article-content" dangerouslySetInnerHTML={{ __html: log.content }} />

      {editOpen && (
        <LogModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          campaign={campaign}
          log={log}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Eliminar crónica"
        message={`¿Eliminar "${log.title}" permanentemente? Esta acción no se puede deshacer.`}
      />
    </Layout>
  )
}

/* ─── DOCUMENTS PAGE ─────────────────────────────────────────── */

function fileIcon(mime) {
  if (!mime) return <File size={24} />
  if (mime.startsWith('image/')) return <Image size={24} />
  if (mime.includes('pdf')) return <FileText size={24} />
  return <File size={24} />
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function DocumentsPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: campaign } = useQuery({
    queryKey: ['campaign', slug],
    queryFn: () => campaignsApi.get(slug).then(r => r.data),
  })
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents', slug],
    queryFn: () => documentsApi.list(slug).then(r => r.data),
  })

  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', is_gm_only: false, tags: [] })
  const [deleteTarget, setDeleteTarget] = useState(null)

  const isGm = campaign?.my_role === 'gm' || campaign?.my_role === 'co_gm' || user?.is_site_admin
  const filtered = docs.filter(d =>
    !search || d.title.toLowerCase().includes(search.toLowerCase())
  )

  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', uploadForm.title || file.name)
      fd.append('description', uploadForm.description)
      fd.append('is_gm_only', uploadForm.is_gm_only)
      fd.append('tags', uploadForm.tags.join(','))
      return documentsApi.upload(slug, fd)
    },
    onSuccess: () => {
      qc.invalidateQueries(['documents', slug])
      setUploadOpen(false)
      setFile(null)
      setUploadForm({ title: '', description: '', is_gm_only: false, tags: [] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => documentsApi.delete(slug, id),
    onSuccess: () => qc.invalidateQueries(['documents', slug]),
  })

  return (
    <Layout campaign={campaign}>
      <PageHeader
        title="Documentos"
        subtitle={`${filtered.length} archivo${filtered.length !== 1 ? 's' : ''}`}
        actions={<Btn onClick={() => setUploadOpen(true)}><Plus size={16} /> Subir archivo</Btn>}
      />
      <SearchBar value={search} onChange={setSearch} placeholder="Buscar documentos..."
        style={{ marginBottom: '1.25rem' }} />

      {isLoading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Sin documentos"
          description="Sube mapas, reglas, ilustraciones o cualquier archivo relevante."
          action={<Btn onClick={() => setUploadOpen(true)}>Subir primer archivo</Btn>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {filtered.map(doc => (
            <Card key={doc.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--accent)', flexShrink: 0 }}>{fileIcon(doc.mime_type)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.title}
                  </p>
                  {doc.description && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                      {doc.description}
                    </p>
                  )}
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {formatSize(doc.file_size)} · {doc.uploader?.username} ·{' '}
                    {formatDistanceToNow(new Date(doc.created_at), { locale: es, addSuffix: true })}
                  </p>
                </div>
              </div>
              {doc.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {doc.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a href={doc.file_url} download={doc.original_filename} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                  <Btn variant="ghost" size="sm" style={{ width: '100%', justifyContent: 'center' }}>
                    <Download size={14} /> Descargar
                  </Btn>
                </a>
                {(isGm || doc.uploader?.id === user?.id) && (
                  <Btn size="sm" variant="danger" onClick={() => setDeleteTarget(doc)}>
                    <Trash2 size={14} />
                  </Btn>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Subir documento" width={480}>
        <FormField label="Archivo *">
          <input type="file" onChange={e => {
            const f = e.target.files[0]
            setFile(f)
            if (f) setUploadForm(p => ({ ...p, title: p.title || f.name }))
          }} style={{ paddingTop: '0.4rem' }} />
        </FormField>
        <FormField label="Título">
          <input value={uploadForm.title} onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))} />
        </FormField>
        <FormField label="Descripción">
          <textarea value={uploadForm.description}
            onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))} rows={2} />
        </FormField>
        <FormField label="Tags">
          <TagInput tags={uploadForm.tags} onChange={t => setUploadForm(p => ({ ...p, tags: t }))} />
        </FormField>
        {isGm && (
          <FormField>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={uploadForm.is_gm_only}
                onChange={e => setUploadForm(p => ({ ...p, is_gm_only: e.target.checked }))}
                style={{ width: 'auto' }} />
              <span style={{ fontSize: '0.88rem' }}>Solo GM</span>
            </label>
          </FormField>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <Btn variant="ghost" onClick={() => setUploadOpen(false)}>Cancelar</Btn>
          <Btn onClick={() => uploadMutation.mutate()} loading={uploadMutation.isPending} disabled={!file}>
            Subir
          </Btn>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
        title="Eliminar documento"
        message={`¿Eliminar "${deleteTarget?.title}"?`}
      />
    </Layout>
  )
}
