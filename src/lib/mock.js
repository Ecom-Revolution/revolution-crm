// Données initiales — version opérationnelle
export const MOCK_USERS = [
  { id: 'u1', name: 'Sofiane Saiah', email: 'contact.myseikomod@gmail.com', role: 'admin', avatar: 'S' },
]

export const MOCK_LEADS = []
export const MOCK_ACTIVITIES = []
export const MOCK_CLIENTS = []
export const MOCK_AGENDA = []
export const MOCK_FACTURES = []
export const MOCK_TEMPLATES = [
  { id: 't1', name: 'Premier contact Google Maps', type: 'Email', subject: 'Votre présence en ligne — Revolution Ecom', body: 'Bonjour {{prenom}},\n\nJ\'ai vu votre activité chez {{entreprise}} et je pense qu\'on peut vous aider à générer plus de clients en ligne.\n\nEst-ce qu\'on pourrait échanger 15 minutes cette semaine ?\n\nCordialement,\nSofiane — Revolution Ecom', tags: ['cold', 'google maps'], createdAt: new Date().toISOString() },
  { id: 't2', name: 'Relance après silence', type: 'Email', subject: 'Suite à notre échange', body: 'Bonjour {{prenom}},\n\nJe reviens vers vous suite à notre échange — avez-vous eu le temps de réfléchir ?\n\nJe reste disponible pour répondre à vos questions.\n\nBonne journée,\nSofiane', tags: ['relance', 'follow-up'], createdAt: new Date().toISOString() },
  { id: 't3', name: 'Envoi de proposition', type: 'Email', subject: 'Proposition personnalisée — {{entreprise}}', body: 'Bonjour {{prenom}},\n\nComme convenu, vous trouverez ci-joint notre proposition personnalisée pour {{entreprise}}.\n\nN\'hésitez pas à me contacter pour en discuter.\n\nCordialement,\nSofiane — Revolution Ecom', tags: ['proposition', 'closing'], createdAt: new Date().toISOString() },
  { id: 't4', name: 'Closing final', type: 'Email', subject: 'On démarre !', body: 'Bonjour {{prenom}},\n\nPour finaliser notre collaboration, voici le lien de paiement : [LIEN]\n\nDès réception, on démarre dès lundi !\n\nHâte de travailler avec vous,\nSofiane', tags: ['closing', 'paiement'], createdAt: new Date().toISOString() },
  { id: 't5', name: 'Réactivation prospect', type: 'SMS', subject: '', body: 'Bonjour {{prenom}}, c\'est Sofiane de Revolution Ecom. On a de nouvelles offres qui pourraient booster {{entreprise}}. On se fait un point rapide ?', tags: ['relance', 'sms'], createdAt: new Date().toISOString() },
]
