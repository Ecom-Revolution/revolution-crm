import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { user, error: err } = await auth.login(email, password)
    setLoading(false)
    if (err) return setError(err)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-5 relative app-frame">
      <div className="aurora" />
      <div className="relative z-10 w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4 sm:gap-5 items-stretch">

        {/* Hero */}
        <div className="dashboard-hero crm-command-hero glass p-5 sm:p-8 flex flex-col justify-between animate-fade-up">
          <div className="hero-grid absolute inset-0 opacity-20" />
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm"
                  style={{ background: 'linear-gradient(135deg, #22D3EE, #20D16B 52%, #8B5CF6)', color: '#0B1020' }}>
                  RE
                </div>
                <div>
                  <div className="font-black text-sm">Revolution Ecom</div>
                  <div className="text-xs text-white/40">Agence</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-white/50">
                <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 8px #20D16B' }} />
                CRM en ligne • sécurisé
              </div>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black leading-[0.96] mb-5">
              <span className="text-white">Mission Control</span><br />
              <span className="grad">Revolution CRM.</span>
            </h1>
            <p className="text-white/55 text-base leading-relaxed max-w-md">
              Un cockpit commercial pour piloter les leads, les closers, les RDV et la croissance depuis un seul endroit.
            </p>

            <div className="flex flex-wrap gap-2 mt-6">
              {['E-COMMERCE', 'SMMA ⚡', 'ADS 📈', 'CLOSER'].map(tag => (
                <span key={tag} className="px-3 py-1.5 rounded-full text-xs text-white/50 border border-white/10 bg-white/4">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
            {[
              { n: '⚡ Ultra rapide', l: 'navigation + recherche' },
              { n: '💎 Pro', l: 'professionnel' },
              { n: '🛡️ Sécurisé', l: 'accès par compte' },
            ].map(k => (
              <div key={k.n} className="bg-black/20 border border-white/8 rounded-2xl p-3">
                <div className="font-bold text-sm">{k.n}</div>
                <div className="text-xs text-white/40 mt-1">{k.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Login form */}
        <div className="glass p-5 sm:p-7 flex flex-col justify-center animate-fade-up delay-1">
          <h2 className="text-xl font-black mb-1">Connexion</h2>
          <p className="text-white/45 text-sm mb-6">Entre tes identifiants pour accéder à ton espace.</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contact.myseikomod@gmail.com"
                required
                className="input-base px-3 py-2.5 text-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-base px-3 py-2.5 text-sm w-full"
              />
            </div>

            <div className="mt-1 relative">
              <div className="absolute inset-0 blur-xl opacity-60" style={{ background: 'radial-gradient(ellipse, rgba(34,211,238,0.4) 0%, rgba(139,92,246,0.3) 50%, transparent 70%)' }} />
              <button type="submit" disabled={loading}
                className="btn-grad relative w-full py-3 text-sm font-bold">
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>
          </form>

          <div className="mt-5 p-3 rounded-xl bg-white/3 border border-white/7 text-xs text-white/35">
            <div className="font-semibold text-white/50 mb-1">Accès sécurisé</div>
            <div className="text-white/40">Connectez-vous avec vos identifiants Revolution Ecom.</div>
          </div>

          <div className="mt-4 text-xs text-white/30 flex justify-between">
            <span>© 2026 Revolution Ecom</span>
          </div>
        </div>
      </div>
    </div>
  )
}
