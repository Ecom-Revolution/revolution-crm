/**
 * Migration Neon — Revolution CRM
 * Usage : node scripts/migrate-neon.js
 * Prérequis : DATABASE_URL dans .env.local (auto-injecté par `vercel integration add neon`)
 */
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env.production' })

const sql = neon(process.env.DATABASE_URL)

async function migrate() {
  console.log('🚀 Migration Revolution CRM → Neon Postgres')

  // ==================== LEADS ====================
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      company TEXT,
      sector TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      mockup_url TEXT,
      source TEXT DEFAULT 'Google Maps',
      stage TEXT DEFAULT 'Prospect',
      heat_score TEXT DEFAULT 'Cold',
      estimated_value NUMERIC DEFAULT 0,
      upsell_potential BOOLEAN DEFAULT false,
      loss_reason TEXT,
      assigned_closer_id UUID,
      last_contact_at TIMESTAMPTZ DEFAULT now(),
      stage_updated_at TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      ai_score INTEGER,
      ai_needs TEXT,
      ai_hook TEXT,
      -- Nouveaux champs (fusion CRM partenaire)
      address TEXT,
      city TEXT,
      zip TEXT,
      dirigeant TEXT,
      rating NUMERIC,
      reviews INTEGER DEFAULT 0,
      siren TEXT,
      site_status TEXT,
      rdv_date TIMESTAMPTZ,
      rdv_note TEXT,
      notes TEXT,
      distance_km NUMERIC
    )
  `
  console.log('✅ Table leads créée')

  // ==================== PROFILES (utilisateurs) ====================
  await sql`
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'closer',
      avatar TEXT,
      phone TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `
  console.log('✅ Table profiles créée')

  // Créer l'admin par défaut (mdp: demo1234)
  await sql`
    INSERT INTO profiles (email, password_hash, full_name, role, avatar)
    VALUES (
      'contact.myseikomod@gmail.com',
      '$2b$10$rOCumKKL8RwKkrjJq1TNfuDFiiqNsIFHfPFJCCHV6Gi.0sOkfGPbK',
      'Sofiane Saiah',
      'admin',
      'S'
    )
    ON CONFLICT (email) DO NOTHING
  `
  console.log('✅ Admin créé (email: contact.myseikomod@gmail.com / mdp: demo1234)')

  // ==================== ACTIVITIES ====================
  await sql`
    CREATE TABLE IF NOT EXISTS activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
      user_id UUID REFERENCES profiles(id),
      type TEXT NOT NULL,
      content TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `
  console.log('✅ Table activities créée')

  // ==================== CLIENTS ====================
  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      company TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      service TEXT,
      monthly_value NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'Actif',
      start_date DATE,
      notes TEXT,
      nps INTEGER,
      upsell_potential BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `
  console.log('✅ Table clients créée')

  // ==================== TEMPLATES ====================
  await sql`
    CREATE TABLE IF NOT EXISTS templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      type TEXT DEFAULT 'Email',
      subject TEXT,
      body TEXT,
      tags TEXT[],
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `
  console.log('✅ Table templates créée')

  // ==================== AGENDA ====================
  await sql`
    CREATE TABLE IF NOT EXISTS agenda (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
      user_id UUID REFERENCES profiles(id),
      date TIMESTAMPTZ NOT NULL,
      duration INTEGER DEFAULT 30,
      type TEXT DEFAULT 'appel',
      note TEXT,
      status TEXT DEFAULT 'planifie',
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `
  console.log('✅ Table agenda créée')

  // ==================== FACTURES ====================
  await sql`
    CREATE TABLE IF NOT EXISTS factures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      numero TEXT,
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      client_name TEXT,
      montant NUMERIC NOT NULL DEFAULT 0,
      description TEXT,
      date_echeance DATE,
      status TEXT DEFAULT 'brouillon',
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `
  console.log('✅ Table factures créée')

  // ==================== INDEX pour les perfs ====================
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage)`
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_sector ON leads(sector)`
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_assigned_closer ON leads(assigned_closer_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_agenda_date ON agenda(date)`
  console.log('✅ Index créés')

  console.log('\n🎉 Migration terminée ! Base prête.')
}

// ==================== IMPORT PROSPECTS ====================
async function importProspects() {
  const raw = readFileSync('/tmp/partner-crm-businesses.json', 'utf-8')
  const businesses = JSON.parse(raw)

  console.log(`\n📥 Import de ${businesses.length} prospects du CRM partenaire...`)

  const STAGE_MAP = {
    sans_interet: 'Perdu',
    a_contacter: 'Prospect',
    contacte: 'Contacté',
    a_repondu: 'Contacté',
    rdv_pris: 'RDV Pris',
    client: 'Gagné',
  }

  const calcAiScore = (b) => {
    let score = 0
    if (b.has_phone) score += 20
    if (b.has_email) score += 30
    if (b.site_status === 'none' || b.site_status === 'obsolete') score += 35
    if (b.rating >= 4.0) score += 10
    if (b.reviews >= 50) score += 5
    return Math.min(score, 100)
  }

  let imported = 0
  let skipped = 0

  for (const b of businesses) {
    try {
      const stage = STAGE_MAP[b.status] || 'Prospect'
      const aiScore = calcAiScore(b)

      const aiNeeds = b.site_status === 'none'
        ? 'Site web inexistant — fort potentiel de création'
        : b.site_status === 'obsolete'
          ? 'Site web obsolète — refonte recommandée'
          : 'Présence web à optimiser'

      const aiHook = b.has_phone && b.rating > 0
        ? `Bonne réputation locale (${b.rating}⭐) — facilite l'approche commerciale`
        : b.has_email
          ? 'Contact email disponible — approche cold email possible'
          : 'Approche téléphonique recommandée'

      await sql`
        INSERT INTO leads (
          name, company, sector, email, phone, website, source, stage,
          heat_score, ai_score, ai_needs, ai_hook,
          city, zip, address, dirigeant, rating, reviews, siren,
          site_status, notes, distance_km, created_at
        ) VALUES (
          ${b.name}, ${b.name}, ${b.sector || null}, ${b.email || null},
          ${b.phone || null}, ${b.website || null}, ${b.source || 'Google Maps'},
          ${stage}, ${aiScore >= 70 ? 'Hot' : aiScore >= 40 ? 'Warm' : 'Cold'},
          ${aiScore}, ${aiNeeds}, ${aiHook},
          ${b.city || null}, ${b.zip || null}, ${b.address || null},
          ${b.dirigeant || null}, ${b.rating || null}, ${b.reviews || 0},
          ${b.siren || null}, ${b.site_status || 'none'},
          ${b.notes || null}, ${b.distance_km || null},
          ${b.scraped_at || new Date().toISOString()}
        )
        ON CONFLICT DO NOTHING
      `
      imported++
    } catch (err) {
      console.warn(`⚠️ Skip ${b.name}: ${err.message}`)
      skipped++
    }
  }

  console.log(`✅ ${imported} prospects importés, ${skipped} ignorés`)
}

migrate()
  .then(() => importProspects())
  .then(() => { console.log('\n✅ Tout est prêt !'); process.exit(0) })
  .catch(err => { console.error('❌ Erreur:', err); process.exit(1) })
