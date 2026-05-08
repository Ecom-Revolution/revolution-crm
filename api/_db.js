// Neon Postgres connection helper — partagé par tous les handlers /api/*
import { neon } from '@neondatabase/serverless'

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL non configurée — installez Neon via Vercel Marketplace')
  }
  return neon(process.env.DATABASE_URL)
}

export const API_KEY = process.env.CRM_API_KEY || 'revo_demo_key'

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization')
}

export function checkAuth(req) {
  // Accept API key header OR Bearer token
  const key = req.headers['x-api-key']
  if (key && key === API_KEY) return true
  const auth = req.headers['authorization']
  if (auth && auth === `Bearer ${API_KEY}`) return true
  return false
}

export function getRequestUser(req) {
  const id = req.headers['x-user-id']
  const role = req.headers['x-user-role']
  if (!id || !role) return null
  return { id, role }
}

export function isAdminRequest(req) {
  return getRequestUser(req)?.role === 'admin'
}

export function isMemberRequest(req) {
  const role = getRequestUser(req)?.role
  return role === 'setter' || role === 'closer'
}
