import { useState, useEffect } from 'react'
import { leads, users } from '../lib/api'
import { GlassCard, Avatar, Button, Input, Select, Modal, StatCard, HeatBadge } from '../components/ui'
import { Trophy, TrendingUp, DollarSign, Target, Plus, Trash2, Mail, Phone } from 'lucide-react'
import { differenceInDays } from 'date-fns'

const medals = ['🥇', '🥈', '🥉']

export default function Closers() {
  const [allLeads, setAllLeads] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'closer' })

  useEffect(() => {
    leads.getAll().then(r => setAllLeads(r.data || []))
    users.getAll().then(r => setAllUsers(r.data || []))
  }, [])

  const reload = () => users.getAll().then(r => setAllUsers(r.data || []))

  const closerStats = allUsers
    .filter(u => u.role === 'closer' || u.role === 'admin')
    .map(u => {
      const myLeads = allLeads.filter(l => l.assignedCloserId === u.id)
      const myWon = myLeads.filter(l => l.stage === 'Gagné')
      const myLost = myLeads.filter(l => l.stage === 'Perdu')
      const active = myLeads.filter(l => !['Gagné', 'Perdu'].includes(l.stage))
      const revenue = myWon.reduce((s, l) => s + (l.estimatedValue || 0), 0)
      const pipeline = active.reduce((s, l) => s + (l.estimatedValue || 0), 0)
      const rate = myLeads.length ? ((myWon.length / myLeads.length) * 100).toFixed(0) : 0
      const wonWithDates = myWon.filter(l => l.createdAt && l.stageUpdatedAt)
      const avgCycle = wonWithDates.length
        ? Math.round(wonWithDates.reduce((s, l) => s + differenceInDays(new Date(l.stageUpdatedAt), new Date(l.createdAt)), 0) / wonWithDates.length)
        : 0
      return { ...u, total: myLeads.length, won: myWon.length, lost: myLost.length, active: active.length, revenue, pipeline, rate, avgCycle }
    })
    .sort((a, b) => b.revenue - a.revenue)

  const totalRevenue = closerStats.reduce((s, u) => s + u.revenue, 0)
  const totalWon = closerStats.reduce((s, u) => s + u.won, 0)
  const fmt = (n) => n >= 1000 ? `€${(n / 1000).toFixed(0)}k` : `€${n}`

  const handleCreate = async (e) => {
    e.preventDefault()
    await users.create(form)
    setShowModal(false)
    setForm({ name: '', email: '', phone: '', role: 'closer' })
    reload()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce closer ?')) return
    await users.delete(id)
    reload()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Closers</h1>
          <p className="text-white/40 text-sm">{allUsers.length} membre{allUsers.length !== 1 ? 's' : ''} dans l'équipe</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Ajouter un closer</Button>
      </div>

      {/* Team KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Target size={18} />} value={closerStats.reduce((s, u) => s + u.total, 0)} label="Total leads assignés" color="cyan" />
        <StatCard icon={<Trophy size={18} />} value={totalWon} label="Deals gagnés" color="green" />
        <StatCard icon={<DollarSign size={18} />} value={fmt(totalRevenue)} label="Revenus totaux" color="violet" />
        <StatCard icon={<TrendingUp size={18} />} value={`${closerStats.reduce((s, u) => s + u.active, 0)}`} label="Leads actifs" color="orange" />
      </div>

      {/* Leaderboard */}
      <GlassCard className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-yellow-400" />
          <div className="font-bold text-sm">Classement des closers</div>
        </div>
        {closerStats.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">Aucun closer — ajoutez des membres</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/8">
                <tr>
                  {['#', 'Closer', 'Leads', 'Gagnés', 'Perdus', 'Actifs', 'Pipeline', 'Revenus', 'Taux', 'Cycle moy.'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-xs text-white/40 font-medium whitespace-nowrap">{h}</th>
                  ))}
                  <th className="py-3 px-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {closerStats.map((u, i) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/4 transition-colors">
                    <td className="py-3 px-3 text-sm">{medals[i] || `${i + 1}`}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={u.name} size="sm" />
                        <div>
                          <div className="font-medium text-sm">{u.name}</div>
                          <div className="text-xs text-white/35">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-white/70">{u.total}</td>
                    <td className="py-3 px-3 text-green-400 font-semibold">{u.won}</td>
                    <td className="py-3 px-3 text-red-400">{u.lost}</td>
                    <td className="py-3 px-3 text-cyan-400">{u.active}</td>
                    <td className="py-3 px-3 text-white/60">{u.pipeline > 0 ? fmt(u.pipeline) : '—'}</td>
                    <td className="py-3 px-3 text-white/80 font-semibold">{u.revenue > 0 ? fmt(u.revenue) : '—'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        Number(u.rate) >= 50 ? 'bg-green-500/15 text-green-400' :
                        Number(u.rate) >= 25 ? 'bg-yellow-500/15 text-yellow-400' :
                        'bg-white/8 text-white/50'
                      }`}>{u.rate}%</span>
                    </td>
                    <td className="py-3 px-3 text-white/50 text-xs">{u.avgCycle > 0 ? `${u.avgCycle}j` : '—'}</td>
                    <td className="py-3 px-3">
                      <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Closer cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {closerStats.map((u, i) => (
          <GlassCard key={u.id}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar name={u.name} size="md" />
                <div>
                  <div className="font-bold">{u.name} {medals[i]}</div>
                  <div className="text-xs text-white/40 capitalize">{u.role}</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${Number(u.rate) >= 50 ? 'bg-green-500/15 text-green-400' : 'bg-white/8 text-white/50'}`}>
                {u.rate}% closing
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center p-2 rounded-xl bg-white/4">
                <div className="text-lg font-black text-white">{u.total}</div>
                <div className="text-xs text-white/35">Leads</div>
              </div>
              <div className="text-center p-2 rounded-xl bg-green-500/8">
                <div className="text-lg font-black text-green-400">{u.won}</div>
                <div className="text-xs text-white/35">Gagnés</div>
              </div>
              <div className="text-center p-2 rounded-xl bg-cyan-500/8">
                <div className="text-lg font-black text-cyan-400">{u.active}</div>
                <div className="text-xs text-white/35">Actifs</div>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-sm">
              {u.email && (
                <a href={`mailto:${u.email}`} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                  <Mail size={13} className="text-blue-400 shrink-0" /> {u.email}
                </a>
              )}
              {u.phone && (
                <a href={`tel:${u.phone}`} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                  <Phone size={13} className="text-green-400 shrink-0" /> {u.phone}
                </a>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-white/8 flex justify-between text-xs text-white/40">
              <span>Revenus: <span className="text-white/70 font-semibold">{u.revenue > 0 ? fmt(u.revenue) : '—'}</span></span>
              <span>Pipeline: <span className="text-cyan-400/70">{u.pipeline > 0 ? fmt(u.pipeline) : '—'}</span></span>
            </div>
          </GlassCard>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Ajouter un closer">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Nom *</label>
            <Input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Marc Dupont" required />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Email *</label>
            <Input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="marc@..." required />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Téléphone</label>
            <Input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="06 ..." />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Rôle</label>
            <Select value={form.role} onChange={e => f('role', e.target.value)}>
              <option value="closer">Closer</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
