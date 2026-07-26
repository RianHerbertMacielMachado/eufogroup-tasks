import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Employee } from '../types';

// ── tipos locais ──────────────────────────────────────────────────────────────
interface FeedbackStats { total: number; positive: number; negative: number; positiveRate: number | null; }
interface TaskStats { total: number; completed: number; cancelled: number; pending: number; inProgress: number; overdue: number; onTime: number; late: number; onTimeRate: number | null; }
interface EmployeeStat { employee: Pick<Employee, 'id' | 'name' | 'cargo' | 'funcao'>; feedbacks: FeedbackStats; tasks: TaskStats; }
interface ReportData { summary: { feedbacks: FeedbackStats; tasks: TaskStats }; employees: EmployeeStat[]; }

// ── helpers ───────────────────────────────────────────────────────────────────
function RateBar({ value, color = 'green' }: { value: number | null; color?: 'green' | 'red' | 'blue' }) {
  if (value === null) return <span className="text-gray-500 text-xs">—</span>;
  const colors = { green: 'bg-green-500', red: 'bg-red-500', blue: 'bg-primary-500' };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colors[color]}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold text-white w-8 text-right">{value}%</span>
    </div>
  );
}

function StatCard({ label, value, sub, color = 'default' }: { label: string; value: number | string; sub?: string; color?: 'green' | 'red' | 'blue' | 'default' }) {
  const colors = { green: 'text-green-400', red: 'text-red-400', blue: 'text-primary-400', default: 'text-white' };
  return (
    <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50 text-center">
      <p className={`text-xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-gray-400 text-xs mt-0.5">{label}</p>
      {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { cityId } = useParams();

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cargos, setCargos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtros
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterCargo,    setFilterCargo]    = useState('');
  const [filterMonth,    setFilterMonth]    = useState('');
  const [filterYear,     setFilterYear]     = useState(String(new Date().getFullYear()));

  useEffect(() => {
    if (cityId) { loadEmployees(); }
  }, [cityId]);

  useEffect(() => {
    if (cityId) loadReport();
  }, [cityId, filterEmployee, filterCargo, filterMonth, filterYear]);

  const loadEmployees = async () => {
    try {
      const { data } = await api.get(`/cities/${cityId}/employees`, { params: { limit: 200 } });
      const list: Employee[] = Array.isArray(data?.data?.employees) ? data.data.employees : [];
      setEmployees(list);
      const uniqueCargos = [...new Set(list.map(e => e.cargo).filter(Boolean))].sort();
      setCargos(uniqueCargos);
    } catch { setEmployees([]); }
  };

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterEmployee) params.employeeId = filterEmployee;
      if (filterCargo)    params.cargo      = filterCargo;
      if (filterMonth)    params.month      = filterMonth;
      if (filterYear)     params.year       = filterYear;
      const { data } = await api.get(`/cities/${cityId}/reports`, { params });
      setReportData(data?.data ?? null);
    } catch { setReportData(null); }
    finally { setIsLoading(false); }
  };

  const clearFilters = () => {
    setFilterEmployee(''); setFilterCargo('');
    setFilterMonth(''); setFilterYear(String(new Date().getFullYear()));
  };
  const hasFilters = filterEmployee || filterCargo || filterMonth || filterYear !== String(new Date().getFullYear());

  const summary = reportData?.summary;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 Relatório Geral</h1>
          <p className="text-gray-400 text-sm mt-1">Performance de feedbacks e tasks da equipe</p>
        </div>
        <button onClick={loadReport} className="btn-secondary flex items-center gap-2">
          🔄 Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="card flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-400 mb-1">Funcionário</label>
          <select value={filterEmployee} onChange={e => { setFilterEmployee(e.target.value); setFilterCargo(''); }} className="input-field text-sm">
            <option value="">Todos os funcionários</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-400 mb-1">Cargo</label>
          <select value={filterCargo} onChange={e => { setFilterCargo(e.target.value); setFilterEmployee(''); }} className="input-field text-sm">
            <option value="">Todos os cargos</option>
            {cargos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[110px]">
          <label className="block text-xs text-gray-400 mb-1">Mês</label>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="input-field text-sm">
            <option value="">Todos</option>
            {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
              <option key={i+1} value={String(i+1)}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[90px]">
          <label className="block text-xs text-gray-400 mb-1">Ano</label>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="input-field text-sm">
            <option value="">Todos</option>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="btn-secondary text-sm flex items-center gap-1">✕ Limpar</button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-gray-400">
          <div className="w-7 h-7 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
        </div>
      ) : !reportData ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">📋</div>
          <p>Nenhum dado encontrado para os filtros selecionados</p>
        </div>
      ) : (
        <>
          {/* ── Resumo global ──────────────────────────────────────────────── */}
          {summary && (
            <div className="space-y-4">
              {/* Feedbacks resumo */}
              <div className="card">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  📝 <span>Resumo de Feedbacks</span>
                  <span className="text-sm font-normal text-gray-400">({summary.feedbacks.total} total)</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <StatCard label="Total" value={summary.feedbacks.total} />
                  <StatCard label="Positivos" value={summary.feedbacks.positive} color="green" />
                  <StatCard label="Negativos" value={summary.feedbacks.negative} color="red" />
                  <StatCard label="Taxa Positiva" value={summary.feedbacks.positiveRate !== null ? `${summary.feedbacks.positiveRate}%` : '—'} color="blue" />
                </div>
                {summary.feedbacks.total > 0 && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Taxa de feedbacks positivos</p>
                      <RateBar value={summary.feedbacks.positiveRate} color="green" />
                    </div>
                  </div>
                )}
              </div>

              {/* Tasks resumo */}
              <div className="card">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  ✅ <span>Resumo de Tasks</span>
                  <span className="text-sm font-normal text-gray-400">({summary.tasks.total} total)</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <StatCard label="Total" value={summary.tasks.total} />
                  <StatCard label="Concluídas" value={summary.tasks.completed} color="green" />
                  <StatCard label="Canceladas" value={summary.tasks.cancelled} color="red" />
                  <StatCard label="Em andamento" value={summary.tasks.pending + summary.tasks.inProgress} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <StatCard label="No prazo" value={summary.tasks.onTime} color="green" sub="concluídas" />
                  <StatCard label="Atrasadas" value={summary.tasks.late} color="red" sub="concluídas" />
                  <StatCard label="Vencidas" value={summary.tasks.overdue ?? 0} color="red" sub="abertas" />
                </div>
                {summary.tasks.completed > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Taxa de conclusão no prazo</p>
                    <RateBar value={summary.tasks.onTimeRate} color="blue" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Por funcionário ────────────────────────────────────────────── */}
          {reportData.employees.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">👥 Por Funcionário</h2>
              {reportData.employees.map(stat => {
                const isExpanded = expandedId === stat.employee.id;
                const f = stat.feedbacks;
                const t = stat.tasks;
                const totalActivity = f.total + t.total;
                return (
                  <div key={stat.employee.id} className="card">
                    {/* Header do card */}
                    <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : stat.employee.id)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-500/20 border border-primary-400/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">{stat.employee.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{stat.employee.name}</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <span className="text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full">{stat.employee.cargo}</span>
                            {stat.employee.funcao && <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{stat.employee.funcao}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* mini resumo */}
                        <div className="hidden sm:flex gap-3 text-center">
                          <div>
                            <p className="text-xs text-gray-500">Feedbacks</p>
                            <div className="flex gap-1 items-center">
                              <span className="text-xs text-green-400 font-semibold">{f.positive}👍</span>
                              <span className="text-xs text-red-400 font-semibold">{f.negative}👎</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Tasks</p>
                            <p className="text-xs text-white font-semibold">{t.completed}/{t.total}</p>
                          </div>
                          {t.onTimeRate !== null && (
                            <div>
                              <p className="text-xs text-gray-500">No prazo</p>
                              <p className={`text-xs font-semibold ${t.onTimeRate >= 80 ? 'text-green-400' : t.onTimeRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{t.onTimeRate}%</p>
                            </div>
                          )}
                        </div>
                        <button className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center text-xs flex-shrink-0">
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* Detalhe expandido */}
                    {isExpanded && totalActivity === 0 ? (
                      <div className="mt-4 pt-4 border-t border-gray-700 text-center text-gray-500 text-sm">
                        Sem atividade no período selecionado
                      </div>
                    ) : isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                        {/* Feedbacks detalhe */}
                        <div>
                          <p className="text-sm font-semibold text-gray-300 mb-2">📝 Feedbacks</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <StatCard label="Total" value={f.total} />
                            <StatCard label="Positivos" value={f.positive} color="green" />
                            <StatCard label="Negativos" value={f.negative} color="red" />
                            <StatCard label="Taxa positiva" value={f.positiveRate !== null ? `${f.positiveRate}%` : '—'} color="blue" />
                          </div>
                          {f.total > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-400 mb-1">Taxa de feedbacks positivos</p>
                              <RateBar value={f.positiveRate} color="green" />
                            </div>
                          )}
                        </div>
                        {/* Tasks detalhe */}
                        <div>
                          <p className="text-sm font-semibold text-gray-300 mb-2">✅ Tasks</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <StatCard label="Total" value={t.total} />
                            <StatCard label="Concluídas" value={t.completed} color="green" />
                            <StatCard label="Canceladas" value={t.cancelled} color="red" />
                            <StatCard label="Pendentes" value={t.pending + t.inProgress} />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                            <StatCard label="No prazo" value={t.onTime} color="green" sub="concluídas" />
                            <StatCard label="Atrasadas" value={t.late} color="red" sub="concluídas" />
                            <StatCard label="Vencidas" value={t.overdue} color="red" sub="abertas" />
                          </div>
                          {t.completed > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-400 mb-1">Taxa de conclusão no prazo</p>
                              <RateBar value={t.onTimeRate} color="blue" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
