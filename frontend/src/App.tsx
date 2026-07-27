import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CityProvider } from './contexts/CityContext';

import LoginPage from './pages/LoginPage';
import CitySelectPage from './pages/CitySelectPage';
import CityLayout from './pages/CityLayout';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import EventsPage from './pages/EventsPage';
import TeamPage from './pages/TeamPage';
import AdminPage from './pages/AdminPage';
import ReportsPage from './pages/ReportsPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
          Carregando...
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// Bloqueia OPERATOR de acessar rotas exclusivas de ADMIN/SUPER_ADMIN
const NonOperatorRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user || user.role === 'OPERATOR') {
    return <Navigate to="dashboard" replace />;
  }
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <CitySelectPage />
        </ProtectedRoute>
      } />
      
      <Route path="/city/:cityId" element={
        <ProtectedRoute>
          <CityLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="team" element={
          <NonOperatorRoute>
            <TeamPage />
          </NonOperatorRoute>
        } />
      </Route>
      
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CityProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1f2937',
                color: '#f9fafb',
                border: '1px solid #374151',
                borderRadius: '12px',
              },
              success: { iconTheme: { primary: '#667eea', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </CityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
