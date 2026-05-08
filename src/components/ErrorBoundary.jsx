import { Component } from 'react'
import { Button } from './ui'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="page-shell">
        <div className="glass p-6 max-w-2xl mx-auto mt-8">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-red-300">Erreur interface</div>
          <h1 className="mt-3 text-2xl font-black">Le CRM a bloqué sur cette page.</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Recharge la page. Si le souci revient, l'erreur ci-dessous permettra de corriger rapidement.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-white/55">
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => window.location.reload()}>Recharger</Button>
            <Button variant="ghost" onClick={() => {
              localStorage.removeItem('crm_session')
              window.location.href = '/login'
            }}>
              Retour login
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
