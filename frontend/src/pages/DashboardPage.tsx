import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardStats, Event } from '../types';
import api from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (cityId) loadDashboard();
  }, [cityId]);

  const loadDashboard = async () => {
    try {
      const { data } = await api.get(`/cities/${cityId}/dashboard`);
      setStats(data.data.stats);
      setRecentEvents(data.data.recentEvents || []);
    } catch {
      toast.error('Erro ao carregar dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
      <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
      Carregando dashboard...
    </div>
  );

  const statCards = [
    { label: 'Total de Tasks', value: stats?.totalTasks || 0, icon: '📋', color: 'from-blue-600/20 to-blue-800/20', border: 'border-blue-500/30' },
    { label: 'Pendentes', value: stats?.pendingTasks || 0, icon: '⏳', color: 'from-yellow-600/20 to-yellow-800/20', border: 'border-yellow-500/30' },
    { label: 'Em Andamento', value: stats?.inProgressTasks || 0, icon: '🔄', color: 'from-indigo-600/20 to-indigo-800/20', border: 'border-indigo-500/30' },
    { label: 'Concluídas', value: stats?.completedTasks || 0, icon: '✅', color: 'from-green-600/20 to-green-800/20', border: 'border-green-500/30' },
    { label: 'Canceladas', value: stats?.cancelledTasks || 0, icon: '❌', color: 'from-red-600/20 to-red-800/20', border: 'border-red-500/30' },
    { label: 'Atrasadas', value: stats?.overdueTasks || 0, icon: '🚨', color: 'from-orange-600/20 to-orange-800/20', border: 'border-orange-500/30' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Visão geral desta cidade</p>
        </div>
        <button onClick={loadDashboard} className="btn-secondary text-sm flex items-center gap-2">
          <span>🔄</span> Atualizar
        </button>
      </div>

      {/* SLA Card */}
      <div className="card bg-gradient-to-br from-primary-600/20 to-primary-900/20 border-primary-500/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Taxa de SLA (Conclusão)</p>
            <p className="text-5xl font-bold text-white mt-1">{stats?.slaRate || 0}%</p>
            <p className="text-gray-400 text-sm mt-2">
              {stats?.completedTasks} concluídas de {(stats?.totalTasks || 0) - (stats?.cancelledTasks || 0)} realizadas
            </p>
          </div>
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#374151" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke="#667eea" strokeWidth="8"
                strokeDasharray={`${(stats?.slaRate || 0) * 2.51} 251`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className={`stat-card bg-gradient-to-br ${card.color} border ${card.border} cursor-pointer`}
            onClick={() => card.label === 'Concluídas'
              ? navigate(`/city/${cityId}/tasks?status=COMPLETED`)
              : card.label === 'Canceladas'
                ? navigate(`/city/${cityId}/tasks?status=CANCELLED`)
                : navigate(`/city/${cityId}/tasks`)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-xs mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-white">{card.value}</p>
              </div>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent events */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">📝 Eventos Recentes</h2>
          <button
            onClick={() => navigate(`/city/${cityId}/events`)}
            className="text-primary-400 hover:text-primary-300 text-sm"
          >
            Ver todos →
          </button>
        </div>
        {recentEvents.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Nenhum evento registrado</p>
        ) : (
          <div className="space-y-3">
            {recentEvents.map(event => (
              <div key={event.id} className="flex gap-3 p-3 bg-gray-900 rounded-xl border border-gray-700">
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">📝</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {event.employee?.name} — {event.cargo}
                  </p>
                  <p className="text-gray-400 text-xs truncate">{event.description}</p>
                  <p className="text-gray-600 text-xs mt-1">
                    {format(new Date(event.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">⚡ Ações Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Nova Task', icon: '➕', path: `tasks` },
            { label: 'Novo Evento', icon: '📝', path: `events` },
            { label: 'Equipe', icon: '👥', path: `team` },
            { label: 'Tasks Pendentes', icon: '⏳', path: `tasks?status=PENDING` },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => navigate(`/city/${cityId}/${action.path}`)}
              className="flex flex-col items-center gap-2 p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-primary-500/50 hover:bg-gray-800 transition-all"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-gray-300 text-xs text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
