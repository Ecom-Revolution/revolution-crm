import { useState } from 'react'
import { auth } from '../lib/api'
import { GlassCard, Button, Input } from '../components/ui'
import { Key, Copy, Check, RefreshCw, Webhook, Database, User, Bell, Lock, Eye, EyeOff } from 'lucide-react'

const generateKey = () => 'revo_' + Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('')

export default function Settings() {
  const currentUser = auth.getSession()
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('crm_api_key') || generateKey())
  const [copied, setCopied] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: currentUser?.name || '', email: currentUser?.email || '' })
  const [notifForm, setNotifForm] = useState({ newLead: true, stageChange: true, weeklyReport: false })
  const [saved, setSaved] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })

  const handleChangePassword = (e) => {
    e.preventDefault()
    setPwError('')
    // Vérifier mot de passe actuel
    const stored = localStorage.getItem('crm_password') || 'demo1234'
    if (pwForm.current !== stored) { setPwError('Mot de passe actuel incorrect.'); return }
    if (pwForm.next.length < 6) { setPwError('Le nouveau mot de passe doit faire au moins 6 caractères.'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('Les mots de passe ne correspondent pas.'); return }
    localStorage.setItem('crm_password', pwForm.next)
    setPwSuccess(true)
    setPwForm({ current: '', next: '', confirm: '' })
    setTimeout(() => setPwSuccess(false), 3000)
  }

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = () => {
    if (!confirm('Régénérer la clé API ? L\'ancienne ne fonctionnera plus.')) return
    const newKey = generateKey()
    setApiKey(newKey)
    localStorage.setItem('crm_api_key', newKey)
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const n8nSnippet = `// Node HTTP Request — POST
{
  "method": "POST",
  "url": "https://votre-crm.vercel.app/api/leads",
  "headers": {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKey}"
  },
  "body": {
    "name": "{{ $json.name }}",
    "company": "{{ $json.company }}",
    "email": "{{ $json.email }}",
    "phone": "{{ $json.phone }}",
    "website": "{{ $json.website }}",
    "source": "Google Maps",
    "heatScore": "Cold",
    "stage": "Prospect"
  }
}`

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(n8nSnippet)
    setCopiedSnippet(true)
    setTimeout(() => setCopiedSnippet(false), 2000)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black">Paramètres</h1>
        <p className="text-white/40 text-sm">Configuration du CRM</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Profile */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <User size={15} className="text-cyan-400" />
            <div className="font-bold text-sm">Mon profil</div>
          </div>
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Nom</label>
              <Input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="Votre nom" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Email</label>
              <Input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} placeholder="email@..." />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm">{saved ? '✓ Sauvegardé' : 'Sauvegarder'}</Button>
            </div>
          </form>
        </GlassCard>

        {/* Sécurité — Changement de mot de passe */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Lock size={15} className="text-pink-400" />
            <div className="font-bold text-sm">Mot de passe</div>
          </div>
          {pwSuccess && (
            <div className="mb-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              ✓ Mot de passe mis à jour avec succès.
            </div>
          )}
          {pwError && (
            <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {pwError}
            </div>
          )}
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            {[
              { key: 'current', label: 'Mot de passe actuel' },
              { key: 'next', label: 'Nouveau mot de passe' },
              { key: 'confirm', label: 'Confirmer le nouveau mot de passe' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-white/50 mb-1 block">{label}</label>
                <div className="relative">
                  <input
                    type={showPw[key] ? 'text' : 'password'}
                    value={pwForm[key]}
                    onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder="••••••••"
                    required
                    className="input-base px-3 py-2.5 text-sm w-full pr-10"
                  />
                  <button type="button" onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button type="submit" size="sm">Changer le mot de passe</Button>
            </div>
          </form>
        </GlassCard>

        {/* API & Intégrations */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Key size={15} className="text-violet-400" />
            <div className="font-bold text-sm">API & Intégrations</div>
          </div>

          <div className="mb-5">
            <div className="text-xs text-white/50 mb-2">Clé API (pour N8N & automatisations)</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5">
                <code className="text-xs text-cyan-400 flex-1 truncate">{apiKey}</code>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCopyKey} className={copied ? 'text-green-400' : ''}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRegenerate}>
                <RefreshCw size={13} />
              </Button>
            </div>
            <p className="text-xs text-white/30 mt-1.5">⚠️ Ne partagez jamais cette clé. Elle donne accès à votre CRM.</p>
          </div>

          <div className="border-t border-white/8 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Webhook size={14} className="text-orange-400" />
              <div className="font-semibold text-sm">Intégration N8N — Google Maps Scraper</div>
            </div>
            <p className="text-xs text-white/45 mb-3 leading-relaxed">
              Dans votre workflow N8N, ajoutez un node <strong className="text-white/70">HTTP Request</strong> après votre scraper Google Maps. Configurez-le ainsi pour pousser automatiquement les leads dans le CRM :
            </p>
            <div className="relative">
              <pre className="bg-black/40 border border-white/8 rounded-xl p-4 text-xs text-white/60 overflow-x-auto leading-relaxed">
                {n8nSnippet}
              </pre>
              <button onClick={handleCopySnippet}
                className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors ${copiedSnippet ? 'bg-green-500/20 text-green-400' : 'bg-white/8 text-white/40 hover:bg-white/15 hover:text-white'}`}>
                {copiedSnippet ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-cyan-500/8 border border-cyan-500/15">
            <div className="text-xs font-semibold text-cyan-400 mb-1">Endpoint REST (à configurer avec Supabase)</div>
            <code className="text-xs text-white/50">POST /api/leads</code>
            <p className="text-xs text-white/35 mt-1">Pour activer l'endpoint en production, configurez Supabase dans les variables d'environnement Vercel.</p>
          </div>
        </GlassCard>

        {/* Database */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Database size={15} className="text-green-400" />
            <div className="font-bold text-sm">Base de données</div>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/4">
              <div>
                <div className="font-medium text-sm">Mode actuel</div>
                <div className="text-xs text-white/40 mt-0.5">
                  {import.meta.env.VITE_SUPABASE_URL ? 'Supabase (production)' : 'LocalStorage (démo)'}
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${import.meta.env.VITE_SUPABASE_URL ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                {import.meta.env.VITE_SUPABASE_URL ? '● Live' : '● Démo'}
              </span>
            </div>
            {!import.meta.env.VITE_SUPABASE_URL && (
              <div className="p-3 rounded-xl bg-yellow-500/8 border border-yellow-500/15 text-xs text-yellow-400/80 leading-relaxed">
                <strong>Pour passer en production :</strong> Créez un projet Supabase, configurez <code className="text-yellow-300">VITE_SUPABASE_URL</code> et <code className="text-yellow-300">VITE_SUPABASE_ANON_KEY</code> dans vos variables d'environnement Vercel.
              </div>
            )}
          </div>
        </GlassCard>

        {/* Notifications */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={15} className="text-pink-400" />
            <div className="font-bold text-sm">Notifications</div>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { key: 'newLead', label: 'Nouveau lead créé', desc: 'Notification quand un lead est ajouté' },
              { key: 'stageChange', label: 'Changement d\'étape', desc: 'Quand un lead avance dans le pipeline' },
              { key: 'weeklyReport', label: 'Rapport hebdomadaire', desc: 'Résumé des performances chaque lundi' },
            ].map(n => (
              <label key={n.key} className="flex items-center justify-between p-3 rounded-xl bg-white/4 hover:bg-white/6 transition-colors cursor-pointer">
                <div>
                  <div className="text-sm font-medium">{n.label}</div>
                  <div className="text-xs text-white/35">{n.desc}</div>
                </div>
                <div className={`relative w-10 h-5 rounded-full transition-colors ${notifForm[n.key] ? 'bg-cyan-500/80' : 'bg-white/15'}`}
                  onClick={() => setNotifForm(p => ({ ...p, [n.key]: !p[n.key] }))}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifForm[n.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </label>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
