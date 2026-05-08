import { useState, useEffect } from 'react'
import { templates } from '../lib/api'
import { GlassCard, Button, Input, Select, Modal, Textarea, EmptyState } from '../components/ui'
import { Plus, Copy, Check, Trash2, Edit2, Search } from 'lucide-react'

const TYPES = ['Email', 'SMS', 'WhatsApp', 'Appel', 'LinkedIn']
const TYPE_COLORS = {
  'Email': 'bg-blue-500/15 text-blue-400',
  'SMS': 'bg-green-500/15 text-green-400',
  'WhatsApp': 'bg-emerald-500/15 text-emerald-400',
  'Appel': 'bg-violet-500/15 text-violet-400',
  'LinkedIn': 'bg-cyan-500/15 text-cyan-400',
}

export default function Templates() {
  const [allTemplates, setAllTemplates] = useState([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('Tous')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [copied, setCopied] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'Email', subject: '', body: '', tags: '' })

  useEffect(() => {
    templates.getAll().then(r => setAllTemplates(Array.isArray(r.data) ? r.data : []))
  }, [])

  const reload = () => templates.getAll().then(r => setAllTemplates(Array.isArray(r.data) ? r.data : []))

  const filtered = allTemplates.filter(t => {
    const q = search.toLowerCase()
    if (q && !t.name?.toLowerCase().includes(q) && !t.body?.toLowerCase().includes(q)) return false
    if (filterType !== 'Tous' && t.type !== filterType) return false
    return true
  })

  const handleCopy = (t) => {
    navigator.clipboard.writeText(t.body || '')
    setCopied(t.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }
    if (selected) {
      await templates.update(selected.id, payload)
    } else {
      await templates.create(payload)
    }
    setShowModal(false)
    setSelected(null)
    setForm({ name: '', type: 'Email', subject: '', body: '', tags: '' })
    reload()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce template ?')) return
    await templates.delete(id)
    reload()
  }

  const openEdit = (t) => {
    setSelected(t)
    setForm({ ...t, tags: Array.isArray(t.tags) ? t.tags.join(', ') : '' })
    setShowModal(true)
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="page-shell max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Templates</h1>
          <p className="text-white/40 text-sm">{allTemplates.length} template{allTemplates.length !== 1 ? 's' : ''} de messages</p>
        </div>
        <Button size="sm" onClick={() => { setSelected(null); setShowModal(true) }}><Plus size={14} /> Nouveau template</Button>
      </div>

      {/* Filters */}
      <div className="glass p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-black/20 border border-white/8 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search size={15} className="text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un template..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['Tous', ...TYPES].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterType === t ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📝" title="Aucun template" description="Créez des modèles de messages pour accélérer vos prises de contact"
          action={<Button size="sm" onClick={() => setShowModal(true)}><Plus size={14} />Créer un template</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(t => (
            <GlassCard key={t.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-sm">{t.name}</div>
                  {t.subject && <div className="text-xs text-white/40 mt-0.5">Objet: {t.subject}</div>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${TYPE_COLORS[t.type] || 'bg-white/8 text-white/50'}`}>{t.type}</span>
              </div>

              <div className="bg-black/20 border border-white/6 rounded-xl p-3 mb-3 text-sm text-white/60 leading-relaxed max-h-28 overflow-y-auto whitespace-pre-line text-xs">
                {t.body}
              </div>

              {Array.isArray(t.tags) && t.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-3">
                  {t.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-white/6 text-white/35">{tag}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-white/8">
                <Button size="sm" variant="ghost" onClick={() => handleCopy(t)} className={copied === t.id ? 'text-green-400' : ''}>
                  {copied === t.id ? <><Check size={12} /> Copié !</> : <><Copy size={12} /> Copier</>}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Edit2 size={12} /> Modifier</Button>
                <button onClick={() => handleDelete(t.id)} className="ml-auto p-1.5 rounded-lg hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setSelected(null) }} title={selected ? 'Modifier le template' : 'Nouveau template'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Nom *</label><Input value={form.name} onChange={e => f('name', e.target.value)} required placeholder="Relance J+3" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Type</label>
              <Select value={form.type} onChange={e => f('type', e.target.value)}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </div>
          </div>
          {form.type === 'Email' && (
            <div><label className="text-xs text-white/50 mb-1 block">Objet de l'email</label><Input value={form.subject} onChange={e => f('subject', e.target.value)} placeholder="Sujet de l'email..." /></div>
          )}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Contenu du message *</label>
            <Textarea value={form.body} onChange={e => f('body', e.target.value)} placeholder="Bonjour {{prenom}},&#10;&#10;..." rows={6} required />
            <p className="text-xs text-white/25 mt-1">Variables disponibles: {'{{prenom}}'}, {'{{entreprise}}'}, {'{{produit}}'}</p>
          </div>
          <div><label className="text-xs text-white/50 mb-1 block">Tags (séparés par des virgules)</label><Input value={form.tags} onChange={e => f('tags', e.target.value)} placeholder="relance, cold, e-commerce..." /></div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" type="button" onClick={() => { setShowModal(false); setSelected(null) }}>Annuler</Button>
            <Button type="submit">{selected ? 'Sauvegarder' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
