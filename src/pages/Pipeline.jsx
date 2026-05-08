import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { leads, users } from '../lib/api'
import { HeatBadge, StageBadge, Avatar, Button, Input, Select, EmptyState } from '../components/ui'
import { Search, Filter, ChevronUp, ChevronDown, Download, Plus, Trash2, ChevronRight } from 'lucide-react'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

const STAGES = ['Prospect', 'Contacté', 'RDV Pris', 'Proposition Envoyée', 'Gagné', 'Perdu']

const WORKFLOW_STEPS = [
  {
    stage: 'Prospect',
    icon: '🎯',
    color: 'text-white/60',
    bg: 'bg-white/6 border-white/10',
    activeBg: 'bg-white/10 border-white/20',
    action: 'Scraper / Inbound',
    desc: 'Lead identifié, pas encore contacté',
  },
  {
    stage: 'Contacté',
    icon: '📞',
    color: 'text-blue-400',
    bg: 'bg-blue-500/6 border-blue-500/15',
    activeBg: 'bg-blue-500/15 border-blue-500/30',
    action: 'Premier contact',
    desc: 'Email cold ou appel de prise de contact',
  },
  {
    stage: 'RDV Pris',
    icon: '📅',
    color: 'text-violet-400',
    bg: 'bg-violet-500/6 border-violet-500/15',
    activeBg: 'bg-violet-500/15 border-violet-500/30',
    action: 'Discovery call',
    desc: 'RDV planifié — qualifier les besoins',
  },
  {
    stage: 'Proposition Envoyée',
    icon: '📄',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/6 border-yellow-500/15',
    activeBg: 'bg-yellow-500/15 border-yellow-500/30',
    action: 'Proposition commerciale',
    desc: 'Devis / offre envoyée, en attente de retour',
  },
  {
    stage: 'Gagné',
    icon: '✅',
    color: 'text-green-400',
    bg: 'bg-green-500/6 border-green-500/15',
    activeBg: 'bg-green-500/15 border-green-500/30',
    action: 'Deal signé',
    desc: 'Paiement reçu — onboarding client',
  },
  {
    stage: 'Perdu',
    icon: '❌',
    color: 'text-red-400',
    bg: 'bg-red-500/6 border-red-500/15',
    activeBg: 'bg-red-500/15 border-red-500/30',
    action: 'Lead perdu',
    desc: 'Raison identifiée — archivé',
  },
]
const SOURCES = ['Tous', 'Google Maps', 'Inbound', 'Referral', 'Cold Email', 'Instagram', 'Autre']
const HEAT = ['Tous', 'Hot', 'Warm', 'Cold']

export default function Pipeline() {
  const navigate = useNavigate()
  const [allLeads, setAllLeads] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('Tous')
  const [filterSource, setFilterSource] = useState('Tous')
  const [filterHeat, setFilterHeat] = useState('Tous')
  const [filterCloser, setFilterCloser] = useState('Tous')
  const [sortKey, setSortKey] = useState('lastContactAt')
  const [sortDir, setSortDir] = useState('desc')
  const [selected, setSelected] = useState([])
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const PER_PAGE = 25

  useEffect(() => {
    leads.getAll().then(r => setAllLeads(Array.isArray(r.data) ? r.data : []))
    users.getAll().then(r => setAllUsers(Array.isArray(r.data) ? r.data : []))
  }, [])

  const reload = () => leads.getAll().then(r => setAllLeads(Array.isArray(r.data) ? r.data : []))

  const getUser = (id) => allUsers.find(u => u.id === id)

  const filtered = allLeads
    .filter(l => {
      const q = search.toLowerCase()
      if (q && !l.name?.toLowerCase().includes(q) && !l.company?.toLowerCase().includes(q) && !l.email?.toLowerCase().includes(q)) return false
      if (filterStage !== 'Tous' && l.stage !== filterStage) return false
      if (filterSource !== 'Tous' && l.source !== filterSource) return false
      if (filterHeat !== 'Tous' && l.heatScore !== filterHeat) return false
      if (filterCloser !== 'Tous' && l.assignedCloserId !== filterCloser) return false
      return true
    })
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey]
      if (sortKey === 'estimatedValue') { va = Number(va); vb = Number(vb) }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <ChevronUp size={12} className="opacity-20" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-cyan-400" /> : <ChevronDown size={12} className="text-cyan-400" />
  }

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const toggleAll = () => setSelected(selected.length === paginated.length ? [] : paginated.map(l => l.id))

  const handleStageChange = async (id, stage) => {
    await leads.update(id, { stage, stageUpdatedAt: new Date().toISOString() })
    reload()
  }

  const handleDeleteSelected = async () => {
    if (!confirm(`Supprimer ${selected.length} lead(s) ?`)) return
    await leads.deleteMany(selected)
    setSelected([])
    reload()
  }

  const exportCSV = () => {
    const rows = [['Nom', 'Entreprise', 'Email', 'Téléphone', 'Source', 'Statut', 'Chaleur', 'Valeur €', 'Closer', 'Dernier contact']]
    filtered.forEach(l => {
      const closer = getUser(l.assignedCloserId)
      rows.push([l.name, l.company, l.email, l.phone, l.source, l.stage, l.heatScore, l.estimatedValue, closer?.name || '', l.lastContactAt])
    })
    const csv = rows.map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'leads.csv'; a.click()
  }

  const relativeTime = (d) => {
    try { return formatDistanceToNow(new Date(d), { locale: fr, addSuffix: true }) }
    catch { return '—' }
  }

  const daysInStage = (l) => {
    try { return differenceInDays(new Date(), new Date(l.stageUpdatedAt || l.createdAt)) }
    catch { return 0 }
  }

  const Th = ({ label, sortable, k }) => (
    <th onClick={sortable ? () => handleSort(k) : undefined}
      className={`text-left py-3 px-3 text-xs text-white/40 font-medium whitespace-nowrap ${sortable ? 'cursor-pointer hover:text-white/70 select-none' : ''}`}>
      <span className="flex items-center gap-1">{label}{sortable && <SortIcon k={k} />}</span>
    </th>
  )

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5 animate-fade-up">
        <div>
          <h1 className="text-2xl font-black">Pipeline</h1>
          <p className="text-white/40 text-sm">{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:overflow-visible sm:pb-0">
          {selected.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
              <Trash2 size={14} /> Supprimer ({selected.length})
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={exportCSV}><Download size={14} /> CSV</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(f => !f)}><Filter size={14} /> Filtres</Button>
          <Button size="sm" onClick={() => navigate('/leads')}><Plus size={14} /> Lead</Button>
        </div>
      </div>

      {/* Workflow visuel — étapes du pipeline */}
      <div className="no-scrollbar -mx-1 mb-4 overflow-x-auto px-1 animate-fade-up delay-1">
        <div className="grid min-w-[960px] grid-cols-6 gap-2 lg:min-w-0">
          {WORKFLOW_STEPS.map((step, i) => {
            const count = allLeads.filter(l => l.stage === step.stage).length
            const value = allLeads.filter(l => l.stage === step.stage).reduce((s, l) => s + (l.estimatedValue || 0), 0)
            const isActive = filterStage === step.stage
            return (
              <button key={step.stage} onClick={() => { setFilterStage(isActive ? 'Tous' : step.stage); setPage(1) }}
                className={`relative flex min-h-[132px] flex-col gap-1.5 p-3 rounded-2xl border text-left transition-all interactive-lift ${isActive ? step.activeBg : step.bg} hover:brightness-110`}>
                <div className="flex items-center justify-between">
                  <span className="text-base leading-none">{step.icon}</span>
                  <span className={`text-xl font-black ${step.color}`}>{count}</span>
                </div>
                <div className={`text-xs font-semibold ${step.color}`}>{step.action}</div>
                <div className="text-xs text-white/30 leading-tight">{step.desc}</div>
                {value > 0 && (
                  <div className="text-xs font-semibold text-white/50 mt-0.5">
                    €{value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                  </div>
                )}
                {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-white/40" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="glass p-3 sm:p-4 mb-4 flex flex-col gap-3 animate-fade-up delay-2">
        <div className="flex items-center gap-2 bg-black/20 border border-white/8 rounded-xl px-3 py-2">
          <Search size={15} className="text-white/30 shrink-0" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Rechercher un lead, entreprise, email..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" />
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Statut</label>
              <Select value={filterStage} onChange={e => { setFilterStage(e.target.value); setPage(1) }}>
                <option>Tous</option>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Source</label>
              <Select value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(1) }}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Chaleur</label>
              <Select value={filterHeat} onChange={e => { setFilterHeat(e.target.value); setPage(1) }}>
                {HEAT.map(h => <option key={h}>{h}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Closer</label>
              <Select value={filterCloser} onChange={e => { setFilterCloser(e.target.value); setPage(1) }}>
                <option value="Tous">Tous</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass overflow-hidden animate-fade-up delay-3">
        {filtered.length === 0
          ? <EmptyState icon="🎯" title="Aucun lead trouvé" description="Modifiez vos filtres ou ajoutez un nouveau lead" />
          : (
            <>
            <div className="md:hidden flex flex-col gap-3 p-3">
              {paginated.map(lead => {
                const closer = getUser(lead.assignedCloserId)
                const days = daysInStage(lead)
                return (
                  <div key={lead.id} className={`rounded-2xl border p-3 transition-all ${selected.includes(lead.id) ? 'border-cyan-400/35 bg-cyan-500/8' : 'border-white/8 bg-black/18'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/leads/${lead.id}`)}>
                        <div className="truncate text-base font-black">{lead.name}</div>
                        <div className="mt-1 truncate text-sm text-white/48">{lead.company || lead.email || 'Sans entreprise'}</div>
                      </button>
                      <input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggleSelect(lead.id)} className="mt-1 accent-cyan-400 cursor-pointer" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <HeatBadge score={lead.heatScore} />
                      <span className="px-2 py-0.5 rounded-full text-xs bg-white/8 text-white/55 whitespace-nowrap">{lead.source}</span>
                      {closer && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/6 px-2 py-0.5 text-xs text-white/55">
                          <Avatar name={closer.name} size="xs" />{closer.name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-white/8 bg-black/16 p-2">
                        <div className="text-white/35">Valeur</div>
                        <div className="mt-1 font-black text-green-300">{lead.estimatedValue ? `€${lead.estimatedValue.toLocaleString()}` : '—'}</div>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-black/16 p-2">
                        <div className="text-white/35">En étape</div>
                        <div className={days > 14 ? 'mt-1 font-black text-red-300' : days > 7 ? 'mt-1 font-black text-orange-300' : 'mt-1 font-black text-white/75'}>{days}j</div>
                      </div>
                    </div>
                    <div className="mt-3" onClick={e => e.stopPropagation()}>
                      <Select value={lead.stage} onChange={e => handleStageChange(lead.id, e.target.value)} className="text-sm">
                        {STAGES.map(s => <option key={s}>{s}</option>)}
                      </Select>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/8">
                  <tr>
                    <th className="py-3 px-3 w-8">
                      <input type="checkbox" checked={selected.length === paginated.length && paginated.length > 0} onChange={toggleAll} className="accent-cyan-400 cursor-pointer" />
                    </th>
                    <Th label="Nom" sortable k="name" />
                    <Th label="Entreprise" sortable k="company" />
                    <Th label="Valeur €" sortable k="estimatedValue" />
                    <Th label="Statut" />
                    <Th label="Chaleur" />
                    <Th label="Source" />
                    <Th label="Closer" />
                    <Th label="En étape" sortable k="stageUpdatedAt" />
                    <Th label="Dernier contact" sortable k="lastContactAt" />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((lead, i) => {
                    const closer = getUser(lead.assignedCloserId)
                    const days = daysInStage(lead)
                    return (
                      <tr key={lead.id}
                        className={`border-b border-white/5 table-row-hover ${selected.includes(lead.id) ? 'bg-cyan-500/5' : i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}
                        onClick={() => navigate(`/leads/${lead.id}`)}>
                        <td className="py-3 px-3" onClick={e => { e.stopPropagation(); toggleSelect(lead.id) }}>
                          <input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggleSelect(lead.id)} className="accent-cyan-400 cursor-pointer" />
                        </td>
                        <td className="py-3 px-3 font-medium whitespace-nowrap">{lead.name}</td>
                        <td className="py-3 px-3 text-white/60 whitespace-nowrap">{lead.company || '—'}</td>
                        <td className="py-3 px-3 font-semibold text-white/80 whitespace-nowrap">
                          {lead.estimatedValue ? `€${lead.estimatedValue.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                          <Select value={lead.stage} onChange={e => handleStageChange(lead.id, e.target.value)}
                            className="text-xs py-1 px-2 min-w-0 w-auto border-0 bg-transparent p-0"
                            style={{ background: 'transparent', border: 'none', padding: 0 }}>
                            {STAGES.map(s => <option key={s}>{s}</option>)}
                          </Select>
                        </td>
                        <td className="py-3 px-3"><HeatBadge score={lead.heatScore} /></td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-white/8 text-white/50 whitespace-nowrap">{lead.source}</span>
                        </td>
                        <td className="py-3 px-3">
                          {closer ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar name={closer.name} size="xs" />
                              <span className="text-xs text-white/60 whitespace-nowrap">{closer.name.split(' ')[0]}</span>
                            </div>
                          ) : <span className="text-white/30 text-xs">—</span>}
                        </td>
                        <td className="py-3 px-3 text-xs text-white/40 whitespace-nowrap">
                          <span className={days > 7 ? 'text-orange-400' : days > 14 ? 'text-red-400' : ''}>{days}j</span>
                        </td>
                        <td className="py-3 px-3 text-xs text-white/40 whitespace-nowrap">{relativeTime(lead.lastContactAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </>
          )
        }

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
            <span className="text-xs text-white/40">Page {page} / {totalPages} • {filtered.length} résultats</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</Button>
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
