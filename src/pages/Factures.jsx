import { useState, useEffect } from 'react'
import { factures, clients } from '../lib/api'
import { GlassCard, Button, Input, Modal, EmptyState } from '../components/ui'
import { Plus, Trash2, Download, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS = {
  brouillon: { label: 'Brouillon', color: 'text-white/40 bg-white/8', icon: <FileText size={12} /> },
  envoyee: { label: 'Envoyée', color: 'text-blue-400 bg-blue-500/15', icon: <Clock size={12} /> },
  payee: { label: 'Payée', color: 'text-green-400 bg-green-500/15', icon: <CheckCircle size={12} /> },
  retard: { label: 'En retard', color: 'text-red-400 bg-red-500/15', icon: <AlertCircle size={12} /> },
}

export default function Factures() {
  const [allFactures, setAllFactures] = useState([])
  const [allClients, setAllClients] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [form, setForm] = useState({
    clientId: '', clientName: '', montant: '', description: '',
    dateEcheance: '', status: 'brouillon',
  })

  useEffect(() => {
    factures.getAll().then(r => setAllFactures(r.data || []))
    clients.getAll().then(r => setAllClients(r.data || []))
  }, [])

  const reload = () => factures.getAll().then(r => setAllFactures(r.data || []))

  const filtered = allFactures.filter(f =>
    filterStatus === 'all' || f.status === filterStatus
  )

  const totalCA = allFactures.filter(f => f.status === 'payee').reduce((s, f) => s + (Number(f.montant) || 0), 0)
  const totalEnAttente = allFactures.filter(f => f.status === 'envoyee').reduce((s, f) => s + (Number(f.montant) || 0), 0)

  const handleCreate = async (e) => {
    e.preventDefault()
    const client = allClients.find(c => c.id === form.clientId)
    await factures.create({
      ...form,
      clientName: client?.name || client?.company || form.clientName,
      montant: Number(form.montant),
    })
    setShowModal(false)
    setForm({ clientId: '', clientName: '', montant: '', description: '', dateEcheance: '', status: 'brouillon' })
    reload()
  }

  const handleStatus = async (id, status) => {
    await factures.update(id, { status })
    reload()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette facture ?')) return
    await factures.delete(id)
    reload()
  }

  const exportCSV = () => {
    const rows = [['Numéro', 'Client', 'Montant €', 'Statut', 'Échéance', 'Description']]
    filtered.forEach(f => rows.push([
      f.numero || f.id, f.clientName, f.montant, f.status,
      f.dateEcheance || '', f.description || ''
    ]))
    const csv = rows.map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'factures.csv'
    a.click()
  }

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Factures</h1>
          <p className="text-white/40 text-sm">{allFactures.length} factures au total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={exportCSV}><Download size={14} /> CSV</Button>
          <Button onClick={() => setShowModal(true)}><Plus size={14} /> Nouvelle Facture</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <GlassCard className="text-center">
          <div className="text-2xl font-black text-green-400">{fmt(totalCA)}</div>
          <div className="text-xs text-white/40 mt-1">CA encaissé</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-2xl font-black text-blue-400">{fmt(totalEnAttente)}</div>
          <div className="text-xs text-white/40 mt-1">En attente</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-2xl font-black text-red-400">
            {fmt(allFactures.filter(f => f.status === 'retard').reduce((s, f) => s + (Number(f.montant) || 0), 0))}
          </div>
          <div className="text-xs text-white/40 mt-1">En retard</div>
        </GlassCard>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{ key: 'all', label: 'Toutes' }, ...Object.entries(STATUS).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterStatus === f.key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0
        ? <EmptyState icon="💰" title="Aucune facture" description="Créez votre première facture client" />
        : (
          <div className="glass overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7">
                  {['N°', 'Client', 'Montant', 'Statut', 'Échéance', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs text-white/40 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => {
                  const s = STATUS[f.status] || STATUS.brouillon
                  return (
                    <tr key={f.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-white/60">{f.numero || f.id}</td>
                      <td className="py-3 px-4 font-medium">{f.clientName || '—'}</td>
                      <td className="py-3 px-4 font-bold text-white">{fmt(f.montant)}</td>
                      <td className="py-3 px-4">
                        <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                          {s.icon} {s.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white/50 text-xs">
                        {f.dateEcheance ? format(parseISO(f.dateEcheance), 'dd/MM/yyyy', { locale: fr }) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 justify-end">
                          {f.status === 'envoyee' && (
                            <button onClick={() => handleStatus(f.id, 'payee')} className="text-white/30 hover:text-green-400 transition-colors" title="Marquer payée">
                              <CheckCircle size={15} />
                            </button>
                          )}
                          {f.status === 'brouillon' && (
                            <button onClick={() => handleStatus(f.id, 'envoyee')} className="text-white/30 hover:text-blue-400 transition-colors" title="Marquer envoyée">
                              <Clock size={15} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(f.id)} className="text-white/20 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvelle Facture">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Client</label>
            <select
              value={form.clientId}
              onChange={e => {
                const c = allClients.find(x => x.id === e.target.value)
                setForm(p => ({ ...p, clientId: e.target.value, clientName: c?.name || c?.company || '' }))
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
            >
              <option value="">Choisir un client existant...</option>
              {allClients.map(c => <option key={c.id} value={c.id}>{c.name || c.company}</option>)}
            </select>
          </div>
          {!form.clientId && (
            <div>
              <label className="text-xs text-white/50 mb-1 block">Ou nom client libre</label>
              <Input value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} placeholder="Revolution Ecom SARL" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Montant (€) *</label>
              <Input type="number" value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))} placeholder="1500" required />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Date d'échéance</label>
              <Input type="date" value={form.dateEcheance} onChange={e => setForm(p => ({ ...p, dateEcheance: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Création site web, refonte boutique Shopify..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 resize-none placeholder:text-white/25"
            />
          </div>
          <div className="flex gap-3 justify-end mt-1">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
