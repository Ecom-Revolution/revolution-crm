// POST /api/auth — Login avec email/password (bcrypt)
import bcrypt from 'bcryptjs'
import { getDb, cors } from './_db.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email et password requis' })

  const sql = getDb()
  const [user] = await sql`SELECT * FROM profiles WHERE email = ${email} LIMIT 1`
  if (!user) return res.status(401).json({ error: 'Email introuvable' })

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect' })

  const profile = {
    id: user.id,
    email: user.email,
    name: user.full_name,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
  }

  return res.status(200).json({ user: profile })
}
