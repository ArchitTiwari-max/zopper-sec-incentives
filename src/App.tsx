import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/Login'
import { ReportPage } from './pages/Report'
import { AdminDashboard } from './pages/AdminDashboard'
import { SecDashboard } from './pages/SecDashboard'

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[900px]">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/admin" element={<LoginPage />} />
          <Route path="/dashboard" element={<SecDashboard />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  )
}
