import { useState, useEffect } from 'react'
import { leads, activities, users } from '../lib/api'
import { GlassCard, StatCard, Button } from '../components/ui'
import { Download, TrendingUp, DollarSign, Target, Trophy } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'

const STAGE_COLORS = {
  'Prospect': '#6B7280',
  'Contacté': '#3B82F6',
  'RDV Pris': '#8B5CF6',
  'Proposition Envoyée': '#EAB308',
  'Gagné': '#20D16B',
  'Perdu': '#EF4444',
}

const SOURCE_COLORS = ['#22D3EE', '#8B5CF6', '#EC4899', '#20D16B', '#F59E0B', '#EF4444']

const TOOLTIP_STYLE = {
  contentStyle: { background: '#0D1128', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#F5F7FF', fontSize: 12 },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
}

export default function Reporting() {
  const [allLeads, setAllLeads] = useState([])
  const [allActivities, setAllActivities] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [period, setPeriod] = useState(6) // months

  useEffect(() => {
    leads.getAll().then(r => setAllLeads(r.data || []))
    activities.getAll().then(r => setAllActivities(r.data || []))
    users.getAll().then(r => setAllUsers(r.data || []))
  }, [])

  const fmt = (n) => n >= 1000 ? `€${(n / 1000).toFixed(0)}k` : `€${n}`

  // Monthly leads data
  const monthlyData = Array.from({ length: period }, (_, i) => {
    const d = subMonths(new Date(), period - 1 - i)
    const start = startOfMonth(d)
    const end = endOfMonth(d)
    const monthLeads = allLeads.filter(l => l.createdAt && isWithinInterval(new Date(l.createdAt), { start, end }))
    const won = monthLeads.filter(l => l.stage === 'Gagné')
    const revenue = allLeads.filter(l => l.stage === 'Gagné' && l.stageUpdatedAt && isWithinInterval(new Date(l.stageUpdatedAt), { start, end })).reduce((s, l) => s + (l.estimatedValue || 0), 0)
    return {
      month: format(d, 'MMM', { locale: fr }),
      leads: monthLeads.length,
      gagnés: won.length,
      revenus: revenue,
    }
  })

  // Stage distribution
  const stages = ['Prospect', 'Contacté', 'RDV Pris', 'Proposition Envoyée', 'Gagné', 'Perdu']
  const stageData = stages.map(s => ({
    name: s,
    value: allLeads.filter(l => l.stage === s).length,
    fill: STAGE_COLORS[s],
  })).filter(s => s.value > 0)

  // Source distribution
  const sourceMap = {}
  allLeads.forEach(l => { if (l.source) sourceMap[l.source] = (sourceMap[l.source] || 0) + 1 })
  const sourceData = Object.entries(sourceMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  // Activity types
  const actMap = {}
  allActivities.forEach(a => { if (a.type) actMap[a.type] = (actMap[a.type] || 0) + 1 })
  const actData = Object.entries(actMap).map(([name, value]) => ({ name, value }))

  // Closer performance
  const closerData = allUsers.map(u => {
    const myLeads = allLeads.filter(l => l.assignedCloserId === u.id)
    const won = myLeads.filter(l => l.stage === 'Gagné')
    return {
      name: u.name.split(' ')[0],
      total: myLeads.length,
      gagnés: won.length,
      revenus: won.reduce((s, l) => s + (l.estimatedValue || 0), 0),
      rate: myLeads.length ? Math.round((won.length / myLeads.length) * 100) : 0,
    }
  }).filter(u => u.total > 0).sort((a, b) => b.revenus - a.revenus)

  // Global KPIs
  const won = allLeads.filter(l => l.stage === 'Gagné')
  const active = allLeads.filter(l => !['Gagné', 'Perdu'].includes(l.stage))
  const closingRate = allLeads.length ? ((won.length / allLeads.length) * 100).toFixed(1) : 0
  const totalRevenue = won.reduce((s, l) => s + (l.estimatedValue || 0), 0)

  const exportCSV = () => {
    const rows = [['Mois', 'Leads créés', 'Deals gagnés', 'Revenus']]
    monthlyData.forEach(m => rows.push([m.month, m.leads, m.gagnés, m.revenus]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'reporting.csv'
    a.click()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Reporting</h1>
          <p className="text-white/40 text-sm">Performance globale de votre pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 glass px-1 py-1 rounded-xl">
            {[3, 6, 12].map(m => (
              <button key={m} onClick={() => setPeriod(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === m ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white/70'}`}>
                {m}m
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={exportCSV}><Download size={14} /> Export CSV</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Target size={18} />} value={allLeads.length} label="Total leads" color="cyan" />
        <StatCard icon={<TrendingUp size={18} />} value={`${closingRate}%`} label="Taux de closing" color="violet" />
        <StatCard icon={<DollarSign size={18} />} value={fmt(totalRevenue)} label="Revenus générés" color="green" />
        <StatCard icon={<Trophy size={18} />} value={active.length} label="Leads actifs" color="orange" />
      </div>

      {/* Monthly leads & revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <GlassCard>
          <div className="font-bold text-sm mb-4">Leads créés par mois</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barSize={24}>
              <XAxis dataKey="month" tick={{ fill: 'rgba(245,247,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(245,247,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="leads" fill="#22D3EE" radius={[5, 5, 0, 0]} opacity={0.8} />
              <Bar dataKey="gagnés" fill="#20D16B" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-white/40">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-400/80 inline-block" /> Leads créés</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" /> Gagnés</span>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="font-bold text-sm mb-4">Revenus par mois (€)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fill: 'rgba(245,247,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(245,247,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`€${v.toLocaleString()}`, 'Revenus']} />
              <Line type="monotone" dataKey="revenus" stroke="#8B5CF6" strokeWidth={2.5} dot={{ fill: '#8B5CF6', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Stage + Source distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <GlassCard>
          <div className="font-bold text-sm mb-4">Répartition par étape</div>
          {stageData.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">Aucun lead</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                  {stageData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0D1128', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#F5F7FF', fontSize: 12 }} />
                <Legend formatter={(v) => <span style={{ color: 'rgba(245,247,255,0.6)', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard>
          <div className="font-bold text-sm mb-4">Sources de leads</div>
          {sourceData.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">Aucun lead</div>
          ) : (
            <div className="flex flex-col gap-2">
              {sourceData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                  <div className="flex-1 text-sm text-white/70">{s.name}</div>
                  <div className="text-sm font-semibold text-white/80">{s.value}</div>
                  <div className="w-24 h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(s.value / allLeads.length) * 100}%`, background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                  </div>
                  <div className="text-xs text-white/40 w-8 text-right">{Math.round((s.value / allLeads.length) * 100)}%</div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Closer performance */}
      {closerData.length > 0 && (
        <GlassCard>
          <div className="font-bold text-sm mb-4">Performance des closers</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={closerData} barSize={28}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(245,247,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(245,247,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="total" fill="rgba(34,211,238,0.5)" radius={[5, 5, 0, 0]} name="Total leads" />
              <Bar dataKey="gagnés" fill="#20D16B" radius={[5, 5, 0, 0]} name="Gagnés" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}
    </div>
  )
}
