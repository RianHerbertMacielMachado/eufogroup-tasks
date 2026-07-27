import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCity } from '../contexts/CityContext';
import clsx from 'clsx';
import { CityLayoutType } from '../types';

// ── Definição dos 6 temas ────────────────────────────────────────────────────
interface ThemeTokens {
  bg: string;           // fundo geral
  sidebar: string;      // fundo da sidebar
  sidebarBorder: string;
  header: string;       // fundo do topbar
  headerBorder: string;
  text: string;         // texto principal
  textMuted: string;    // texto secundário
  accent: string;       // cor de destaque (badge, active)
  accentText: string;
  itemHover: string;    // hover no item do menu
  itemActive: string;   // item ativo
  itemActiveText: string;
  cityBadgeBg: string;
  cityBadgeBorder: string;
}

const THEMES: Record<CityLayoutType, ThemeTokens> = {
  CLASSIC: {
    bg: 'bg-gray-900',
    sidebar: 'bg-gray-950',
    sidebarBorder: 'border-gray-800',
    header: 'bg-gray-900',
    headerBorder: 'border-gray-800',
    text: 'text-white',
    textMuted: 'text-gray-400',
    accent: 'bg-indigo-500',
    accentText: 'text-indigo-400',
    itemHover: 'hover:bg-gray-800',
    itemActive: 'bg-gray-800',
    itemActiveText: 'text-indigo-400',
    cityBadgeBg: 'bg-indigo-500/10',
    cityBadgeBorder: 'border-indigo-500/20',
  },
  DARK_PRO: {
    bg: 'bg-[#0d0d0d]',
    sidebar: 'bg-[#0d0d0d]',
    sidebarBorder: 'border-purple-900/40',
    header: 'bg-[#0d0d0d]',
    headerBorder: 'border-purple-900/40',
    text: 'text-purple-100',
    textMuted: 'text-purple-300/60',
    accent: 'bg-purple-500',
    accentText: 'text-purple-400',
    itemHover: 'hover:bg-purple-900/30',
    itemActive: 'bg-purple-900/50',
    itemActiveText: 'text-purple-300',
    cityBadgeBg: 'bg-purple-500/10',
    cityBadgeBorder: 'border-purple-500/30',
  },
  CORPORATE: {
    bg: 'bg-slate-900',
    sidebar: 'bg-slate-950',
    sidebarBorder: 'border-blue-900/40',
    header: 'bg-slate-900',
    headerBorder: 'border-blue-900/40',
    text: 'text-blue-50',
    textMuted: 'text-slate-400',
    accent: 'bg-blue-600',
    accentText: 'text-blue-400',
    itemHover: 'hover:bg-blue-900/30',
    itemActive: 'bg-blue-900/50',
    itemActiveText: 'text-blue-300',
    cityBadgeBg: 'bg-blue-500/10',
    cityBadgeBorder: 'border-blue-500/30',
  },
  MINIMAL: {
    bg: 'bg-gray-100',
    sidebar: 'bg-white',
    sidebarBorder: 'border-gray-200',
    header: 'bg-white',
    headerBorder: 'border-gray-200',
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    accent: 'bg-indigo-500',
    accentText: 'text-indigo-600',
    itemHover: 'hover:bg-gray-100',
    itemActive: 'bg-indigo-50',
    itemActiveText: 'text-indigo-600',
    cityBadgeBg: 'bg-indigo-50',
    cityBadgeBorder: 'border-indigo-200',
  },
  MILITARY: {
    bg: 'bg-[#0a0f0a]',
    sidebar: 'bg-[#0a0f0a]',
    sidebarBorder: 'border-green-900/50',
    header: 'bg-[#0a0f0a]',
    headerBorder: 'border-green-900/50',
    text: 'text-green-100',
    textMuted: 'text-green-300/60',
    accent: 'bg-green-500',
    accentText: 'text-green-400',
    itemHover: 'hover:bg-green-900/30',
    itemActive: 'bg-green-900/40',
    itemActiveText: 'text-green-300',
    cityBadgeBg: 'bg-green-900/30',
    cityBadgeBorder: 'border-green-700/40',
  },
  CYBERPUNK: {
    bg: 'bg-black',
    sidebar: 'bg-black',
    sidebarBorder: 'border-yellow-400/30',
    header: 'bg-black',
    headerBorder: 'border-yellow-400/30',
    text: 'text-yellow-50',
    textMuted: 'text-yellow-400/60',
    accent: 'bg-yellow-400',
    accentText: 'text-yellow-400',
    itemHover: 'hover:bg-yellow-400/10',
    itemActive: 'bg-yellow-400/15',
    itemActiveText: 'text-yellow-300',
    cityBadgeBg: 'bg-yellow-400/10',
    cityBadgeBorder: 'border-yellow-400/30',
  },
};

// ── Menu items ────────────────────────────────────────────────────────────────
const menuItems = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard',             path: 'dashboard' },
  { id: 'tasks',     icon: '📋', label: 'Registro de Tasks',     path: 'tasks' },
  { id: 'events',    icon: '📝', label: 'Registro de Feedback',  path: 'events' },
  { id: 'completed', icon: '✅', label: 'Tasks Concluídas',      path: 'tasks?status=COMPLETED' },
  { id: 'cancelled', icon: '❌', label: 'Tasks Canceladas',      path: 'tasks?status=CANCELLED' },
  { id: 'reports',   icon: '📈', label: 'Relatório',             path: 'reports' },
  { id: 'team',      icon: '👥', label: 'Cadastro de Equipe',    path: 'team' },
];

// ── Componente ────────────────────────────────────────────────────────────────
export default function CityLayout() {
  const { user, logout } = useAuth();
  const { currentCity } = useCity();
  const navigate = useNavigate();
  const location = useLocation();
  const { cityId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const layout = (currentCity?.layout ?? 'CLASSIC') as CityLayoutType;
  const t = THEMES[layout];

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

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
    <div className={clsx('flex h-screen overflow-hidden', t.bg)}>
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
          'fixed lg:relative z-30 flex flex-col border-r transition-all duration-300 h-full',
          t.sidebar, t.sidebarBorder,
          sidebarOpen ? 'w-64' : 'w-16',
          sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className={clsx('p-4 border-b flex items-center justify-between', t.sidebarBorder)}>
          {sidebarOpen && (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-xl">🎯</span>
              <div>
                <p className={clsx('font-bold text-sm truncate', t.text)}>Eufogroup</p>
                <p className={clsx('text-xs truncate font-medium', t.accentText)}>
                  {currentCity?.name || 'Sem cidade'}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
              t.itemHover, t.textMuted
            )}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* City badge */}
        {sidebarOpen && currentCity && (
          <div className={clsx('mx-3 mt-3 p-3 rounded-xl border', t.cityBadgeBg, t.cityBadgeBorder)}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <p className={clsx('text-sm font-medium truncate', t.text)}>{currentCity.name}</p>
            </div>
            <p className={clsx('text-xs mt-1', t.textMuted)}>Ambiente isolado ativo</p>
          </div>
        )}

        {/* Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const active = getActiveItem() === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item)}
                title={!sidebarOpen ? item.label : undefined}
                className={clsx(
                  'flex items-center gap-3 w-full rounded-xl px-3 py-2.5 transition-all duration-150',
                  active ? [t.itemActive, t.itemActiveText, 'font-semibold'] : [t.textMuted, t.itemHover]
                )}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={clsx('p-3 border-t space-y-1', t.sidebarBorder)}>
          <button
            onClick={() => navigate('/')}
            title={!sidebarOpen ? 'Trocar cidade' : undefined}
            className={clsx('flex items-center gap-3 w-full rounded-xl px-3 py-2.5 transition-all', t.textMuted, t.itemHover)}
          >
            <span className="text-lg flex-shrink-0">🏙️</span>
            {sidebarOpen && <span className="text-sm">Trocar Cidade</span>}
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => navigate('/admin')}
              title={!sidebarOpen ? 'Painel Admin' : undefined}
              className={clsx('flex items-center gap-3 w-full rounded-xl px-3 py-2.5 transition-all', t.textMuted, t.itemHover)}
            >
              <span className="text-lg flex-shrink-0">⚙️</span>
              {sidebarOpen && <span className="text-sm">Painel Admin</span>}
            </button>
          )}

          <button
            onClick={() => { logout(); navigate('/login'); }}
            title={!sidebarOpen ? 'Sair' : undefined}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 transition-all text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <span className="text-lg flex-shrink-0">🚪</span>
            {sidebarOpen && <span className="text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className={clsx('border-b px-4 py-3 flex items-center justify-between flex-shrink-0', t.header, t.headerBorder)}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarMobileOpen(true)}
              className={clsx('lg:hidden w-8 h-8 rounded-lg flex items-center justify-center', t.itemHover, t.textMuted)}
            >
              ☰
            </button>
            <div>
              <h1 className={clsx('font-semibold text-sm', t.text)}>
                {currentCity?.name || 'Eufogroup Tasks'}
              </h1>
              <p className={clsx('text-xs', t.textMuted)}>Ambiente Isolado • Multi-Tenant</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={clsx('hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg', t.itemActive)}>
              <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold', t.accent, t.text)}>
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className={clsx('text-xs font-medium', t.text)}>{user?.name}</p>
                <p className={clsx('text-xs', t.textMuted)}>{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className={clsx('flex-1 overflow-y-auto p-4 lg:p-6', t.bg)}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
