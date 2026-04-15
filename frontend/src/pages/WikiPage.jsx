import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { wikiApi, campaignsApi } from '../api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/common/Layout'
import RichEditor from '../components/common/RichEditor'
import { Btn, Card, Modal, FormField, EmptyState, Spinner, TagInput, PageHeader, SearchBar, ConfirmDialog } from '../components/common/UI'
import { BookOpen, Plus, Edit, Trash2, ArrowLeft, Lock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const CATEGORIES = ['Ubicación', 'Facción', 'Personaje', 'Objeto', 'Historia', 'Regla', 'Bestiario', 'Otro']

function WikiModal({ open, onClose, campaign, article }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isGm = campaign?.my_role === 'gm' || campaign?.my_role === 'co_gm' || user?.is_site_admin

  const blank = { title: '', content: '', category: '', is_gm_only: false, tags: [] }
  const [form, setForm] = useState(article ? {
    title: article.title, content: article.content, category: article.category || '',
    is_gm_only: article.is_gm_only, tags: article.tags || []
  } : blank)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => article
      ? wikiApi.update(campaign.slug, article.id, form)
      : wikiApi.create(campaign.slug, form),
    onSuccess: () => { qc.invalidateQueries(['wiki', campaign.slug]); onClose() },
    onError: err => setError(err.response?.data?.error || 'Error'),
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={article ? 'Editar artículo' : 'Nuevo artículo wiki'} width={720}>
      <FormField label="Título *" error={error}>
        <input value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
        <FormField label="Categoría">
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">Sin categoría</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="Tags">
          <TagInput tags={form.tags} onChange={t => set('tags', t)} />
        </FormField>
      </div>
      {isGm && (
        <FormField>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_gm_only} onChange={e => set('is_gm_only', e.target.checked)} style={{ width: 'auto' }} />
            <span style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={14} color="var(--gm-color)" /> Solo GM (invisible para jugadores)
            </span>
          </label>
        </FormField>
      )}
      <FormField label="Contenido">
        <RichEditor content={form.content} onChange={html => set('content', html)} placeholder="Escribe el artículo..." />
      </FormField>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.title.trim()}>
          {article ? 'Guardar' : 'Publicar'}
        </Btn>
      </div>
    </Modal>
  )
}

export default function WikiPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: campaign } = useQuery({ queryKey: ['campaign', slug], queryFn: () => campaignsApi.get(slug).then(r => r.data) })
  const { data: tags = [] } = useQuery({ queryKey: ['wiki-tags', slug], queryFn: () => wikiApi.tags(slug).then(r => r.data) })

  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const isGm = campaign?.my_role === 'gm' || campaign?.my_role === 'co_gm' || user?.is_site_admin

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['wiki', slug, search, tagFilter, categoryFilter],
    queryFn: () => wikiApi.list(slug, { q: search, tag: tagFilter, category: categoryFilter }).then(r => r.data),
  })

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = articles.filter(a => a.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})
  const uncategorized = articles.filter(a => !a.category || !CATEGORIES.includes(a.category))

  const showGrouped = !search && !tagFilter && !categoryFilter

  return (
    <Layout campaign={campaign}>
      <PageHeader
        title="Wiki"
        subtitle={`${articles.length} artículo${articles.length !== 1 ? 's' : ''}`}
        actions={<Btn onClick={() => setCreateOpen(true)}><Plus size={16} /> Nuevo artículo</Btn>}
      />

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar en la wiki..." style={{ flex: '1 1 200px' }} />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: 'auto', flex: '0 1 160px' }}>
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        {tags.length > 0 && (
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} style={{ width: 'auto', flex: '0 1 140px' }}>
            <option value="">Todos los tags</option>
            {tags.map(t => <option key={t.name}>{t.name} ({t.count})</option>)}
          </select>
        )}
      </div>

      {isLoading ? <Spinner /> : articles.length === 0 ? (
        <EmptyState icon={BookOpen} title="La wiki está vacía" description="Crea el primer artículo para documentar el mundo de tu campaña."
          action={<Btn onClick={() => setCreateOpen(true)}>Crear artículo</Btn>} />
      ) : showGrouped ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-gold)', fontSize: '1.1rem', marginBottom: '0.6rem', paddingBottom: '0.3rem', borderBottom: '1px solid var(--border)' }}>
                {cat}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.6rem' }}>
                {items.map(a => <WikiCard key={a.id} article={a} onClick={() => navigate(`/campaigns/${slug}/wiki/${a.id}`)} />)}
              </div>
            </div>
          ))}
          {uncategorized.length > 0 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '0.6rem', paddingBottom: '0.3rem', borderBottom: '1px solid var(--border)' }}>
                Sin categoría
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.6rem' }}>
                {uncategorized.map(a => <WikiCard key={a.id} article={a} onClick={() => navigate(`/campaigns/${slug}/wiki/${a.id}`)} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.6rem' }}>
          {articles.map(a => <WikiCard key={a.id} article={a} onClick={() => navigate(`/campaigns/${slug}/wiki/${a.id}`)} />)}
        </div>
      )}

      <WikiModal open={createOpen} onClose={() => setCreateOpen(false)} campaign={campaign} />
    </Layout>
  )
}

function WikiCard({ article, onClick }) {
  return (
    <Card onClick={onClick} style={{ padding: '0.9rem' }}>
      {article.cover_image_url && (
        <img src={article.cover_image_url} alt={article.title} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: '0.6rem' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.3rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', flex: 1 }}>{article.title}</h3>
        {article.is_gm_only && <Lock size={12} color="var(--gm-color)" style={{ flexShrink: 0, marginTop: 3 }} />}
      </div>
      {article.category && <p style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', marginBottom: '0.3rem' }}>{article.category}</p>}
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        {article.tags?.map(t => <span key={t} className="tag-chip">{t}</span>)}
      </div>
    </Card>
  )
}

export function WikiArticlePage() {
  const { slug, id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: campaign } = useQuery({ queryKey: ['campaign', slug], queryFn: () => campaignsApi.get(slug).then(r => r.data) })
  const { data: article, isLoading } = useQuery({ queryKey: ['wiki-article', slug, id], queryFn: () => wikiApi.get(slug, id).then(r => r.data) })

  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const isGm = campaign?.my_role === 'gm' || campaign?.my_role === 'co_gm' || user?.is_site_admin

  const deleteMutation = useMutation({
    mutationFn: () => wikiApi.delete(slug, id),
    onSuccess: () => navigate(`/campaigns/${slug}/wiki`),
  })

  if (isLoading) return <Layout campaign={campaign}><Spinner /></Layout>
  if (!article) return <Layout campaign={campaign}><p>Artículo no encontrado.</p></Layout>

  return (
    <Layout campaign={campaign}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Btn variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${slug}/wiki`)}>
          <ArrowLeft size={16} /> Wiki
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => setEditOpen(true)}><Edit size={16} /> Editar</Btn>
        {isGm && <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(true)}><Trash2 size={16} /></Btn>}
      </div>

      {article.cover_image_url && (
        <img src={article.cover_image_url} alt={article.title} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', border: '1px solid var(--border)' }} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--accent-gold)' }}>{article.title}</h1>
            {article.is_gm_only && <span style={{ background: 'var(--danger-light)', color: 'var(--gm-color)', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Lock size={11} /> Solo GM</span>}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Por {article.author?.display_name || article.author?.username} ·{' '}
            {formatDistanceToNow(new Date(article.updated_at), { locale: es, addSuffix: true })}
            {article.last_editor && ` · Editado por ${article.last_editor.display_name || article.last_editor.username}`}
          </p>
          <div className="article-content" dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>

        <div style={{ position: 'sticky', top: '5rem' }}>
          {article.category && (
            <Card style={{ marginBottom: '0.75rem', padding: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Categoría</p>
              <p style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{article.category}</p>
            </Card>
          )}
          {article.tags?.length > 0 && (
            <Card style={{ marginBottom: '0.75rem', padding: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Tags</p>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {article.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
              </div>
            </Card>
          )}
          {article.revisions?.length > 0 && (
            <Card style={{ padding: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Historial</p>
              {article.revisions.slice(-5).reverse().map(r => (
                <div key={r.id} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.2rem 0', borderBottom: '1px solid var(--border)' }}>
                  {r.editor?.username} · {formatDistanceToNow(new Date(r.created_at), { locale: es, addSuffix: true })}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      <WikiModal open={editOpen} onClose={() => setEditOpen(false)} campaign={campaign} article={article} />
      <ConfirmDialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Eliminar artículo" message={`¿Eliminar "${article.title}" permanentemente?`} />
    </Layout>
  )
}
