const SERVICES = [
  {
    id: 'crm-automation',
    name: 'CRM & automatisation',
    category: 'Infrastructure',
    match: ['agence', 'cabinet', 'formation', 'recrutement', 'service', 'btob', 'b2b'],
    pitch: 'Structurer le pipeline, les relances et les suivis pour supprimer les pertes de leads.',
    nextActions: ['Cartographier le process actuel', 'Repérer les leads sans prochaine action', 'Proposer un CRM ou une automatisation de relance'],
  },
  {
    id: 'saas-webapp',
    name: 'SaaS, CRM ou web app',
    category: 'Produit digital',
    match: ['saas', 'logiciel', 'marketplace', 'startup', 'outil', 'application', 'interne'],
    pitch: 'Transformer un process manuel ou une idée produit en application exploitable.',
    nextActions: ['Identifier le process répétitif', 'Lister les utilisateurs internes', 'Proposer un prototype ou MVP cadré'],
  },
  {
    id: 'acquisition-system',
    name: 'Système d’acquisition',
    category: 'Growth',
    match: ['btp', 'immobilier', 'local', 'artisan', 'cabinet', 'agence', 'coach', 'formation'],
    pitch: 'Créer une machine mesurable pour générer des rendez-vous qualifiés.',
    nextActions: ['Qualifier l’ICP', 'Proposer une base ciblée', 'Lancer séquence email, LinkedIn ou appel'],
  },
  {
    id: 'website-conversion',
    name: 'Site, tunnel & conversion',
    category: 'Web',
    match: ['e-commerce', 'shopify', 'restaurant', 'clinique', 'garage', 'dentiste', 'esthétique', 'commerce'],
    pitch: 'Transformer le trafic ou la réputation existante en demandes entrantes.',
    nextActions: ['Auditer le site ou l’absence de site', 'Identifier les CTA et preuves sociales manquants', 'Proposer landing, tunnel ou refonte'],
  },
  {
    id: 'local-visibility',
    name: 'Visibilité locale & réputation',
    category: 'Local',
    match: ['restaurant', 'dentiste', 'garage', 'clinique', 'artisan', 'coiffeur', 'plomberie', 'local'],
    pitch: 'Améliorer la présence locale, la fiche Google et la conversion des appels entrants.',
    nextActions: ['Analyser note et avis', 'Vérifier fiche Google, site et téléphone', 'Proposer optimisation locale + page de conversion'],
  },
]

const normalize = (value) => String(value || '').toLowerCase()

export function recommendServiceForLead(lead) {
  const haystack = normalize([
    lead?.sector,
    lead?.company,
    lead?.name,
    lead?.source,
    lead?.website,
    lead?.notes,
    Array.isArray(lead?.aiNeeds) ? lead.aiNeeds.join(' ') : lead?.aiNeeds,
  ].filter(Boolean).join(' '))

  const service = SERVICES.find(item => item.match.some(keyword => haystack.includes(keyword)))
    || (!lead?.website || lead?.siteStatus === 'none' || lead?.siteStatus === 'obsolete' ? SERVICES[3] : SERVICES[2])

  return service
}

export function getLeadPriorityScore(lead) {
  let score = 35
  if (lead?.heatScore === 'Hot') score += 20
  if (lead?.heatScore === 'Warm') score += 10
  if (lead?.phone) score += 10
  if (lead?.email) score += 8
  if (!lead?.website || lead?.siteStatus === 'none') score += 14
  if (lead?.siteStatus === 'obsolete') score += 10
  if (Number(lead?.rating) >= 4) score += 8
  if (Number(lead?.reviews) >= 30) score += 6
  if (Number(lead?.estimatedValue) >= 3000) score += 10
  return Math.min(100, score)
}

export function buildLeadPlaybook(lead) {
  const service = recommendServiceForLead(lead)
  const score = getLeadPriorityScore(lead)
  const signals = [
    lead?.phone ? 'Téléphone disponible' : null,
    lead?.email ? 'Email disponible' : null,
    !lead?.website ? 'Aucun site détecté' : null,
    lead?.siteStatus === 'obsolete' ? 'Site à moderniser' : null,
    Number(lead?.rating) >= 4 ? `Bonne réputation locale (${lead.rating})` : null,
    Number(lead?.reviews) >= 30 ? `${lead.reviews} avis exploitables` : null,
    lead?.rdvDate ? 'RDV déjà planifié' : null,
  ].filter(Boolean)

  return {
    service,
    score,
    signals,
    opener: `Angle recommandé : ${service.pitch}`,
    nextActions: service.nextActions,
  }
}
