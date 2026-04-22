import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { defaultStudyCategory } from './constants/study'
import { PermissionRoute } from './components/PermissionRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import { AppLayout } from './layouts/AppLayout'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { ModesPage } from './pages/ModesPage'
import { PracticePage } from './pages/PracticePage'
import { StudyPage } from './pages/StudyPage'
import { ThemeSettingsPage } from './pages/ThemeSettingsPage'

const App = () => {
  const { fetchMe, token } = useAuth()

  useEffect(() => {
    if (token) void fetchMe()
  }, [fetchMe, token])

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/settings"
        element={
          <PermissionRoute permissions={['settings.theme.manage', 'settings.permission.manage']}>
            <ThemeSettingsPage />
          </PermissionRoute>
        }
      />
      <Route path="/theme-settings" element={<Navigate to="/settings?tab=theme" replace />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to={`/dashboard/${defaultStudyCategory}`} replace />} />
        <Route path="/dashboard" element={<Navigate to={`/dashboard/${defaultStudyCategory}`} replace />} />
        <Route path="/dashboard/:category" element={<DashboardPage />} />

        <Route path="/modes" element={<Navigate to={`/modes/${defaultStudyCategory}`} replace />} />
        <Route path="/modes/:category" element={<ModesPage />} />

        <Route path="/study" element={<Navigate to={`/study/${defaultStudyCategory}`} replace />} />
        <Route path="/study/:category" element={<StudyPage />} />

        <Route path="/practice" element={<Navigate to={`/practice/${defaultStudyCategory}`} replace />} />
        <Route
          path="/practice/:category"
          element={
            <PermissionRoute permission="practice.use">
              <PracticePage />
            </PermissionRoute>
          }
        />

        <Route path="/history" element={<Navigate to={`/history/${defaultStudyCategory}`} replace />} />
        <Route path="/history/:category" element={<HistoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to={token ? '/' : '/auth'} replace />} />
    </Routes>
  )
}

export default App
