import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { leads, users } from '../lib/api'
import { HeatBadge, StageBadge, Avatar, Button, Input, Select, Modal, EmptyState } from '../components/ui'
import { Search, Plus, Download, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const STAGES = ['Prospect', 'Contacté', 'RDV Pris', 'Proposition Envoyée', 'Gagné', 'Perdu']
const SOURCES = ['Google Maps', 'Inbound', 'Referral', 'Cold Email', 'Instagram', 'Autre']

export default function Leads() {
  const navigate = useNavigate()
  const [allLeads, setAllLeads] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState([])
  const [form, setForm] = useState({ name: '', company: '', sector: '', email: '', phone: '', source: 'Google Maps', heatScore: 'Cold', stage: 'Prospect', assignedCloserId: '', estimatedValue: '' })

  useEffect(() => {
    leads.getAll().then(r => setAllLeads(r.data || []))
    users.getAll().then(r => setAllUsers(r.data || []))
  }, [])

  const reload = () => leads.getAll().then(r => setAllLeads(r.data || []))

  const filtered = allLeads.filter(l => {
    const q = search.toLowerCase()
    return !q || l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q)
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    await leads.create({ ...form, estimatedValue: Number(form.estimatedValue) || 0 })
    setShowModal(false)
    setForm({ name: '', company: '', sector: '', email: '', phone: '', source: 'Google Maps', heatScore: 'Cold', stage: 'Prospect', assignedCloserId: '', estimatedValue: '' })
    reload()
  }

  const handleDeleteSelected = async () => {
    if (!confirm(`Supprimer ${selected.length} lead(s) ?`)) return
    await leads.deleteMany(selected)
    setSelected([])
    reload()
  }

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const exportCSV = () => {
    const rows = [['Nom', 'Entreprise', 'Secteur', 'Email', 'Téléphone', 'Source', 'Statut', 'Chaleur', 'Valeur €']]
    filtered.forEach(l => rows.push([l.name, l.company, l.sector, l.email, l.phone, l.source, l.stage, l.heatScore, l.estimatedValue]))
    const csv = rows.map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'leads.csv'; a.click()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black">Leads</h1>
          <p className="text-white/40 text-sm">{allLeads.length} leads au total</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && <Button variant="danger" size="sm" onClick={handleDeleteSelected}><Trash2 size={14} /> Supprimer ({selected.length})</Button>}
          <Button variant="ghost" size="sm" onClick={exportCSV}><Download size={14} /> CSV</Button>
          <Button size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Nouveau Lead</Button>
        </div>
      </div>

      <div className="glass p-4 mb-4">
        <div className="flex items-center gap-2 bg-black/20 border border-white/8 rounded-xl px-3 py-2">
          <Search size={15} className="text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" />
        </div>
      </div>

      <div className="glass overflow-hidden">
        {filtered.length === 0
          ? <EmptyState icon="🎯" title="Aucun lead" action={<Button size="sm" onClick={() => setShowModal(true)}><Plus size={14} />Créer un lead</Button>} />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/8">
                  <tr>
                    <th className="py-3 px-3 w-8"><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map(l => l.id))} className="accent-cyan-400 cursor-pointer" /></th>
                    {['Nom', 'Entreprise', 'Email', 'Source', 'Statut', 'Chaleur', 'Valeur €', 'Dernier contact'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs text-white/40 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => (
                    <tr key={lead.id} className={`border-b border-white/5 table-row-hover ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`} onClick={() => navigate(`/leads/${lead.id}`)}>
                      <td className="py-3 px-3" onClick={e => { e.stopPropagation(); toggleSelect(lead.id) }}>
                        <input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggleSelect(lead.id)} className="accent-cyan-400 cursor-pointer" />
                      </td>
                      <td className="py-3 px-3 font-medium whitespace-nowrap">{lead.name}</td>
                      <td className="py-3 px-3 text-white/60">{lead.company || '—'}</td>
                      <td className="py-3 px-3 text-white/50 text-xs">{lead.email || '—'}</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-full text-xs bg-white/8 text-white/50">{lead.source}</span></td>
                      <td className="py-3 px-3"><StageBadge stage={lead.stage} /></td>
                      <td className="py-3 px-3"><HeatBadge score={lead.heatScore} /></td>
                      <td className="py-3 px-3 font-semibold text-white/80">{lead.estimatedValue ? `€${lead.estimatedValue.toLocaleString()}` : '—'}</td>
                      <td className="py-3 px-3 text-xs text-white/40 whitespace-nowrap">
                        {lead.lastContactAt ? formatDistanceToNow(new Date(lead.lastContactAt), { locale: fr, addSuffix: true }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau Lead">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Nom *</label><Input value={form.name} onChange={e => f('name', e.target.value)} required placeholder="Sophie Martin" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Entreprise</label><Input value={form.company} onChange={e => f('company', e.target.value)} placeholder="StyleBoutique" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Email</label><Input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="sophie@..." /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Téléphone</label><Input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="06 ..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Secteur</label><Input value={form.sector} onChange={e => f('sector', e.target.value)} placeholder="Mode, Tech..." /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Valeur (€)</label><Input type="number" value={form.estimatedValue} onChange={e => f('estimatedValue', e.target.value)} placeholder="5000" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Source</label>
              <Select value={form.source} onChange={e => f('source', e.target.value)}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div><label className="text-xs text-white/50 mb-1 block">Closer</label>
              <Select value={form.assignedCloserId} onChange={e => f('assignedCloserId', e.target.value)}>
                <option value="">Non assigné</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
