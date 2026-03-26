import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'
import Leads from './pages/Leads'
import LeadDetail from './pages/LeadDetail'
import Closers from './pages/Closers'
import Clients from './pages/Clients'
import Templates from './pages/Templates'
import Reporting from './pages/Reporting'
import Settings from './pages/Settings'
import Agenda from './pages/Agenda'
import Factures from './pages/Factures'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/closers" element={<Closers />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/factures" element={<Factures />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/reporting" element={<Reporting />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
