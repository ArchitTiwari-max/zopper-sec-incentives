import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PublicOnlyRoute, SECRoute, AdminRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/Login'
import { ReportPage } from './pages/Report'
import { AdminDashboard } from './pages/AdminDashboard'
import { SecDashboard } from './pages/SecDashboard'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-[900px]">
          <Routes>
            {/* Public routes (redirect if already authenticated) */}
            <Route path="/" element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            } />
            <Route path="/admin" element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            } />
            
            {/* SEC protected routes */}
            <Route path="/dashboard" element={
              <SECRoute>
                <SecDashboard />
              </SECRoute>
            } />
            <Route path="/report" element={
              <SECRoute>
                <ReportPage />
              </SECRoute>
            } />
            
            {/* Admin protected routes */}
            <Route path="/admin/dashboard" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  )
}
