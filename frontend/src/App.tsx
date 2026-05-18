import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminRoute } from './components/AdminRoute'
import { PermissionRoute } from './components/PermissionRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import { AppLayout } from './layouts/AppLayout'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { ModeSettingsPage } from './pages/ModeSettingsPage'
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
          <PermissionRoute permissions={['settings.theme.manage', 'settings.knowledge.manage', 'settings.permission.manage']}>
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/study" element={<StudyPage />} />
        <Route
          path="/mode-settings"
          element={
            <AdminRoute>
              <ModeSettingsPage />
            </AdminRoute>
          }
        />

        <Route
          path="/practice"
          element={
            <PermissionRoute permission="practice.use">
              <PracticePage />
            </PermissionRoute>
          }
        />

        <Route path="/history" element={<HistoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to={token ? '/dashboard' : '/auth'} replace />} />
    </Routes>
  )
}

export default App
