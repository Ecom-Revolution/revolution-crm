import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { leads, activities, users, auth } from '../lib/api'
import { StatCard, GlassCard, HeatBadge, StageBadge, Avatar, Button, Modal, Input, Select, EmptyState } from '../components/ui'
import { Target, TrendingUp, DollarSign, Zap, Clock, Trophy, Plus, Phone, Mail, Calendar, FileText, ArrowUpRight, Sparkles, Flame, CalendarCheck, Activity } from 'lucide-react'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

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
  const currentUser = auth.getSession()
  const [allLeads, setAllLeads] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', source: 'Google Maps', estimatedValue: '' })

  useEffect(() => {
    leads.getAll().then(r => setAllLeads(Array.isArray(r.data) ? r.data : []))
    activities.getRecent(8).then(r => setRecentActivities(Array.isArray(r.data) ? r.data : []))
    users.getAll().then(r => setAllUsers(Array.isArray(r.data) ? r.data : []))
  }, [])

  const won = allLeads.filter(l => l.stage === 'Gagné')
  const active = allLeads.filter(l => !['Gagné', 'Perdu'].includes(l.stage))
  const newThisMonth = allLeads.filter(l => {
    if (!l.createdAt) return false
    const d = new Date(l.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const hotLeads = active.filter(l => l.heatScore === 'Hot')
  const rdvReady = active.filter(l => l.stage === 'RDV Pris' || l.rdvDate)
  const closingRate = allLeads.length ? ((won.length / allLeads.length) * 100).toFixed(1) : 0
  const revenue = won.reduce((s, l) => s + (l.estimatedValue || 0), 0)
  const pipelineValue = active.reduce((s, l) => s + (l.estimatedValue || 0), 0)
  const priorityLeads = [...active]
    .sort((a, b) => {
      const heat = { Hot: 3, Warm: 2, Cold: 1 }
      return (heat[b.heatScore] || 0) - (heat[a.heatScore] || 0) || (b.estimatedValue || 0) - (a.estimatedValue || 0)
    })
    .slice(0, 3)
  const focusScore = Math.min(99, Math.max(12, hotLeads.length * 16 + rdvReady.length * 10 + active.length * 2))

  const wonWithDates = won.filter(l => l.createdAt && l.stageUpdatedAt)
  const avgCycle = wonWithDates.length
    ? Math.round(wonWithDates.reduce((s, l) => s + differenceInDays(new Date(l.stageUpdatedAt), new Date(l.createdAt)), 0) / wonWithDates.length)
    : 0

  const stageData = STAGES.map(s => ({ name: s.split(' ')[0], count: allLeads.filter(l => l.stage === s).length, fill: STAGE_COLORS[s] }))
  const stageTotal = stageData.reduce((s, item) => s + item.count, 0) || 1

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
    leads.getAll().then(r => setAllLeads(Array.isArray(r.data) ? r.data : []))
  }

  const fmt = (n) => n >= 1000 ? `€${(n / 1000).toFixed(0)}k` : `€${n}`

  return (
    <div className="page-shell">
      <section className="dashboard-hero crm-command-hero glass p-5 sm:p-7 mb-6 animate-fade-up">
        <div className="hero-grid absolute inset-0 opacity-30" />
        <div className="relative z-10 grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                <Sparkles size={14} />
                Command center
              </div>
              <div className="flex flex-col gap-5">
                <div>
                  <h1 className="max-w-3xl text-4xl sm:text-6xl font-black leading-[0.95]">
                    Mission Control<br />
                    <span className="grad">Revolution CRM</span>
                  </h1>
                  <p className="mt-5 max-w-2xl text-sm sm:text-base leading-relaxed text-white/68">
                    Bonjour {currentUser?.name?.split(' ')[0] || 'Sofiane'}. Ton espace de pilotage met en avant les leads à closer, les RDV à suivre et la valeur active du pipeline.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setShowAddModal(true)} size="lg">
                    <Plus size={18} /> Nouveau Lead
                  </Button>
                  <Button variant="ghost" size="lg" onClick={() => navigate('/pipeline')}>
                    Pipeline <ArrowUpRight size={17} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: <Flame size={15} />, value: hotLeads.length, label: 'Hot leads', color: 'text-red-300' },
                { icon: <CalendarCheck size={15} />, value: rdvReady.length, label: 'RDV / suivis', color: 'text-violet-300' },
                { icon: <Activity size={15} />, value: fmt(pipelineValue), label: 'Actif', color: 'text-green-300' },
              ].map((item, i) => (
                <div key={item.label} className="hero-metric-card animate-fade-up" style={{ animationDelay: `${80 * (i + 1)}ms` }}>
                  <div className={`mb-2 flex items-center gap-1.5 text-xs ${item.color}`}>{item.icon}{item.label}</div>
                  <div className="text-2xl sm:text-3xl font-black leading-none">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mission-visual rounded-[24px] border border-white/12 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-white/42">Live pipeline</div>
                <div className="mt-1 text-xl font-black">Focus score {focusScore}</div>
              </div>
              <div className="rounded-full border border-green-300/25 bg-green-300/10 px-3 py-1 text-xs font-bold text-green-200">
                Online
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="radar-board">
                <div className="radar-sweep" />
                <div className="radar-ring ring-a" />
                <div className="radar-ring ring-b" />
                <div className="radar-ring ring-c" />
                <span className="signal-node node-a" />
                <span className="signal-node node-b" />
                <span className="signal-node node-c" />
                <div className="radar-core">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-white/42">Conversion</span>
                  <strong>{closingRate}%</strong>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                <div className="grid grid-cols-6 gap-1.5">
                  {stageData.map(stage => (
                    <button key={stage.name} onClick={() => navigate('/pipeline')} className="stage-strip command-stage-card h-20 rounded-2xl border border-white/8 p-2 text-left">
                      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(8, (stage.count / stageTotal) * 100)}%`, background: stage.fill }} />
                      </div>
                      <div className="text-[10px] text-white/46 truncate">{stage.name}</div>
                      <div className="text-lg font-black">{stage.count}</div>
                    </button>
                  ))}
                </div>

                <div className="deal-stream">
                  {priorityLeads.length === 0 ? (
                    <div className="rounded-2xl border border-white/8 bg-black/18 p-4 text-sm text-white/55">
                      Ajoute ou importe des leads pour alimenter les priorités du cockpit.
                    </div>
                  ) : priorityLeads.map((lead, i) => (
                    <button key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}
                      className="deal-row group" style={{ animationDelay: `${120 * i}ms` }}>
                      <div className="deal-row-index">{String(i + 1).padStart(2, '0')}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black">{lead.company || lead.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <HeatBadge score={lead.heatScore} />
                          <StageBadge stage={lead.stage} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-green-200">{fmt(lead.estimatedValue || 0)}</div>
                        <div className="mt-1 text-xs text-white/34 group-hover:text-white/60">ouvrir</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6 animate-fade-up delay-1">
        <StatCard icon={<Target size={18} />} value={allLeads.length} label="Total Leads" color="cyan" />
        <StatCard icon={<Zap size={18} />} value={newThisMonth} label="Ce mois" color="blue" />
        <StatCard icon={<TrendingUp size={18} />} value={`${closingRate}%`} label="Taux de closing" color="violet" />
        <StatCard icon={<DollarSign size={18} />} value={fmt(revenue)} label="Revenus générés" color="green" />
        <StatCard icon={<DollarSign size={18} />} value={fmt(pipelineValue)} label="Pipeline actif" color="pink" />
        <StatCard icon={<Clock size={18} />} value={`${avgCycle}j`} label="Cycle moyen" sub="Prospect → Gagné" color="orange" />
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5 animate-fade-up delay-2">
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-sm">Pipeline par étape</div>
              <div className="text-xs text-white/38">Répartition actuelle des opportunités</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pipeline')}>Ouvrir</Button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageData} barSize={28}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(245,247,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(245,247,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0D1128', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#F5F7FF', fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stageData.map((entry, i) => (
                  <Cell key={entry.name + i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="min-h-[280px]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm">Activité récente</div>
              <div className="text-xs text-white/38">Derniers contacts et notes</div>
            </div>
            <Clock size={16} className="text-white/35" />
          </div>
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
      <GlassCard className="animate-fade-up delay-3">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-yellow-400" />
          <div className="font-bold text-sm">Top Closers</div>
        </div>
        {closerStats.length === 0
          ? <EmptyState icon="👤" title="Aucun closer" description="Assignez des leads à vos closers" />
          : (
            <>
            <div className="md:hidden flex flex-col gap-2">
              {closerStats.map((u, i) => (
                <div key={u.id} className="rounded-2xl border border-white/8 bg-black/18 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="w-8 text-sm">{medals[i] || `${i + 1}`}</div>
                      <Avatar name={u.name} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{u.name}</div>
                        <div className="text-xs text-white/38">{u.total} leads • {u.won} gagnés</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-green-300">{fmt(u.revenue)}</div>
                      <div className="text-xs text-violet-300">{u.rate}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
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
            </>
          )
        }
      </GlassCard>

      {/* Floating add button */}
      <button onClick={() => setShowAddModal(true)}
        className="fixed bottom-[92px] right-4 md:bottom-6 md:right-6 btn-grad rounded-2xl flex items-center justify-center shadow-2xl z-40 w-12 h-12"
        style={{ boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }}>
        <Plus size={22} />
      </button>

      {/* Add lead modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Nouveau Lead">
        <form onSubmit={handleAddLead} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Nom *</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Sophie Martin" required /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Entreprise</label><Input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="StyleBoutique" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Email</label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="sophie@..." /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Téléphone</label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="06 ..." /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
