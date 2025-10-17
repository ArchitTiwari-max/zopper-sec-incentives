import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PublicOnlyRoute, SECRoute, AdminRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/Login'
import { ReportPage } from './pages/Report'
import { AdminDashboard } from './pages/AdminDashboard'
import { SecDashboard } from './pages/SecDashboard'
import { AdminLoginPage } from './pages/AdminLogin'
import { Footer } from './components/Footer'

export default function App() {
  const location = useLocation()
  const showFooter = location.pathname !== '/'
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
            <Route path="/admin-login" element={
              <PublicOnlyRoute>
                <AdminLoginPage />
              </PublicOnlyRoute>
            } />
            {/* Backward compat redirects */}
            <Route path="/admin" element={<Navigate to="/admin-login" replace />} />
            
            {/* SEC protected routes */}
            <Route path="/plan-sell-info" element={
              <SECRoute>
                <SecDashboard />
              </SECRoute>
            } />
            <Route path="/reporting" element={
              <SECRoute>
                <ReportPage />
              </SECRoute>
            } />
            {/* Backward compat redirects */}
            <Route path="/dashboard" element={<Navigate to="/plan-sell-info" replace />} />
            <Route path="/report" element={<Navigate to="/reporting" replace />} />
            
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
      {showFooter && <Footer />}
    </AuthProvider>
  )
}
