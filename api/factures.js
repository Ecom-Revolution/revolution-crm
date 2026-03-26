// GET /api/factures
// POST /api/factures
// PATCH /api/factures?id=xxx
// DELETE /api/factures?id=xxx
import { getDb, cors, checkAuth } from './_db.js'

function normalize(r) {
  return {
    id: r.id,
    numero: r.numero,
    clientId: r.client_id,
    clientName: r.client_name,
    montant: r.montant,
    description: r.description,
    dateEcheance: r.date_echeance,
    status: r.status,
    createdAt: r.created_at,
  }
}

function genNumero(id) {
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  return `FAC-${ym}-${id.slice(0, 4).toUpperCase()}`
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Clé API invalide' })

  const sql = getDb()
  const id = req.query.id

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM factures ORDER BY created_at DESC`
    return res.status(200).json({ data: rows.map(normalize) })
  }

  if (req.method === 'POST') {
    const { clientId, clientName, montant, description, dateEcheance, status } = req.body
    if (!montant) return res.status(400).json({ error: 'montant requis' })
    const [row] = await sql`
      INSERT INTO factures (client_id, client_name, montant, description, date_echeance, status)
      VALUES (${clientId || null}, ${clientName || null}, ${Number(montant)}, ${description || null},
              ${dateEcheance || null}, ${status || 'brouillon'})
      RETURNING *
    `
    // Update numero after insert
    const numero = genNumero(row.id)
    await sql`UPDATE factures SET numero = ${numero} WHERE id = ${row.id}`
    return res.status(201).json({ data: { ...normalize(row), numero } })
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const { status, montant, description, dateEcheance, clientName } = req.body
    const [row] = await sql`
      UPDATE factures SET
        status = COALESCE(${status || null}, status),
        montant = COALESCE(${montant != null ? Number(montant) : null}, montant),
        description = COALESCE(${description || null}, description),
        date_echeance = COALESCE(${dateEcheance || null}, date_echeance),
        client_name = COALESCE(${clientName || null}, client_name)
      WHERE id = ${id}
      RETURNING *
    `
    if (!row) return res.status(404).json({ error: 'Facture introuvable' })
    return res.status(200).json({ data: normalize(row) })
  }

  if (req.method === 'DELETE' && id) {
    await sql`DELETE FROM factures WHERE id = ${id}`
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
