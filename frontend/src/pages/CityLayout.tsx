import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCity } from '../contexts/CityContext';
import clsx from 'clsx';

const menuItems = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard', path: 'dashboard' },
  { id: 'tasks', icon: '📋', label: 'Registro de Tasks', path: 'tasks' },
  { id: 'events', icon: '📝', label: 'Registro de Eventos', path: 'events' },
  { id: 'completed', icon: '✅', label: 'Tasks Concluídas', path: 'tasks?status=COMPLETED' },
  { id: 'cancelled', icon: '❌', label: 'Tasks Canceladas', path: 'tasks?status=CANCELLED' },
  { id: 'team', icon: '👥', label: 'Cadastro de Equipe', path: 'team' },
];

export default function CityLayout() {
  const { user, logout } = useAuth();
  const { currentCity } = useCity();
  const navigate = useNavigate();
  const location = useLocation();
  const { cityId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const getActiveItem = () => {
    const path = location.pathname.split('/').pop() || '';
    const search = location.search;
    if (search.includes('COMPLETED')) return 'completed';
    if (search.includes('CANCELLED')) return 'cancelled';
    if (path === 'tasks') return 'tasks';
    return path;
  };

  const handleNav = (item: typeof menuItems[0]) => {
    if (item.path.includes('?')) {
      const [p, q] = item.path.split('?');
      navigate(`/city/${cityId}/${p}?${q}`);
    } else {
      navigate(`/city/${cityId}/${item.path}`);
    }
    setSidebarMobileOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:relative z-30 flex flex-col bg-gray-950 border-r border-gray-800 transition-all duration-300',
          'h-full',
          sidebarOpen ? 'w-64' : 'w-16',
          sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-xl">🎯</span>
              <div>
                <p className="text-white font-bold text-sm truncate">Eufogroup</p>
                <p className="text-primary-400 text-xs truncate font-medium">
                  {currentCity?.name || 'Sem cidade'}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 transition-colors flex-shrink-0"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* City indicator */}
        {sidebarOpen && currentCity && (
          <div className="mx-3 mt-3 p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <p className="text-white text-sm font-medium truncate">{currentCity.name}</p>
            </div>
            <p className="text-gray-400 text-xs mt-1">Ambiente isolado ativo</p>
          </div>
        )}

        {/* Menu items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              title={!sidebarOpen ? item.label : undefined}
              className={clsx(
                'sidebar-item w-full',
                getActiveItem() === item.id && 'active'
              )}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-gray-800 space-y-2">
          <button
            onClick={() => navigate('/')}
            title={!sidebarOpen ? 'Trocar cidade' : undefined}
            className="sidebar-item w-full"
          >
            <span className="text-lg flex-shrink-0">🏙️</span>
            {sidebarOpen && <span className="text-sm">Trocar Cidade</span>}
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              title={!sidebarOpen ? 'Painel Admin' : undefined}
              className="sidebar-item w-full"
            >
              <span className="text-lg flex-shrink-0">⚙️</span>
              {sidebarOpen && <span className="text-sm">Painel Admin</span>}
            </button>
          )}

          <button
            onClick={() => { logout(); navigate('/login'); }}
            title={!sidebarOpen ? 'Sair' : undefined}
            className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <span className="text-lg flex-shrink-0">🚪</span>
            {sidebarOpen && <span className="text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarMobileOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400"
            >
              ☰
            </button>
            <div>
              <h1 className="text-white font-semibold text-sm">
                {currentCity?.name || 'Eufogroup Tasks'}
              </h1>
              <p className="text-gray-500 text-xs">Ambiente Isolado • Multi-Tenant</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center text-sm">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white text-xs font-medium">{user?.name}</p>
                <p className="text-gray-400 text-xs">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
