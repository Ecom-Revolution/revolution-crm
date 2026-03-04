// Mock data — remplacé par Supabase une fois configuré
import { addDays, subDays, subHours, subMinutes } from 'date-fns'

const now = new Date()

export const MOCK_USERS = [
  { id: 'u1', name: 'Sofiane Saiah', email: 'contact.myseikomod@gmail.com', role: 'admin', avatar: 'S' },
  { id: 'u2', name: 'Julie Bernard', email: 'julie@revolution-ecom.fr', role: 'closer', avatar: 'J' },
  { id: 'u3', name: 'Marc Dubois', email: 'marc@revolution-ecom.fr', role: 'closer', avatar: 'M' },
]

export const MOCK_LEADS = [
  { id: 'l1', name: 'Sophie Martin', company: 'StyleBoutique', sector: 'Mode', email: 'sophie@styleboutique.fr', phone: '06 12 34 56 78', source: 'Inbound', heatScore: 'Hot', stage: 'Proposition Envoyée', assignedCloserId: 'u3', estimatedValue: 4500, lossReason: null, upsellPotential: true, createdAt: subDays(now, 12).toISOString(), lastContactAt: subDays(now, 2).toISOString(), stageUpdatedAt: subDays(now, 3).toISOString() },
  { id: 'l2', name: 'Thomas Lefebvre', company: 'TechGrowth SaaS', sector: 'Tech', email: 'thomas@techgrowth.io', phone: '06 23 45 67 89', source: 'Cold Email', heatScore: 'Warm', stage: 'RDV Pris', assignedCloserId: 'u2', estimatedValue: 8000, lossReason: null, upsellPotential: false, createdAt: subDays(now, 8).toISOString(), lastContactAt: subDays(now, 5).toISOString(), stageUpdatedAt: subDays(now, 5).toISOString() },
  { id: 'l3', name: 'Camille Girard', company: 'SantéPlus', sector: 'Santé', email: 'camille@santeplus.fr', phone: '06 34 56 78 90', source: 'Referral', heatScore: 'Hot', stage: 'Proposition Envoyée', assignedCloserId: 'u3', estimatedValue: 7200, lossReason: null, upsellPotential: true, createdAt: subDays(now, 15).toISOString(), lastContactAt: subDays(now, 1).toISOString(), stageUpdatedAt: subDays(now, 4).toISOString() },
  { id: 'l4', name: 'Antoine Moreau', company: 'Finances Pro', sector: 'Finance', email: 'antoine@financespro.fr', phone: '06 45 67 89 01', source: 'Referral', heatScore: 'Hot', stage: 'Gagné', assignedCloserId: 'u2', estimatedValue: 12000, lossReason: null, upsellPotential: true, createdAt: subDays(now, 30).toISOString(), lastContactAt: subDays(now, 7).toISOString(), stageUpdatedAt: subDays(now, 8).toISOString() },
  { id: 'l5', name: 'Clara Durand', company: 'ModeExpress', sector: 'Mode', email: 'clara@modeexpress.fr', phone: '06 56 78 90 12', source: 'Inbound', heatScore: 'Hot', stage: 'Gagné', assignedCloserId: 'u3', estimatedValue: 5500, lossReason: null, upsellPotential: false, createdAt: subDays(now, 25).toISOString(), lastContactAt: subDays(now, 10).toISOString(), stageUpdatedAt: subDays(now, 11).toISOString() },
  { id: 'l6', name: 'Nicolas Bernard', company: 'CloudOps', sector: 'Tech', email: 'nicolas@cloudops.io', phone: '06 67 89 01 23', source: 'Cold Email', heatScore: 'Cold', stage: 'Perdu', assignedCloserId: 'u2', estimatedValue: 6500, lossReason: 'Prix', upsellPotential: false, createdAt: subDays(now, 20).toISOString(), lastContactAt: subDays(now, 14).toISOString(), stageUpdatedAt: subDays(now, 14).toISOString() },
  { id: 'l7', name: 'Lucie Petit', company: 'BioFresh Market', sector: 'Alimentation', email: 'lucie@biofresh.fr', phone: '06 78 90 12 34', source: 'Instagram', heatScore: 'Warm', stage: 'Prospect', assignedCloserId: 'u3', estimatedValue: 2800, lossReason: null, upsellPotential: false, createdAt: subDays(now, 3).toISOString(), lastContactAt: subDays(now, 3).toISOString(), stageUpdatedAt: subDays(now, 3).toISOString() },
  { id: 'l8', name: 'Paul Leroy', company: 'AgriTech France', sector: 'Agriculture', email: 'paul@agritech.fr', phone: '06 89 01 23 45', source: 'Google Maps', heatScore: 'Cold', stage: 'Prospect', assignedCloserId: 'u2', estimatedValue: 4100, lossReason: null, upsellPotential: false, createdAt: subDays(now, 5).toISOString(), lastContactAt: subDays(now, 5).toISOString(), stageUpdatedAt: subDays(now, 5).toISOString() },
  { id: 'l9', name: 'Emma Rousseau', company: 'LuxeDecor', sector: 'Décoration', email: 'emma@luxedecor.fr', phone: '06 90 12 34 56', source: 'Google Maps', heatScore: 'Cold', stage: 'Contacté', assignedCloserId: 'u3', estimatedValue: 3200, lossReason: null, upsellPotential: false, createdAt: subDays(now, 7).toISOString(), lastContactAt: subDays(now, 4).toISOString(), stageUpdatedAt: subDays(now, 6).toISOString() },
  { id: 'l10', name: 'Maxime Lambert', company: 'ImmoPremium', sector: 'Immobilier', email: 'maxime@immopremium.fr', phone: '06 01 23 45 67', source: 'Google Maps', heatScore: 'Warm', stage: 'Contacté', assignedCloserId: 'u2', estimatedValue: 9500, lossReason: null, upsellPotential: true, createdAt: subDays(now, 6).toISOString(), lastContactAt: subDays(now, 2).toISOString(), stageUpdatedAt: subDays(now, 5).toISOString() },
]

export const MOCK_ACTIVITIES = [
  { id: 'a1', leadId: 'l1', userId: 'u3', type: 'call', content: 'Appel de qualification — très intéressé par le pack complet', createdAt: subHours(now, 2).toISOString() },
  { id: 'a2', leadId: 'l3', userId: 'u3', type: 'email', content: 'Envoi de la proposition commerciale détaillée', createdAt: subHours(now, 5).toISOString() },
  { id: 'a3', leadId: 'l10', userId: 'u2', type: 'meeting', content: 'RDV en visio — a demandé une démo personnalisée', createdAt: subHours(now, 8).toISOString() },
  { id: 'a4', leadId: 'l4', userId: 'u2', type: 'note', content: 'Deal signé ! Virement reçu. Lancement prévu lundi.', createdAt: subDays(now, 7).toISOString() },
  { id: 'a5', leadId: 'l2', userId: 'u2', type: 'call', content: 'Confirmation RDV pour mercredi 14h', createdAt: subDays(now, 2).toISOString() },
  { id: 'a6', leadId: 'l9', userId: 'u3', type: 'email', content: 'Premier contact — présentation de l\'agence', createdAt: subDays(now, 4).toISOString() },
]

export const MOCK_CLIENTS = [
  { id: 'c1', name: 'Antoine Moreau', company: 'Finances Pro', services: 'Site vitrine + SEO + Google Ads', startDate: subDays(now, 7).toISOString(), status: 'Active', nextDeliverable: 'Rapport mensuel SEO', nextDeadline: addDays(now, 5).toISOString(), nps: 9, upsellPotential: true, notes: 'Client très satisfait, ouvert à un upsell sur les réseaux sociaux.' },
  { id: 'c2', name: 'Clara Durand', company: 'ModeExpress', services: 'Refonte Shopify + Publicités Meta', startDate: subDays(now, 11).toISOString(), status: 'Active', nextDeliverable: 'Créatives publicitaires v2', nextDeadline: addDays(now, 3).toISOString(), nps: 8, upsellPotential: false, notes: 'En phase de lancement campagne.' },
]

export const MOCK_TEMPLATES = [
  { id: 't1', title: 'Premier contact Google Maps', type: 'Cold Email', body: 'Bonjour {{first_name}},\n\nJ\'ai vu votre activité chez {{company}} et je pense qu\'on peut vous aider à générer plus de clients en ligne.\n\nEst-ce qu\'on pourrait échanger 15 minutes cette semaine ?\n\nCordialement,\nSofiane — Revolution Ecom', createdAt: subDays(now, 30).toISOString() },
  { id: 't2', title: 'Relance après silence', type: 'Follow-up', body: 'Bonjour {{first_name}},\n\nJe reviens vers vous suite à notre échange — avez-vous eu le temps de réfléchir ?\n\nJe reste disponible pour répondre à vos questions.\n\nBonne journée,\nSofiane', createdAt: subDays(now, 25).toISOString() },
  { id: 't3', title: 'Envoi de proposition', type: 'Proposition', body: 'Bonjour {{first_name}},\n\nComme convenu, vous trouverez ci-joint notre proposition personnalisée pour {{company}}.\n\nN\'hésitez pas à me contacter pour en discuter.\n\nCordialement,\nSofiane — Revolution Ecom', createdAt: subDays(now, 20).toISOString() },
  { id: 't4', title: 'Closing final', type: 'Closing', body: 'Bonjour {{first_name}},\n\nPour finaliser notre collaboration, voici le lien de paiement : [LIEN]\n\nDès réception, on démarre dès lundi !\n\nHâte de travailler avec vous,\nSofiane', createdAt: subDays(now, 15).toISOString() },
  { id: 't5', title: 'Réactivation client inactif', type: 'Re-engagement', body: 'Bonjour {{first_name}},\n\nCela fait un moment qu\'on ne s\'est pas parlé. On a lancé de nouvelles offres qui pourraient vraiment booster {{company}}.\n\nOn se fait un point de 15 minutes ?\n\nSofiane', createdAt: subDays(now, 10).toISOString() },
]
