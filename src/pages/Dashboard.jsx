import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { leads, activities, users } from '../lib/api'
import { StatCard, GlassCard, HeatBadge, StageBadge, Avatar, Button, Modal, Input, Select, EmptyState } from '../components/ui'
import { Target, TrendingUp, DollarSign, Zap, Clock, Trophy, Plus, Phone, Mail, Calendar, FileText } from 'lucide-react'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const STAGES = ['Prospect', 'Contacté', 'RDV Pris', 'Proposition Envoyée', 'Gagné', 'Perdu']
const STAGE_COLORS = { 'Prospect': '#6B7280', 'Contacté': '#3B82F6', 'RDV Pris': '#8B5CF6', 'Proposition Envoyée': '#EAB308', 'Gagné': '#20D16B', 'Perdu': '#EF4444' }

const activityIcon = (type) => {
  const map = { call: <Phone size={13} />, email: <Mail size={13} />, meeting: <Calendar size={13} />, note: <FileText size={13} /> }
  return map[type] || <FileText size={13} />
}
const activityColor = (type) => {
  const map = { call: 'text-green-400 bg-green-500/15', email: 'text-blue-400 bg-blue-500/15', meeting: 'text-violet-400 bg-violet-500/15', note: 'text-orange-400 bg-orange-500/15' }
  return map[type] || 'text-white/40 bg-white/8'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [allLeads, setAllLeads] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', source: 'Google Maps', estimatedValue: '' })

  useEffect(() => {
    leads.getAll().then(r => setAllLeads(r.data || []))
    activities.getRecent(8).then(r => setRecentActivities(r.data || []))
    users.getAll().then(r => setAllUsers(r.data || []))
  }, [])

  const won = allLeads.filter(l => l.stage === 'Gagné')
  const active = allLeads.filter(l => !['Gagné', 'Perdu'].includes(l.stage))
  const closingRate = allLeads.length ? ((won.length / allLeads.length) * 100).toFixed(1) : 0
  const revenue = won.reduce((s, l) => s + (l.estimatedValue || 0), 0)
  const pipelineValue = active.reduce((s, l) => s + (l.estimatedValue || 0), 0)

  const wonWithDates = won.filter(l => l.createdAt && l.stageUpdatedAt)
  const avgCycle = wonWithDates.length
    ? Math.round(wonWithDates.reduce((s, l) => s + differenceInDays(new Date(l.stageUpdatedAt), new Date(l.createdAt)), 0) / wonWithDates.length)
    : 0

  const stageData = STAGES.map(s => ({ name: s.split(' ')[0], count: allLeads.filter(l => l.stage === s).length, fill: STAGE_COLORS[s] }))

  // Closer leaderboard
  const closerStats = allUsers.map(u => {
    const myLeads = allLeads.filter(l => l.assignedCloserId === u.id)
    const myWon = myLeads.filter(l => l.stage === 'Gagné')
    return { ...u, total: myLeads.length, won: myWon.length, revenue: myWon.reduce((s, l) => s + (l.estimatedValue || 0), 0), rate: myLeads.length ? ((myWon.length / myLeads.length) * 100).toFixed(0) : 0 }
  }).filter(u => u.total > 0).sort((a, b) => b.revenue - a.revenue)

  const medals = ['🥇', '🥈', '🥉']

  const handleAddLead = async (e) => {
    e.preventDefault()
    await leads.create({ ...form, estimatedValue: Number(form.estimatedValue) || 0 })
    setShowAddModal(false)
    setForm({ name: '', company: '', email: '', phone: '', source: 'Google Maps', estimatedValue: '' })
    leads.getAll().then(r => setAllLeads(r.data || []))
  }

  const fmt = (n) => n >= 1000 ? `€${(n / 1000).toFixed(0)}k` : `€${n}`

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Dashboard</h1>
          <p className="text-white/40 text-sm">Vue d'ensemble de votre pipeline</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}><Plus size={16} /> Nouveau Lead</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={<Target size={18} />} value={allLeads.length} label="Total Leads" color="cyan" />
        <StatCard icon={<Zap size={18} />} value={allLeads.filter(l => { const d = new Date(l.createdAt); return d.getMonth() === new Date().getMonth() }).length} label="Ce mois" color="blue" />
        <StatCard icon={<TrendingUp size={18} />} value={`${closingRate}%`} label="Taux de closing" color="violet" />
        <StatCard icon={<DollarSign size={18} />} value={fmt(revenue)} label="Revenus générés" color="green" />
        <StatCard icon={<DollarSign size={18} />} value={fmt(pipelineValue)} label="Pipeline actif" color="pink" />
        <StatCard icon={<Clock size={18} />} value={`${avgCycle}j`} label="Cycle moyen" sub="Prospect → Gagné" color="orange" />
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <GlassCard className="lg:col-span-2">
          <div className="font-bold text-sm mb-4">Pipeline par étape</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stageData} barSize={28}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(245,247,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(245,247,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0D1128', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#F5F7FF', fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stageData.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <div className="font-bold text-sm mb-3">Activité récente</div>
          {recentActivities.length === 0
            ? <EmptyState icon="📭" title="Aucune activité" description="Les activités apparaîtront ici" />
            : (
              <div className="flex flex-col gap-2">
                {recentActivities.map(a => (
                  <div key={a.id} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white/4 cursor-pointer transition-colors" onClick={() => a.lead && navigate(`/leads/${a.lead.id}`)}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${activityColor(a.type)}`}>
                      {activityIcon(a.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{a.lead?.name || '—'}</div>
                      <div className="text-xs text-white/40 truncate">{a.content}</div>
                    </div>
                    <div className="text-xs text-white/30 shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(a.createdAt), { locale: fr, addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </GlassCard>
      </div>

      {/* Leaderboard */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-yellow-400" />
          <div className="font-bold text-sm">Top Closers</div>
        </div>
        {closerStats.length === 0
          ? <EmptyState icon="👤" title="Aucun closer" description="Assignez des leads à vos closers" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/7">
                    {['#', 'Closer', 'Leads', 'Deals Gagnés', 'Revenus', 'Closing Rate'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs text-white/40 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {closerStats.map((u, i) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/4 transition-colors">
                      <td className="py-3 px-3 text-sm">{medals[i] || `${i + 1}`}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={u.name} size="xs" />
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-white/70">{u.total}</td>
                      <td className="py-3 px-3 text-green-400 font-semibold">{u.won}</td>
                      <td className="py-3 px-3 text-white/70">{fmt(u.revenue)}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-violet-500/15 text-violet-400">{u.rate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </GlassCard>

      {/* Floating add button */}
      <button onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 w-13 h-13 btn-grad rounded-2xl flex items-center justify-center shadow-2xl z-40 w-12 h-12"
        style={{ boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }}>
        <Plus size={22} />
      </button>

      {/* Add lead modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Nouveau Lead">
        <form onSubmit={handleAddLead} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Nom *</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Sophie Martin" required /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Entreprise</label><Input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="StyleBoutique" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Email</label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="sophie@..." /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Téléphone</label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="06 ..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Source</label>
              <Select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                {['Google Maps', 'Inbound', 'Referral', 'Cold Email', 'Instagram', 'Autre'].map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div><label className="text-xs text-white/50 mb-1 block">Valeur estimée (€)</label><Input type="number" value={form.estimatedValue} onChange={e => setForm(p => ({ ...p, estimatedValue: e.target.value }))} placeholder="5000" /></div>
          </div>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="ghost" type="button" onClick={() => setShowAddModal(false)}>Annuler</Button>
            <Button type="submit">Créer le lead</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
