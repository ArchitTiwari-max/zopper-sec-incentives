import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PublicOnlyRoute, SECRoute, AdminRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/Login'
import { ReportPage } from './pages/Report'
import { AdminDashboard } from './pages/AdminDashboard'
import { SecDashboard } from './pages/SecDashboard'
import { AdminLoginPage } from './pages/AdminLogin'
import { Leaderboard } from './pages/Leaderboard'
import { VoucherProcessor } from './pages/VoucherProcessor'
import { AdminInvalidImeiProcessor } from './pages/AdminInvalidImeiProcessor'
import { Footer } from './components/Footer'
import { AdminLeaderboard } from './pages/AdminLeaderboard'
import { ReferralPage } from './pages/Referral'
import { TestPage } from './pages/TestPage'
import { AdminTestResults } from './pages/AdminTestResults'
import { AdminTestInvites } from './pages/AdminTestInvites'
import { AdminProctoringAlerts } from './pages/AdminProctoringAlerts'

export default function App() {
  const location = useLocation()
  const showFooter = location.pathname !== '/' && location.pathname !== '/leaderboard' && location.pathname !== '/admin/leaderboard'
  const isFullScreenPage = location.pathname === '/leaderboard' || location.pathname === '/admin/leaderboard'
  
  return (
    <AuthProvider>
      {isFullScreenPage ? (
        <Routes>
          <Route path="/leaderboard" element={
            <SECRoute>
              <Leaderboard />
            </SECRoute>
          } />
          <Route path="/admin/leaderboard" element={
            <AdminRoute>
              <AdminLeaderboard />
            </AdminRoute>
          } />
        </Routes>
      ) : (
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
              
              {/* Test route - no authentication required, token-based access */}
              <Route path="/test" element={<TestPage />} />
              
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
              <Route path="/referral" element={
                <SECRoute>
                  <ReferralPage />
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
              <Route path="/admin/voucher-processor" element={
                <AdminRoute>
                  <VoucherProcessor />
                </AdminRoute>
              } />
              <Route path="/admin/invalid-imei-processor" element={
                <AdminRoute>
                  <AdminInvalidImeiProcessor />
                </AdminRoute>
              } />
              <Route path="/admin/test-results" element={
                <AdminRoute>
                  <AdminTestResults />
                </AdminRoute>
              } />
              <Route path="/admin/test-invites" element={
                <AdminRoute>
                  <AdminTestInvites />
                </AdminRoute>
              } />
              <Route path="/admin/proctoring" element={
                <AdminRoute>
                  <AdminProctoringAlerts />
                </AdminRoute>
              } />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </div>
      )}
      {showFooter && <Footer />}
    </AuthProvider>
  )
}
