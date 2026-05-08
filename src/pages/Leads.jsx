import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, leads, users } from '../lib/api'
import { HeatBadge, StageBadge, Button, Input, Select, Modal, EmptyState } from '../components/ui'
import { Search, Plus, Download, Trash2, Star, Globe, MapPin, Building2, UserRoundCheck, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { canReceiveLeads, isAdmin, roleLabel } from '../lib/roles'
import { buildLeadPlaybook } from '../lib/agencyOS'

const STAGES = ['Prospect', 'Contacté', 'RDV Pris', 'Proposition Envoyée', 'Gagné', 'Perdu']
const SOURCES = ['Google Maps', 'Inbound', 'Referral', 'Cold Email', 'Instagram', 'Autre']

const SITE_STATUS_MAP = {
  none: { label: 'Sans site', color: 'text-red-400 bg-red-500/10' },
  obsolete: { label: 'Site obsolète', color: 'text-orange-400 bg-orange-500/10' },
  ok: { label: 'Site OK', color: 'text-green-400 bg-green-500/10' },
}

const StarRating = ({ rating, reviews }) => {
  if (!rating) return null
  const stars = Math.round(rating)
  return (
    <div className="flex items-center gap-0.5 mt-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={10} className={i <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'} />
      ))}
      {reviews > 0 && <span className="text-xs text-white/35 ml-1">({reviews})</span>}
    </div>
  )
}

export default function Leads() {
  const navigate = useNavigate()
  const currentUser = auth.getSession()
  const admin = isAdmin(currentUser)
  const [allLeads, setAllLeads] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState([])
  const [filterStage, setFilterStage] = useState('all')
  const [filterSector, setFilterSector] = useState('all')
  const [filterSite, setFilterSite] = useState('all')
  const [form, setForm] = useState({
    name: '', company: '', sector: '', email: '', phone: '',
    source: 'Google Maps', heatScore: 'Cold', stage: 'Prospect',
    assignedCloserId: '', estimatedValue: '',
    city: '', siren: '', website: '',
  })

  useEffect(() => {
    leads.getAll().then(r => setAllLeads(Array.isArray(r.data) ? r.data : []))
    users.getAll().then(r => setAllUsers(Array.isArray(r.data) ? r.data : []))
  }, [])

  const reload = () => leads.getAll().then(r => setAllLeads(Array.isArray(r.data) ? r.data : []))
  const assignableUsers = allUsers.filter(canReceiveLeads)
  const getUser = (id) => allUsers.find(u => u.id === id)

  const sectorsInData = [...new Set(allLeads.map(l => l.sector).filter(Boolean))].sort()

  const filtered = allLeads.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !q || l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q)
      || l.email?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q) || l.phone?.includes(q)
    const matchStage = filterStage === 'all' || l.stage === filterStage
    const matchSector = filterSector === 'all' || l.sector === filterSector
    const matchSite = filterSite === 'all'
      || (filterSite === 'none' && (!l.siteStatus || l.siteStatus === 'none'))
      || (filterSite !== 'none' && l.siteStatus === filterSite)
    return matchSearch && matchStage && matchSector && matchSite
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    await leads.create({ ...form, estimatedValue: Number(form.estimatedValue) || 0 })
    setShowModal(false)
    setForm({
      name: '', company: '', sector: '', email: '', phone: '',
      source: 'Google Maps', heatScore: 'Cold', stage: 'Prospect',
      assignedCloserId: '', estimatedValue: '', city: '', siren: '', website: '',
    })
    reload()
  }

  const handleDeleteSelected = async () => {
    if (!admin) return
    if (!confirm(`Supprimer ${selected.length} lead(s) ?`)) return
    await leads.deleteMany(selected)
    setSelected([])
    reload()
  }

  const handleAssign = async (ids, assignedCloserId) => {
    if (!admin || !ids.length) return
    await leads.assignMany(ids, assignedCloserId)
    setSelected([])
    await reload()
  }

  const handleAssignOne = async (id, assignedCloserId) => {
    if (!admin) return
    await leads.update(id, { assignedCloserId })
    await reload()
  }

  const toggleSelect = (id) => {
    if (!admin) return
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  const exportCSV = () => {
    const rows = [['Nom', 'Entreprise', 'Secteur', 'Email', 'Téléphone', 'Ville', 'Site', 'Note Google', 'Nb avis', 'SIREN', 'Source', 'Statut', 'Valeur €', 'Score IA', 'Hook IA']]
    filtered.forEach(l => rows.push([
      l.name, l.company, l.sector, l.email, l.phone,
      l.city, l.website, l.rating, l.reviews, l.siren,
      l.source, l.stage, l.estimatedValue, l.aiScore, l.aiHook
    ]))
    const csv = rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `leads-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5 animate-fade-up">
        <div>
          <h1 className="text-2xl font-black">Leads</h1>
          <p className="text-white/40 text-sm">{filtered.length} / {allLeads.length} leads</p>
        </div>
        <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:overflow-visible sm:pb-0">
          {admin && selected.length > 0 && (
            <>
              <select
                defaultValue=""
                onChange={e => e.target.value !== '' && handleAssign(selected, e.target.value === '__clear' ? '' : e.target.value)}
                className="min-h-8 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 outline-none"
              >
                <option value="">Attribuer {selected.length} lead(s)</option>
                <option value="__clear">Retirer assignation</option>
                {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.name} · {roleLabel(u.role)}</option>)}
              </select>
              <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
                <Trash2 size={14} /> Supprimer ({selected.length})
              </Button>
            </>
          )}
          {admin && <Button variant="ghost" size="sm" onClick={exportCSV}><Download size={14} /> CSV</Button>}
          {admin && <Button size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Nouveau Lead</Button>}
        </div>
      </div>

      {/* Filtres */}
      <div className="glass p-3 mb-4 flex flex-wrap gap-2 items-center animate-fade-up delay-1">
        <div className="flex items-center gap-2 bg-black/20 border border-white/8 rounded-xl px-3 py-2 flex-1 min-w-[180px]">
          <Search size={15} className="text-white/30 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom, ville, email, téléphone..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30"
          />
        </div>

        <select
          value={filterStage}
          onChange={e => setFilterStage(e.target.value)}
          className="min-h-10 flex-1 sm:flex-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
        >
          <option value="all">Tous statuts</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {sectorsInData.length > 0 && (
          <select
            value={filterSector}
            onChange={e => setFilterSector(e.target.value)}
            className="min-h-10 flex-1 sm:flex-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
          >
            <option value="all">Tous secteurs</option>
            {sectorsInData.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <select
          value={filterSite}
          onChange={e => setFilterSite(e.target.value)}
          className="min-h-10 flex-1 sm:flex-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
        >
          <option value="all">Tous sites</option>
          <option value="none">Sans site</option>
          <option value="obsolete">Site obsolète</option>
          <option value="ok">Site OK</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden animate-fade-up delay-2">
        {filtered.length === 0
          ? <EmptyState icon={<Search size={32} />} title="Aucun lead trouvé" description={admin ? 'Modifiez vos filtres ou créez un nouveau lead' : 'Aucun lead ne vous est encore assigné'} />
          : (
            <>
            <div className="md:hidden flex flex-col gap-3 p-3">
              {filtered.map(l => {
                const siteInfo = l.siteStatus ? SITE_STATUS_MAP[l.siteStatus] : null
                const assigned = getUser(l.assignedCloserId)
                const playbook = buildLeadPlaybook(l)
                return (
                  <div key={l.id} className={`rounded-2xl border p-3 transition-all ${selected.includes(l.id) ? 'border-cyan-400/35 bg-cyan-500/8' : 'border-white/8 bg-black/18'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/leads/${l.id}`)}>
                        <div className="truncate text-base font-black">{l.company || l.name}</div>
                        <div className="mt-1 truncate text-sm text-white/50">{l.name}</div>
                        <StarRating rating={l.rating} reviews={l.reviews} />
                      </button>
                      {admin && <input type="checkbox" checked={selected.includes(l.id)} readOnly onClick={e => { e.stopPropagation(); toggleSelect(l.id) }} className="mt-1 accent-cyan-400 cursor-pointer" />}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StageBadge stage={l.stage} />
                      <HeatBadge score={l.heatScore} />
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-200">
                        <Sparkles size={11} />{playbook.service.name}
                      </span>
                      {l.city && <span className="inline-flex items-center gap-1 rounded-full bg-white/6 px-2 py-0.5 text-xs text-white/55"><MapPin size={11} />{l.city}</span>}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-white/8 bg-black/16 p-2">
                        <div className="text-white/35">Contact</div>
                        <div className="mt-1 truncate font-semibold text-white/70">{l.phone || l.email || '—'}</div>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-black/16 p-2">
                        <div className="text-white/35">Valeur</div>
                        <div className="mt-1 font-black text-green-300">{l.estimatedValue ? `€${l.estimatedValue.toLocaleString()}` : '—'}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      {siteInfo
                        ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${siteInfo.color}`}>{siteInfo.label}</span>
                        : l.website
                          ? <a href={l.website.startsWith('http') ? l.website : `https://${l.website}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs text-cyan-300/80"><Globe size={11} /> Voir site</a>
                          : <span className="text-white/25 text-xs">Sans site</span>
                      }
                      <span className="text-xs text-white/30">{l.createdAt ? formatDistanceToNow(new Date(l.createdAt), { locale: fr, addSuffix: true }) : ''}</span>
                    </div>
                    <div className="mt-3 rounded-xl border border-white/8 bg-black/16 p-2">
                      <div className="mb-1 flex items-center gap-1.5 text-xs text-white/35">
                        <UserRoundCheck size={12} /> Assigné
                      </div>
                      {admin ? (
                        <Select value={l.assignedCloserId || ''} onChange={e => handleAssignOne(l.id, e.target.value)}>
                          <option value="">Non assigné</option>
                          {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.name} · {roleLabel(u.role)}</option>)}
                        </Select>
                      ) : (
                        <div className="text-sm font-semibold text-white/70">{assigned?.name || currentUser?.name || 'Vous'}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-white/7">
                  {admin && <th className="w-8 py-3 px-3">
                    <input
                      type="checkbox"
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={e => setSelected(e.target.checked ? filtered.map(l => l.id) : [])}
                    />
                  </th>}
                  {['Entreprise', 'Contact', 'Localisation', 'Site web', 'Offre', 'Assigné', 'Statut', 'Score IA', ''].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-xs text-white/40 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const siteInfo = l.siteStatus ? SITE_STATUS_MAP[l.siteStatus] : null
                  const assigned = getUser(l.assignedCloserId)
                  const playbook = buildLeadPlaybook(l)
                  return (
                    <tr
                      key={l.id}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer"
                      onClick={() => navigate(`/leads/${l.id}`)}
                    >
                      {admin && <td className="py-3 px-3" onClick={e => { e.stopPropagation(); toggleSelect(l.id) }}>
                        <input type="checkbox" checked={selected.includes(l.id)} readOnly />
                      </td>}

                      <td className="py-3 px-3">
                        <div className="font-semibold">{l.company || l.name}</div>
                        {l.sector && <div className="text-xs text-white/40">{l.sector}</div>}
                        <StarRating rating={l.rating} reviews={l.reviews} />
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-white/80">{l.name}</div>
                        {l.phone && <div className="text-xs text-white/40">{l.phone}</div>}
                        {l.email && <div className="text-xs text-white/40 truncate max-w-[140px]">{l.email}</div>}
                      </td>

                      <td className="py-3 px-3">
                        {(l.city || l.zip) ? (
                          <div className="flex items-center gap-1 text-xs text-white/50">
                            <MapPin size={11} />{l.city}{l.zip ? ` ${l.zip}` : ''}
                          </div>
                        ) : <span className="text-white/20 text-xs">—</span>}
                        {l.siren && (
                          <button
                            onClick={e => { e.stopPropagation(); window.open(`https://annuaire-entreprises.data.gouv.fr/entreprise/${l.siren}`, '_blank') }}
                            className="text-xs text-cyan-400/60 hover:text-cyan-400 transition-colors mt-0.5 flex items-center gap-1"
                          >
                            <Building2 size={10} /> SIRENE
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {siteInfo
                          ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${siteInfo.color}`}>{siteInfo.label}</span>
                          : l.website
                            ? <a href={l.website.startsWith('http') ? l.website : `https://${l.website}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs text-cyan-400/70 hover:text-cyan-400"><Globe size={11} /> Voir site</a>
                            : <span className="text-white/20 text-xs">—</span>
                        }
                      </td>

                      <td className="py-3 px-3">
                        <div className="max-w-[160px]">
                          <div className="truncate text-xs font-semibold text-violet-200">{playbook.service.name}</div>
                          <div className="text-[11px] text-white/35">Score {playbook.score}/100</div>
                        </div>
                      </td>

                      <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                        {admin ? (
                          <select
                            value={l.assignedCloserId || ''}
                            onChange={e => handleAssignOne(l.id, e.target.value)}
                            className="min-h-8 max-w-[180px] rounded-xl border border-white/10 bg-black/24 px-2 py-1 text-xs text-white outline-none"
                          >
                            <option value="">Non assigné</option>
                            {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.name} · {roleLabel(u.role)}</option>)}
                          </select>
                        ) : assigned ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
                            <UserRoundCheck size={12} />{assigned.name}
                          </span>
                        ) : <span className="text-white/20 text-xs">—</span>}
                      </td>

                      <td className="py-3 px-3">
                        <StageBadge stage={l.stage} />
                        <div className="mt-1"><HeatBadge score={l.heatScore} /></div>
                      </td>

                      <td className="py-3 px-3">
                        {l.aiScore != null
                          ? (
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{
                                  width: `${l.aiScore}%`,
                                  background: l.aiScore >= 70 ? '#20D16B' : l.aiScore >= 40 ? '#EAB308' : '#EF4444'
                                }} />
                              </div>
                              <span className="text-xs text-white/60 font-mono">{l.aiScore}</span>
                            </div>
                          )
                          : <span className="text-white/20 text-xs">—</span>
                        }
                      </td>

                      <td className="py-3 px-3 text-xs text-white/25 whitespace-nowrap">
                        {l.createdAt ? formatDistanceToNow(new Date(l.createdAt), { locale: fr, addSuffix: true }) : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </>
          )
        }
      </div>

      {/* Modal nouveau lead */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau Lead">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Nom contact *</label><Input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Marie Dupont" required /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Entreprise</label><Input value={form.company} onChange={e => f('company', e.target.value)} placeholder="Garage Dupont" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Email</label><Input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="marie@..." /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Téléphone</label><Input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="06 ..." /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Ville</label><Input value={form.city} onChange={e => f('city', e.target.value)} placeholder="Lyon" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Secteur</label><Input value={form.sector} onChange={e => f('sector', e.target.value)} placeholder="garage" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">SIREN</label><Input value={form.siren} onChange={e => f('siren', e.target.value)} placeholder="123456789" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Source</label>
              <Select value={form.source} onChange={e => f('source', e.target.value)}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div><label className="text-xs text-white/50 mb-1 block">Valeur estimée (€)</label>
              <Input type="number" value={form.estimatedValue} onChange={e => f('estimatedValue', e.target.value)} placeholder="5000" />
            </div>
          </div>
          {admin && (
            <div>
              <label className="text-xs text-white/50 mb-1 block">Assigner à un membre</label>
              <Select value={form.assignedCloserId} onChange={e => f('assignedCloserId', e.target.value)}>
                <option value="">Non assigné</option>
                {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.name} · {roleLabel(u.role)}</option>)}
              </Select>
            </div>
          )}
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
