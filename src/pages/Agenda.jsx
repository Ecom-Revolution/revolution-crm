import { useState, useEffect } from 'react'
import { agenda, leads } from '../lib/api'
import { GlassCard, Button, Input, Modal, EmptyState } from '../components/ui'
import { Calendar, Plus, Trash2, CheckCircle, Clock, Phone, Users } from 'lucide-react'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS_MAP = {
  planifie: { label: 'Planifié', color: 'text-blue-400 bg-blue-500/15' },
  confirme: { label: 'Confirmé', color: 'text-green-400 bg-green-500/15' },
  fait: { label: 'Fait', color: 'text-white/40 bg-white/8' },
  annule: { label: 'Annulé', color: 'text-red-400 bg-red-500/15' },
}

const TYPE_MAP = {
  appel: { label: 'Appel', icon: <Phone size={14} />, color: 'text-green-400' },
  visio: { label: 'Visio', icon: <Users size={14} />, color: 'text-violet-400' },
  physique: { label: 'En personne', icon: <Users size={14} />, color: 'text-cyan-400' },
}

const dateLabel = (dateStr) => {
  if (!dateStr) return '—'
  const d = parseISO(dateStr)
  if (isToday(d)) return `Aujourd'hui ${format(d, 'HH:mm')}`
  if (isTomorrow(d)) return `Demain ${format(d, 'HH:mm')}`
  return format(d, "EEE d MMM 'à' HH:mm", { locale: fr })
}

export default function Agenda() {
  const [rdvs, setRdvs] = useState([])
  const [allLeads, setAllLeads] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('upcoming')
  const [form, setForm] = useState({
    leadId: '', date: '', duration: 30, type: 'appel', note: '', status: 'planifie'
  })

  useEffect(() => {
    agenda.getAll().then(r => setRdvs(Array.isArray(r.data) ? r.data : []))
    leads.getAll().then(r => setAllLeads(Array.isArray(r.data) ? r.data : []))
  }, [])

  const reload = () => agenda.getAll().then(r => setRdvs(Array.isArray(r.data) ? r.data : []))

  const enriched = rdvs.map(rdv => ({
    ...rdv,
    lead: allLeads.find(l => l.id === rdv.leadId || l.id === rdv.lead_id),
  }))

  const filtered = enriched.filter(rdv => {
    if (!rdv.date) return filter === 'all'
    const d = parseISO(rdv.date)
    if (filter === 'upcoming') return !isPast(d) || isToday(d)
    if (filter === 'past') return isPast(d) && !isToday(d)
    return true
  }).sort((a, b) => new Date(a.date) - new Date(b.date))

  const todayRdvs = enriched.filter(r => r.date && isToday(parseISO(r.date)))
  const upcomingCount = enriched.filter(r => r.date && !isPast(parseISO(r.date))).length

  const handleCreate = async (e) => {
    e.preventDefault()
    await agenda.create({
      ...form,
      leadId: form.leadId,
      lead_id: form.leadId,
    })
    setShowModal(false)
    setForm({ leadId: '', date: '', duration: 30, type: 'appel', note: '', status: 'planifie' })
    reload()
  }

  const handleStatus = async (id, status) => {
    await agenda.update(id, { status })
    reload()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce RDV ?')) return
    await agenda.delete(id)
    reload()
  }

  return (
    <div className="page-shell max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Agenda RDV</h1>
          <p className="text-white/40 text-sm">{upcomingCount} rendez-vous à venir</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus size={14} /> Nouveau RDV</Button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <GlassCard className="text-center">
          <div className="text-2xl font-black text-cyan-400">{todayRdvs.length}</div>
          <div className="text-xs text-white/40 mt-1">Aujourd'hui</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-2xl font-black text-violet-400">{upcomingCount}</div>
          <div className="text-xs text-white/40 mt-1">À venir</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-2xl font-black text-green-400">
            {enriched.filter(r => r.status === 'fait').length}
          </div>
          <div className="text-xs text-white/40 mt-1">Réalisés</div>
        </GlassCard>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'upcoming', label: 'À venir' },
          { key: 'past', label: 'Passés' },
          { key: 'all', label: 'Tous' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f.key
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste RDV */}
      {filtered.length === 0
        ? <EmptyState icon="📅" title="Aucun rendez-vous" description="Planifiez vos premiers RDV avec vos prospects" />
        : (
          <div className="flex flex-col gap-3">
            {filtered.map(rdv => {
              const typeInfo = TYPE_MAP[rdv.type] || TYPE_MAP.appel
              const statusInfo = STATUS_MAP[rdv.status] || STATUS_MAP.planifie
              const isLate = rdv.date && isPast(parseISO(rdv.date)) && rdv.status === 'planifie'

              return (
                <GlassCard key={rdv.id} className={`flex items-center gap-4 ${isLate ? 'border border-red-500/20' : ''}`}>
                  {/* Date */}
                  <div className="shrink-0 text-center min-w-[70px]">
                    <div className={`text-xs font-bold ${isLate ? 'text-red-400' : 'text-cyan-400'}`}>
                      {rdv.date ? format(parseISO(rdv.date), 'dd MMM', { locale: fr }) : '—'}
                    </div>
                    <div className="text-lg font-black">
                      {rdv.date ? format(parseISO(rdv.date), 'HH:mm') : '—'}
                    </div>
                    <div className="text-xs text-white/30">{rdv.duration || 30} min</div>
                  </div>

                  {/* Séparateur */}
                  <div className="w-px h-12 bg-white/10 shrink-0" />

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`${typeInfo.color}`}>{typeInfo.icon}</span>
                      <span className="font-semibold text-sm truncate">
                        {rdv.lead?.name || rdv.lead?.company || 'Prospect inconnu'}
                      </span>
                      {rdv.lead?.company && rdv.lead?.name !== rdv.lead?.company && (
                        <span className="text-xs text-white/40 truncate">{rdv.lead.company}</span>
                      )}
                    </div>
                    {rdv.note && <p className="text-xs text-white/50 truncate">{rdv.note}</p>}
                    {rdv.lead?.phone && (
                      <a href={`tel:${rdv.lead.phone}`} className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors mt-0.5 block">
                        {rdv.lead.phone}
                      </a>
                    )}
                  </div>

                  {/* Status + Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    {rdv.status === 'planifie' && (
                      <button
                        onClick={() => handleStatus(rdv.id, 'fait')}
                        className="text-white/30 hover:text-green-400 transition-colors"
                        title="Marquer comme fait"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(rdv.id)}
                      className="text-white/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )
      }

      {/* Modal nouveau RDV */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau Rendez-vous">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Prospect *</label>
            <select
              value={form.leadId}
              onChange={e => setForm(p => ({ ...p, leadId: e.target.value }))}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
            >
              <option value="">Choisir un prospect...</option>
              {allLeads.map(l => (
                <option key={l.id} value={l.id}>{l.name}{l.company ? ` — ${l.company}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Date & heure *</label>
              <Input
                type="datetime-local"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Durée (min)</label>
              <select
                value={form.duration}
                onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              >
                {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Type</label>
            <div className="flex gap-2">
              {Object.entries(TYPE_MAP).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, type: key }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    form.type === key
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-white/40 hover:text-white/70 border border-transparent'
                  }`}
                >
                  {val.icon} {val.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Note</label>
            <textarea
              value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Objet de l'appel, points à aborder..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 resize-none placeholder:text-white/25"
            />
          </div>
          <div className="flex gap-3 justify-end mt-1">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit">Planifier</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
