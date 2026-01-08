import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PublicOnlyRoute, SECRoute, AdminRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/Login'
import { SignupPage } from './pages/Signup'
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
import { AdminReferrals } from './pages/AdminReferrals'
import { AdminReferralVoucherProcessor } from './pages/AdminReferralVoucherProcessor'
import { TestPage } from './pages/TestPage'
import { TestStoreSelection } from './pages/TestStoreSelection'
import { TestResult } from './pages/TestResult'
import { AdminTestResults } from './pages/AdminTestResults'
import { AdminTestInvites } from './pages/AdminTestInvites'
import { AdminProctoringAlerts } from './pages/AdminProctoringAlerts'
import { AdminScreenshots } from './pages/AdminScreenshots'
import { HelpPage } from './pages/Help'
import { AdminHelpRequests } from './pages/AdminHelpRequests'
import { AllResults } from './pages/AllResults'
import { TestDetails } from './pages/TestDetails'
import { AdminQuestionUpload } from './pages/AdminQuestionUpload'
import { AdminQuestionAnalysis } from './pages/AdminQuestionAnalysis'
import { AdminAnswerDetails } from './pages/AdminAnswerDetails'
import { PitchSultan } from './pages/PitchSultan'
import { PitchSultanSetup } from './pages/PitchSultanSetup'
import { PitchSultanBattle } from './pages/PitchSultanBattle'
import { SecLanding } from './pages/SecLanding'

export default function App() {
  const location = useLocation()
  const showFooter = location.pathname !== '/' && location.pathname !== '/leaderboard' && location.pathname !== '/admin/leaderboard' && location.pathname !== '/welcome'
  const isFullScreenPage = location.pathname === '/leaderboard' || location.pathname === '/admin/leaderboard' || location.pathname === '/pitchsultan' || location.pathname === '/pitchsultan/setup' || location.pathname === '/pitchsultan/battle' || location.pathname === '/welcome'

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
          <Route path="/pitchsultan" element={
            <SECRoute>
              <PitchSultan />
            </SECRoute>
          } />
          <Route path="/pitchsultan/setup" element={
            <SECRoute>
              <PitchSultanSetup />
            </SECRoute>
          } />
          <Route path="/pitchsultan/battle" element={
            <SECRoute>
              <PitchSultanBattle />
            </SECRoute>
          } />
          <Route path="/welcome" element={
            <SECRoute>
              <SecLanding />
            </SECRoute>
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
              <Route path="/signup" element={
                <PublicOnlyRoute>
                  <SignupPage />
                </PublicOnlyRoute>
              } />
              {/* Backward compat redirects */}
              <Route path="/admin" element={<Navigate to="/admin-login" replace />} />

              {/* Test routes - require SEC authentication */}
              <Route path="/test-store-selection" element={
                <SECRoute>
                  <TestStoreSelection />
                </SECRoute>
              } />
              <Route path="/test" element={
                <SECRoute>
                  <TestPage />
                </SECRoute>
              } />
              <Route path="/test-result" element={<TestResult />} />
              <Route path="/results" element={<AllResults />} />
              <Route path="/test-details" element={<TestDetails />} />
              <Route path="/test-details/:id" element={<TestDetails />} />

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
              <Route path="/help" element={
                <SECRoute>
                  <HelpPage />
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
              <Route path="/admin/referrals" element={
                <AdminRoute>
                  <AdminReferrals />
                </AdminRoute>
              } />
              <Route path="/admin/referrals/process" element={
                <AdminRoute>
                  <AdminReferralVoucherProcessor />
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
              <Route path="/admin/screenshots" element={
                <AdminRoute>
                  <AdminScreenshots />
                </AdminRoute>
              } />
              <Route path="/admin/help-requests" element={
                <AdminRoute>
                  <AdminHelpRequests />
                </AdminRoute>
              } />
              <Route path="/admin/questions/upload" element={
                <AdminRoute>
                  <AdminQuestionUpload />
                </AdminRoute>
              } />
              <Route path="/admin/question-analysis" element={
                <AdminRoute>
                  <AdminQuestionAnalysis />
                </AdminRoute>
              } />
              <Route path="/admin/answer-details" element={
                <AdminRoute>
                  <AdminAnswerDetails />
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
