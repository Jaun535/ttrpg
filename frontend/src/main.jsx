import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import './index.css'

// Pages (lazy loaded)
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import CampaignPage from './pages/CampaignPage'
import CharactersPage from './pages/CharactersPage'
import CharacterDetailPage from './pages/CharacterDetailPage'
import WikiPage from './pages/WikiPage'
import { WikiArticlePage } from './pages/WikiPage'
import { LogsPage } from './pages/LogsPage'
import { LogDetailPage } from './pages/LogsPage'
import { DocumentsPage } from './pages/LogsPage'
import { ProfilePage } from './pages/ProfilePage'
import { AdminPage } from './pages/ProfilePage'
import { JoinPage } from './pages/ProfilePage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
})

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>Cargando...</div>
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  return user?.is_site_admin ? children : <Navigate to="/" replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/join/:code" element={<JoinPage />} />
            <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
            <Route path="/campaigns/:slug" element={<PrivateRoute><CampaignPage /></PrivateRoute>} />
            <Route path="/campaigns/:slug/characters" element={<PrivateRoute><CharactersPage /></PrivateRoute>} />
            <Route path="/campaigns/:slug/characters/:id" element={<PrivateRoute><CharacterDetailPage /></PrivateRoute>} />
            <Route path="/campaigns/:slug/npcs" element={<PrivateRoute><CharactersPage npc /></PrivateRoute>} />
            <Route path="/campaigns/:slug/wiki" element={<PrivateRoute><WikiPage /></PrivateRoute>} />
            <Route path="/campaigns/:slug/wiki/:id" element={<PrivateRoute><WikiArticlePage /></PrivateRoute>} />
            <Route path="/campaigns/:slug/logs" element={<PrivateRoute><LogsPage /></PrivateRoute>} />
            <Route path="/campaigns/:slug/logs/:id" element={<PrivateRoute><LogDetailPage /></PrivateRoute>} />
            <Route path="/campaigns/:slug/documents" element={<PrivateRoute><DocumentsPage /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminRoute><AdminPage /></AdminRoute></PrivateRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
