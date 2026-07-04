import React from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'

// Pages
import LoginPage from './pages/LoginPage'
import ClusterDashboard from './pages/ClusterDashboard'
import SchoolsPage from './pages/SchoolsPage'
import SchoolDetailPage from './pages/SchoolDetailPage'
import HMDashboard from './pages/HMDashboard'
import TeachersPage from './pages/TeachersPage'
import StudentRecordsPage from './pages/StudentRecordsPage'
import FormBuilderPage from './pages/FormBuilderPage'
import FormFillPage from './pages/FormFillPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import ExcelSheetsPage from './pages/ExcelSheetsPage'

const Layout = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

const App = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>Initializing application...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'cluster' ? '/cluster' : '/hm'} replace /> : <LoginPage />} />

      {/* Cluster Routes */}
      <Route path="/cluster" element={
        <ProtectedRoute role="cluster">
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<ClusterDashboard />} />
        <Route path="schools" element={<SchoolsPage />} />
        <Route path="schools/:id" element={<SchoolDetailPage />} />
        <Route path="forms" element={<FormBuilderPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="excel" element={<ExcelSheetsPage />} />
      </Route>

      {/* Headmaster Routes */}
      <Route path="/hm" element={
        <ProtectedRoute role="hm">
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<HMDashboard />} />
        <Route path="teachers" element={<TeachersPage />} />
        <Route path="students" element={<Navigate to="/hm/school-data" replace />} />
        <Route path="school-data" element={<StudentRecordsPage />} />
        <Route path="forms" element={<FormFillPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="excel" element={<ExcelSheetsPage />} />
      </Route>

      {/* Fallback route */}
      <Route path="/" element={
        user ? (
          <Navigate to={user.role === 'cluster' ? '/cluster' : '/hm'} replace />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
