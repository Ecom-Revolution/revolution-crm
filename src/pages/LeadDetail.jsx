import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { leads, activities, users, auth } from '../lib/api'
import { HeatBadge, StageBadge, Avatar, Button, Input, Select, Textarea, GlassCard, Modal } from '../components/ui'
import { ArrowLeft, Phone, Mail, Calendar, FileText, Plus, Trash2, ExternalLink, TrendingUp } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STAGES = ['Prospect', 'Contacté', 'RDV Pris', 'Proposition Envoyée', 'Gagné', 'Perdu']
const LOSS_REASONS = ['Prix', 'Timing', 'Concurrent', 'Pas intéressé', 'Autre']
const ACTIVITY_TYPES = [
  { value: 'call', label: '📞 Appel', icon: <Phone size={13} />, color: 'text-green-400 bg-green-500/15' },
  { value: 'email', label: '📧 Email', icon: <Mail size={13} />, color: 'text-blue-400 bg-blue-500/15' },
  { value: 'meeting', label: '📅 Réunion', icon: <Calendar size={13} />, color: 'text-violet-400 bg-violet-500/15' },
  { value: 'note', label: '📝 Note', icon: <FileText size={13} />, color: 'text-orange-400 bg-orange-500/15' },
]

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUser = auth.getSession()
  const [lead, setLead] = useState(null)
  const [leadActivities, setLeadActivities] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [actForm, setActForm] = useState({ type: 'call', content: '' })
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      leads.getById(id),
      activities.getByLeadId(id),
      users.getAll(),
    ]).then(([l, a, u]) => {
      setLead(l.data)
      setForm(l.data || {})
      setLeadActivities(a.data || [])
      setAllUsers(u.data || [])
      setLoading(false)
    })
  }, [id])

  const reload = async () => {
    const [l, a] = await Promise.all([leads.getById(id), activities.getByLeadId(id)])
    setLead(l.data); setForm(l.data || {}); setLeadActivities(a.data || [])
  }

  const handleSave = async () => {
    await leads.update(id, form)
    await reload()
    setEditing(false)
  }

  const handleAddActivity = async (e) => {
    e.preventDefault()
    if (!actForm.content.trim()) return
    await activities.create({ ...actForm, leadId: id, userId: currentUser?.id || 'u1' })
    setActForm({ type: 'call', content: '' })
    setShowActivityModal(false)
    reload()
  }

  const getActivityStyle = (type) => ACTIVITY_TYPES.find(t => t.value === type) || ACTIVITY_TYPES[3]
  const getUser = (uid) => allUsers.find(u => u.id === uid)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" /></div>
  if (!lead) return <div className="p-6 text-white/50">Lead introuvable.</div>

  const closer = getUser(lead.assignedCloserId)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-white/40 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black">{lead.name}</h1>
          <p className="text-white/40 text-sm">{lead.company} {lead.sector && `• ${lead.sector}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <HeatBadge score={lead.heatScore} />
          <StageBadge stage={lead.stage} />
          {editing
            ? <><Button onClick={handleSave}>Sauvegarder</Button><Button variant="ghost" onClick={() => { setEditing(false); setForm(lead) }}>Annuler</Button></>
            : <Button variant="ghost" onClick={() => setEditing(true)}>Modifier</Button>
          }
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Info */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <GlassCard>
            <div className="font-bold text-sm mb-4">Informations</div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Nom', key: 'name' },
                { label: 'Entreprise', key: 'company' },
                { label: 'Secteur', key: 'sector' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Téléphone', key: 'phone' },
                { label: 'Site web', key: 'website' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <div className="text-xs text-white/40 mb-1">{label}</div>
                  {editing
                    ? <Input value={form[key] || ''} onChange={e => f(key, e.target.value)} type={type || 'text'} placeholder={label} />
                    : <div className="text-sm font-medium">{lead[key] || <span className="text-white/30">—</span>}</div>
                  }
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/8">
              <div>
                <div className="text-xs text-white/40 mb-1">Valeur estimée</div>
                {editing
                  ? <Input type="number" value={form.estimatedValue || ''} onChange={e => f('estimatedValue', Number(e.target.value))} placeholder="5000" />
                  : <div className="text-lg font-black text-green-400">{lead.estimatedValue ? `€${lead.estimatedValue.toLocaleString()}` : '—'}</div>
                }
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">Source</div>
                {editing
                  ? <Select value={form.source || ''} onChange={e => f('source', e.target.value)}>
                      {['Google Maps', 'Inbound', 'Referral', 'Cold Email', 'Instagram', 'Autre'].map(s => <option key={s}>{s}</option>)}
                    </Select>
                  : <div className="text-sm font-medium">{lead.source || '—'}</div>
                }
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">Upsell potentiel</div>
                {editing
                  ? <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input type="checkbox" checked={form.upsellPotential || false} onChange={e => f('upsellPotential', e.target.checked)} className="accent-cyan-400 w-4 h-4" />
                      <span className="text-sm">Oui</span>
                    </label>
                  : <div className="text-sm font-medium">{lead.upsellPotential ? '✅ Oui' : '—'}</div>
                }
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="font-bold text-sm mb-4">Statut pipeline</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-white/40 mb-1">Étape</div>
                {editing
                  ? <Select value={form.stage || 'Prospect'} onChange={e => f('stage', e.target.value)}>
                      {STAGES.map(s => <option key={s}>{s}</option>)}
                    </Select>
                  : <StageBadge stage={lead.stage} />
                }
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">Chaleur</div>
                {editing
                  ? <Select value={form.heatScore || 'Cold'} onChange={e => f('heatScore', e.target.value)}>
                      {['Hot', 'Warm', 'Cold'].map(s => <option key={s}>{s}</option>)}
                    </Select>
                  : <HeatBadge score={lead.heatScore} />
                }
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">Closer assigné</div>
                {editing
                  ? <Select value={form.assignedCloserId || ''} onChange={e => f('assignedCloserId', e.target.value)}>
                      <option value="">Non assigné</option>
                      {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </Select>
                  : closer ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={closer.name} size="xs" />
                      <span className="text-sm">{closer.name}</span>
                    </div>
                  ) : <span className="text-white/30 text-sm">Non assigné</span>
                }
              </div>
              {lead.stage === 'Perdu' && (
                <div>
                  <div className="text-xs text-white/40 mb-1">Raison de perte</div>
                  {editing
                    ? <Select value={form.lossReason || ''} onChange={e => f('lossReason', e.target.value)}>
                        <option value="">Sélectionner</option>
                        {LOSS_REASONS.map(r => <option key={r}>{r}</option>)}
                      </Select>
                    : <div className="text-sm font-medium">{lead.lossReason || '—'}</div>
                  }
                </div>
              )}
            </div>
          </GlassCard>

          {/* Activities */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-sm">Historique des activités</div>
              <Button size="sm" onClick={() => setShowActivityModal(true)}><Plus size={13} /> Ajouter</Button>
            </div>
            {leadActivities.length === 0
              ? <div className="text-center py-6 text-white/30 text-sm">Aucune activité — commencez par un appel !</div>
              : (
                <div className="flex flex-col gap-2">
                  {leadActivities.map(a => {
                    const style = getActivityStyle(a.type)
                    const actUser = getUser(a.userId)
                    return (
                      <div key={a.id} className="flex gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${style.color}`}>
                          {style.icon}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm">{a.content}</div>
                          <div className="text-xs text-white/35 mt-1 flex items-center gap-2">
                            {actUser && <span>{actUser.name}</span>}
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(a.createdAt), { locale: fr, addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <GlassCard>
            <div className="font-bold text-sm mb-3">Dates</div>
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <div className="text-xs text-white/40 mb-0.5">Créé le</div>
                <div>{lead.createdAt ? format(new Date(lead.createdAt), 'dd MMM yyyy', { locale: fr }) : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-0.5">Dernier contact</div>
                <div>{lead.lastContactAt ? formatDistanceToNow(new Date(lead.lastContactAt), { locale: fr, addSuffix: true }) : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-0.5">Dans cette étape depuis</div>
                <div>{lead.stageUpdatedAt ? formatDistanceToNow(new Date(lead.stageUpdatedAt), { locale: fr, addSuffix: true }) : '—'}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="font-bold text-sm mb-3">Actions rapides</div>
            <div className="flex flex-col gap-2">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/70 hover:text-white">
                  <Mail size={14} className="text-blue-400" /> Envoyer un email
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/70 hover:text-white">
                  <Phone size={14} className="text-green-400" /> Appeler
                </a>
              )}
              {lead.website && (
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/70 hover:text-white">
                  <ExternalLink size={14} className="text-violet-400" /> Voir le site
                </a>
              )}
            </div>
          </GlassCard>

          <Button variant="danger" size="sm" className="w-full" onClick={async () => {
            if (!confirm('Supprimer ce lead ?')) return
            await leads.delete(id)
            navigate('/leads')
          }}>
            <Trash2 size={14} /> Supprimer ce lead
          </Button>
        </div>
      </div>

      {/* Activity Modal */}
      <Modal open={showActivityModal} onClose={() => setShowActivityModal(false)} title="Ajouter une activité">
        <form onSubmit={handleAddActivity} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {ACTIVITY_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setActForm(p => ({ ...p, type: t.value }))}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border transition-all ${actForm.type === t.value ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-400' : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Note</label>
            <Textarea value={actForm.content} onChange={e => setActForm(p => ({ ...p, content: e.target.value }))} placeholder="Décrivez l'activité..." rows={3} required />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" onClick={() => setShowActivityModal(false)}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
