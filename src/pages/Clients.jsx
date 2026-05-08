import { useState, useEffect } from 'react'
import { clients } from '../lib/api'
import { GlassCard, Button, Input, Select, Modal, Avatar, Badge, EmptyState } from '../components/ui'
import { Plus, ExternalLink, Search, Trash2, Mail, Phone, TrendingUp } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUSES = ['Actif', 'En pause', 'Terminé']
const STATUS_COLORS = {
  'Actif': 'bg-green-500/15 text-green-400 border border-green-500/20',
  'En pause': 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  'Terminé': 'bg-white/8 text-white/40 border border-white/10',
}
const SERVICES = ['Social Media', 'Ads Meta', 'Ads Google', 'Email Marketing', 'SEO', 'Site Web', 'Pack Complet', 'Autre']

export default function Clients() {
  const [allClients, setAllClients] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('Tous')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', website: '', service: 'Social Media', monthlyValue: '', status: 'Actif', notes: '' })

  useEffect(() => {
    clients.getAll().then(r => setAllClients(Array.isArray(r.data) ? r.data : []))
  }, [])

  const reload = () => clients.getAll().then(r => setAllClients(Array.isArray(r.data) ? r.data : []))

  const filtered = allClients.filter(c => {
    const q = search.toLowerCase()
    if (q && !c.name?.toLowerCase().includes(q) && !c.company?.toLowerCase().includes(q) && !c.email?.toLowerCase().includes(q)) return false
    if (filterStatus !== 'Tous' && c.status !== filterStatus) return false
    return true
  })

  const activeClients = allClients.filter(c => c.status === 'Actif')
  const mrr = activeClients.reduce((s, c) => s + (c.monthlyValue || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selected) {
      await clients.update(selected.id, form)
    } else {
      await clients.create({ ...form, monthlyValue: Number(form.monthlyValue) || 0 })
    }
    setShowModal(false)
    setSelected(null)
    setForm({ name: '', company: '', email: '', phone: '', website: '', service: 'Social Media', monthlyValue: '', status: 'Actif', notes: '' })
    reload()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce client ?')) return
    await clients.delete(id)
    reload()
  }

  const openEdit = (c) => {
    setSelected(c)
    setForm({ ...c, monthlyValue: c.monthlyValue || '' })
    setShowModal(true)
  }

  const fmt = (n) => n >= 1000 ? `€${(n / 1000).toFixed(0)}k` : `€${n}`
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="page-shell max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Clients Actifs</h1>
          <p className="text-white/40 text-sm">{activeClients.length} client{activeClients.length !== 1 ? 's' : ''} actifs • MRR: <span className="text-green-400 font-semibold">{fmt(mrr)}/mois</span></p>
        </div>
        <Button size="sm" onClick={() => { setSelected(null); setShowModal(true) }}><Plus size={14} /> Nouveau client</Button>
      </div>

      {/* KPI banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="glass p-4 rounded-2xl text-center">
          <div className="text-2xl font-black text-green-400">{fmt(mrr)}</div>
          <div className="text-xs text-white/40 mt-1">MRR (revenus mensuels)</div>
        </div>
        <div className="glass p-4 rounded-2xl text-center">
          <div className="text-2xl font-black text-cyan-400">{activeClients.length}</div>
          <div className="text-xs text-white/40 mt-1">Clients actifs</div>
        </div>
        <div className="glass p-4 rounded-2xl text-center">
          <div className="text-2xl font-black text-white/80">{fmt(mrr * 12)}</div>
          <div className="text-xs text-white/40 mt-1">ARR projeté</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass p-4 mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-black/20 border border-white/8 rounded-xl px-3 py-2 flex-1">
          <Search size={15} className="text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" />
        </div>
        <div className="flex gap-1">
          {['Tous', ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterStatus === s ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Client grid */}
      {filtered.length === 0 ? (
        <EmptyState icon="🤝" title="Aucun client" description="Ajoutez vos clients actifs pour suivre votre MRR"
          action={<Button size="sm" onClick={() => setShowModal(true)}><Plus size={14} />Ajouter un client</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <GlassCard key={c.id} className="cursor-pointer hover:border-white/15 transition-all" onClick={() => openEdit(c)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Avatar name={c.name} size="sm" />
                  <div>
                    <div className="font-bold text-sm">{c.name}</div>
                    <div className="text-xs text-white/40">{c.company}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[c.status] || STATUS_COLORS['Actif']}`}>{c.status}</span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-white/40 mb-0.5">Service</div>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-violet-500/15 text-violet-400">{c.service}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/40 mb-0.5">Mensuel</div>
                  <div className="text-lg font-black text-green-400">{c.monthlyValue ? fmt(c.monthlyValue) : '—'}</div>
                </div>
              </div>

              {c.notes && <p className="text-xs text-white/35 mb-3 line-clamp-2">{c.notes}</p>}

              <div className="flex items-center gap-3 pt-3 border-t border-white/8" onClick={e => e.stopPropagation()}>
                {c.email && <a href={`mailto:${c.email}`} className="text-white/30 hover:text-blue-400 transition-colors"><Mail size={13} /></a>}
                {c.phone && <a href={`tel:${c.phone}`} className="text-white/30 hover:text-green-400 transition-colors"><Phone size={13} /></a>}
                {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-violet-400 transition-colors"><ExternalLink size={13} /></a>}
                <span className="ml-auto text-xs text-white/25">
                  {c.startDate ? `Depuis ${format(new Date(c.startDate), 'MMM yyyy', { locale: fr })}` : ''}
                </span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }} className="p-1 rounded-lg hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setSelected(null) }} title={selected ? 'Modifier le client' : 'Nouveau client'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Nom *</label><Input value={form.name} onChange={e => f('name', e.target.value)} required placeholder="Sophie Martin" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Entreprise</label><Input value={form.company} onChange={e => f('company', e.target.value)} placeholder="StyleBoutique" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Email</label><Input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="sophie@..." /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Téléphone</label><Input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="06 ..." /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Service</label>
              <Select value={form.service} onChange={e => f('service', e.target.value)}>
                {SERVICES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div><label className="text-xs text-white/50 mb-1 block">Valeur mensuelle (€)</label><Input type="number" value={form.monthlyValue} onChange={e => f('monthlyValue', e.target.value)} placeholder="1500" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Statut</label>
              <Select value={form.status} onChange={e => f('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div><label className="text-xs text-white/50 mb-1 block">Site web</label><Input value={form.website} onChange={e => f('website', e.target.value)} placeholder="https://..." /></div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Notes internes..." rows={2}
              className="input-base px-3 py-2 text-sm w-full resize-none" />
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" type="button" onClick={() => { setShowModal(false); setSelected(null) }}>Annuler</Button>
            <Button type="submit">{selected ? 'Sauvegarder' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
