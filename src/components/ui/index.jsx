// ===== GLASS CARD =====
export function GlassCard({ children, className = '', ...props }) {
  return (
    <div className={`glass p-5 ${className}`} {...props}>
      {children}
    </div>
  )
}

// ===== STAT CARD =====
export function StatCard({ icon, value, label, sub, color = 'cyan' }) {
  const colors = {
    cyan: 'text-cyan-400',
    violet: 'text-violet-400',
    green: 'text-green-400',
    pink: 'text-pink-400',
    orange: 'text-orange-400',
    blue: 'text-blue-400',
  }
  return (
    <div className="glass p-4 flex flex-col gap-2">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 ${colors[color]}`}>
        {icon}
      </div>
      <div className="text-2xl font-black tracking-tight">{value}</div>
      <div className="text-xs text-white/50">{label}</div>
      {sub && <div className="text-xs text-white/35">{sub}</div>}
    </div>
  )
}

// ===== HEAT BADGE =====
export function HeatBadge({ score }) {
  const map = {
    Hot: { label: '🔥 Hot', cls: 'bg-red-500/15 text-red-400 border-red-500/25' },
    Warm: { label: '🌡️ Warm', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
    Cold: { label: '❄️ Cold', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  }
  const { label, cls } = map[score] || map.Cold
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  )
}

// ===== STAGE BADGE =====
export function StageBadge({ stage }) {
  const map = {
    'Prospect': 'bg-white/10 text-white/60 border-white/15',
    'Contacté': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    'RDV Pris': 'bg-violet-500/15 text-violet-400 border-violet-500/25',
    'Proposition Envoyée': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    'Gagné': 'bg-green-500/15 text-green-400 border-green-500/25',
    'Perdu': 'bg-red-500/15 text-red-400 border-red-500/25',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${map[stage] || map['Prospect']}`}>
      {stage}
    </span>
  )
}

// ===== AVATAR =====
export function Avatar({ name = '?', size = 'sm' }) {
  const colors = ['bg-cyan-500/20 text-cyan-400', 'bg-violet-500/20 text-violet-400', 'bg-pink-500/20 text-pink-400', 'bg-green-500/20 text-green-400', 'bg-orange-500/20 text-orange-400']
  const color = colors[(name.charCodeAt(0) || 0) % colors.length]
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg' }
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

// ===== BUTTON =====
export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-[14px] transition-all cursor-pointer'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  const variants = {
    primary: 'btn-grad',
    ghost: 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white',
    danger: 'bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// ===== INPUT =====
export function Input({ className = '', ...props }) {
  return (
    <input className={`input-base px-3 py-2 text-sm w-full ${className}`} {...props} />
  )
}

// ===== SELECT =====
export function Select({ className = '', children, ...props }) {
  return (
    <select className={`input-base px-3 py-2 text-sm w-full appearance-none ${className}`} {...props}>
      {children}
    </select>
  )
}

// ===== TEXTAREA =====
export function Textarea({ className = '', ...props }) {
  return (
    <textarea className={`input-base px-3 py-2 text-sm w-full resize-none ${className}`} {...props} />
  )
}

// ===== MODAL =====
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`glass relative w-full ${width} max-h-[90vh] overflow-y-auto z-10 shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h3 className="font-bold text-base">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ===== BADGE =====
export function Badge({ children, color = 'default' }) {
  const colors = {
    default: 'bg-white/8 text-white/60',
    cyan: 'bg-cyan-500/15 text-cyan-400',
    green: 'bg-green-500/15 text-green-400',
    red: 'bg-red-500/15 text-red-400',
    orange: 'bg-orange-500/15 text-orange-400',
    violet: 'bg-violet-500/15 text-violet-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

// ===== SPINNER =====
export function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
  )
}

// ===== EMPTY STATE =====
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="text-4xl opacity-30">{icon}</div>
      <div className="font-semibold text-white/60">{title}</div>
      {description && <div className="text-sm text-white/35 max-w-xs">{description}</div>}
      {action}
    </div>
  )
}
