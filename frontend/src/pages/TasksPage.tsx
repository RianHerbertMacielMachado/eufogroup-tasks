import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Task, Employee, Pagination, City } from '../types';
import api from '../services/api';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente', IN_PROGRESS: 'Em Andamento', COMPLETED: 'Concluída', CANCELLED: 'Cancelada'
};
const STATUS_CLASS: Record<string, string> = {
  PENDING: 'badge-pending', IN_PROGRESS: 'badge-progress', COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled'
};
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente'
};

interface TaskForm {
  title: string;
  description: string;
  employeeId: string;
  dueDate: string;
  priority: string;
}
interface CancelForm { taskId: string; reason: string; }

// ─── Entrada de cidade+funcionário para multi-cidade ─────────────────────────
interface ExtraEntry { cityId: string; employeeId: string; }

interface ExtraCityRowProps {
  entry: ExtraEntry;
  index: number;
  currentCityId: string;
  availableCities: City[];
  usedCityIds: Set<string>;
  onUpdate: (idx: number, entry: ExtraEntry) => void;
  onRemove: (idx: number) => void;
}

function ExtraCityRow({
  entry, index, currentCityId, availableCities, usedCityIds, onUpdate, onRemove
}: ExtraCityRowProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmps, setLoadingEmps] = useState(false);

  // Lista de cidades disponíveis para este slot (excluindo a atual e as já usadas, exceto a própria)
  const options = availableCities.filter(
    c => c.id !== currentCityId && (!usedCityIds.has(c.id) || c.id === entry.cityId)
  );

  // Carrega employees ao mudar a cidade selecionada
  useEffect(() => {
    if (!entry.cityId) { setEmployees([]); return; }
    setLoadingEmps(true);
    api.get(`/cities/${entry.cityId}/employees`, { params: { limit: 200 } })
      .then(({ data }) => {
        setEmployees(Array.isArray(data?.data?.employees) ? data.data.employees : []);
      })
      .catch(() => setEmployees([]))
      .finally(() => setLoadingEmps(false));
  }, [entry.cityId]);

  return (
    <div className="border border-gray-700 rounded-xl p-3 space-y-2 bg-gray-900/50">
      <div className="flex gap-2 items-center">
        {/* Seletor de cidade */}
        <select
          value={entry.cityId}
          onChange={e => onUpdate(index, { cityId: e.target.value, employeeId: '' })}
          className="input-field flex-1 text-sm"
        >
          <option value="">Selecione a cidade...</option>
          {options.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
          title="Remover"
        >✕</button>
      </div>

      {/* Seletor de funcionário (aparece quando cidade é selecionada) */}
      {entry.cityId && (
        <div className="pl-1">
          {loadingEmps ? (
            <div className="flex items-center gap-2 text-gray-500 text-xs py-1">
              <div className="w-3 h-3 border border-gray-500 border-t-primary-400 rounded-full animate-spin" />
              Carregando funcionários...
            </div>
          ) : employees.length === 0 ? (
            <p className="text-orange-400 text-xs py-1">
              ⚠️ Nenhum funcionário cadastrado nesta cidade
            </p>
          ) : (
            <select
              value={entry.employeeId}
              onChange={e => onUpdate(index, { ...entry, employeeId: e.target.value })}
              className="input-field text-sm"
              required
            >
              <option value="">Selecione o funcionário nesta cidade...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.cargo}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Gerenciador de entradas extras ──────────────────────────────────────────
interface ExtraEntriesManagerProps {
  currentCityId: string;
  availableCities: City[];
  entries: ExtraEntry[];
  onChange: (entries: ExtraEntry[]) => void;
}

function ExtraEntriesManager({ currentCityId, availableCities, entries, onChange }: ExtraEntriesManagerProps) {
  const otherCities = availableCities.filter(c => c.id !== currentCityId);
  const usedCityIds = new Set([currentCityId, ...entries.map(e => e.cityId).filter(Boolean)]);

  const add = () => onChange([...entries, { cityId: '', employeeId: '' }]);
  const update = (idx: number, entry: ExtraEntry) => {
    const updated = [...entries];
    updated[idx] = entry;
    onChange(updated);
  };
  const remove = (idx: number) => onChange(entries.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2 mt-2">
      {entries.map((entry, idx) => (
        <ExtraCityRow
          key={idx}
          entry={entry}
          index={idx}
          currentCityId={currentCityId}
          availableCities={availableCities}
          usedCityIds={usedCityIds}
          onUpdate={update}
          onRemove={remove}
        />
      ))}
      {entries.length < otherCities.length && (
        <button
          type="button"
          onClick={add}
          className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
        >
          ➕ Adicionar outra cidade
        </button>
      )}
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { cityId } = useParams();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || '';
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [cancelForm, setCancelForm] = useState<CancelForm>({ taskId: '', reason: '' });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<TaskForm>({
    title: '', description: '', employeeId: '', dueDate: '', priority: 'MEDIUM'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── multi-cidade ────────────────────────────────────────────────────────────
  const [createInOtherCities, setCreateInOtherCities] = useState(false);
  // Cada entrada tem cityId + employeeId próprio daquela cidade
  const [extraEntries, setExtraEntries] = useState<ExtraEntry[]>([]);

  // Cidades disponíveis carregadas da API (confiável para SUPER_ADMIN e usuários comuns)
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin      = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const userCityIds: string[] = Array.isArray(user?.cities)
    ? (user!.cities as City[]).map(c => c.id).filter(Boolean)
    : [];

  useEffect(() => {
    if (cityId) { loadTasks(); loadEmployees(); loadAvailableCities(); }
  }, [cityId, statusFilter, page]);

  const loadAvailableCities = async () => {
    try {
      const { data } = await api.get('/cities');
      const allCities: City[] = Array.isArray(data?.data) ? data.data : [];
      const filtered = isSuperAdmin
        ? allCities
        : allCities.filter(c => userCityIds.includes(c.id));
      setAvailableCities(filtered);
    } catch {
      setAvailableCities([]);
    }
  };

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get(`/cities/${cityId}/tasks`, { params });
      setTasks(Array.isArray(data?.data?.tasks) ? data.data.tasks : []);
      setPagination(data?.data?.pagination ?? null);
    } catch {
      toast.error('Erro ao carregar tasks');
      setTasks([]);
    } finally { setIsLoading(false); }
  };

  const loadEmployees = async () => {
    try {
      const { data } = await api.get(`/cities/${cityId}/employees`, { params: { limit: '200' } });
      setEmployees(Array.isArray(data?.data?.employees) ? data.data.employees : []);
    } catch {
      setEmployees([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.employeeId || !form.dueDate) {
      toast.error('Preencha todos os campos obrigatórios'); return;
    }

    // Validar entradas extras — cada uma precisa de cidade E funcionário
    const validExtras = createInOtherCities
      ? extraEntries.filter(en => en.cityId && en.cityId !== cityId)
      : [];

    const missingEmployee = validExtras.find(en => !en.employeeId);
    if (missingEmployee) {
      const city = availableCities.find(c => c.id === missingEmployee.cityId);
      toast.error(`Selecione um funcionário para a cidade: ${city?.name || missingEmployee.cityId}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Criar na cidade atual
      await api.post(`/cities/${cityId}/tasks`, form);

      // 2. Criar em cada cidade extra com o funcionário específico daquela cidade
      const extraErrors: string[] = [];
      for (const entry of validExtras) {
        try {
          await api.post(`/cities/${entry.cityId}/tasks`, {
            title: form.title,
            description: form.description,
            dueDate: form.dueDate,
            priority: form.priority,
            employeeId: entry.employeeId, // ← funcionário da cidade extra
          });
        } catch {
          const city = availableCities.find(c => c.id === entry.cityId);
          extraErrors.push(city?.name || entry.cityId);
        }
      }

      if (validExtras.length > 0 && extraErrors.length === 0) {
        toast.success(`Task criada em ${1 + validExtras.length} cidades!`);
      } else if (extraErrors.length > 0) {
        toast.success('Task criada na cidade atual');
        toast.error(`Falha ao criar em: ${extraErrors.join(', ')}`);
      } else {
        toast.success('Task criada com sucesso!');
      }

      setShowModal(false);
      resetCreateModal();
      loadTasks();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Erro ao criar task');
    } finally { setIsSubmitting(false); }
  };

  const resetCreateModal = () => {
    setForm({ title: '', description: '', employeeId: '', dueDate: '', priority: 'MEDIUM' });
    setCreateInOtherCities(false);
    setExtraEntries([]);
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    if (status === 'CANCELLED') {
      setCancelForm({ taskId, reason: '' });
      setShowCancelModal(true);
      return;
    }
    try {
      await api.put(`/cities/${cityId}/tasks/${taskId}`, { status });
      toast.success('Status atualizado!');
      loadTasks();
    } catch { toast.error('Erro ao atualizar status'); }
  };

  const handleCancel = async () => {
    if (!cancelForm.reason.trim()) { toast.error('Informe o motivo do cancelamento'); return; }
    try {
      await api.put(`/cities/${cityId}/tasks/${cancelForm.taskId}`, {
        status: 'CANCELLED', cancelReason: cancelForm.reason
      });
      toast.success('Task cancelada');
      setShowCancelModal(false);
      loadTasks();
    } catch { toast.error('Erro ao cancelar task'); }
  };

  const pageTitle = statusFilter === 'COMPLETED' ? '✅ Tasks Concluídas'
    : statusFilter === 'CANCELLED' ? '❌ Tasks Canceladas'
    : '📋 Registro de Tasks';

  // Cidades disponíveis exceto a atual (para o seletor multi-cidade)
  const otherAvailableCities = availableCities.filter(c => c.id !== cityId);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {pagination?.total || 0} tasks encontradas
          </p>
        </div>
        {!statusFilter && isAdmin && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <span>➕</span> Nova Task
          </button>
        )}
      </div>

      {/* Tasks grid */}
      {isLoading ? (
        <div className="flex justify-center py-20 text-gray-400 gap-3">
          <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
          Carregando...
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">📭</div>
          <p>Nenhuma task encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map(task => {
            const overdue = isPast(new Date(task.dueDate)) && !['COMPLETED', 'CANCELLED'].includes(task.status);
            return (
              <div
                key={task.id}
                className={clsx('card hover:border-primary-500/30 transition-all duration-200 cursor-pointer flex flex-col gap-3',
                  overdue && 'border-orange-500/30')}
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-white font-semibold text-sm leading-snug flex-1">{task.title}</h3>
                  <span className={STATUS_CLASS[task.status] || 'badge-pending'}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>
                <p className="text-gray-400 text-xs line-clamp-2">{task.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>👤</span>
                  <span className="truncate">
                    {task.employee?.name || task.employeeSnapshot || '—'}
                    {!task.employee && (task.employeeSnapshot) && (
                      <span className="ml-1 text-gray-600 italic">(excluído)</span>
                    )}
                  </span>
                  <span className="text-gray-600">•</span>
                  <span>{task.employee?.cargo || task.cargoSnapshot || ''}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={clsx('font-medium', {
                    'priority-low': task.priority === 'LOW',
                    'priority-medium': task.priority === 'MEDIUM',
                    'priority-high': task.priority === 'HIGH',
                    'priority-urgent': task.priority === 'URGENT',
                  })}>
                    🎯 {PRIORITY_LABELS[task.priority]}
                  </span>
                  <span className={clsx('text-gray-400', overdue && 'text-orange-400')}>
                    {overdue && '⚠️ '}
                    {format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
                {/* Status actions */}
                {!statusFilter && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                  <div className="flex gap-2 pt-2 border-t border-gray-700" onClick={e => e.stopPropagation()}>
                    {task.status === 'PENDING' && (
                      <button
                        className="flex-1 text-xs py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                      >
                        ▶ Iniciar
                      </button>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                      <button
                        className="flex-1 text-xs py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                        onClick={() => handleStatusChange(task.id, 'COMPLETED')}
                      >
                        ✓ Concluir
                      </button>
                    )}
                    <button
                      className="flex-1 text-xs py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      onClick={() => handleStatusChange(task.id, 'CANCELLED')}
                    >
                      ✕ Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm disabled:opacity-30">← Anterior</button>
          <span className="text-gray-400 text-sm">{page} / {pagination.pages}</span>
          <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm disabled:opacity-30">Próxima →</button>
        </div>
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-white pr-4">{selectedTask.title}</h2>
                <button onClick={() => setSelectedTask(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <span className={STATUS_CLASS[selectedTask.status]}>{STATUS_LABELS[selectedTask.status]}</span>
                  <span className="text-gray-400">{PRIORITY_LABELS[selectedTask.priority]}</span>
                </div>
                <p className="text-gray-300">{selectedTask.description}</p>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                  <div>
                    <p className="text-gray-500 mb-1">Funcionário</p>
                    <p className="text-white">
                      {selectedTask.employee?.name || selectedTask.employeeSnapshot || '—'}
                      {!selectedTask.employee && selectedTask.employeeSnapshot && (
                        <span className="ml-1 text-xs text-gray-500 italic">(excluído)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Cargo</p>
                    <p className="text-white">{selectedTask.employee?.cargo || selectedTask.cargoSnapshot || '—'}</p>
                  </div>
                  <div><p className="text-gray-500 mb-1">Prazo</p><p className="text-white">{format(new Date(selectedTask.dueDate), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p></div>
                  <div><p className="text-gray-500 mb-1">Criada em</p><p className="text-white">{format(new Date(selectedTask.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p></div>
                  {selectedTask.cancelReason && (
                    <div className="col-span-2"><p className="text-gray-500 mb-1">Motivo Cancelamento</p><p className="text-red-400">{selectedTask.cancelReason}</p></div>
                  )}
                  {selectedTask.cancelledBy && (
                    <div><p className="text-gray-500 mb-1">Cancelado por</p><p className="text-red-400">{selectedTask.cancelledBy}</p></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create modal ─────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetCreateModal(); }}>
          <div className="modal-content max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white">➕ Nova Task</h2>
                <button onClick={() => { setShowModal(false); resetCreateModal(); }} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Funcionário *</label>
                  <select
                    value={form.employeeId}
                    onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                    className="input-field"
                    required
                  >
                    <option value="">Selecione...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} — {emp.cargo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Título *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Descrição *</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="input-field"
                    rows={3}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Prazo *</label>
                    <input
                      type="datetime-local"
                      value={form.dueDate}
                      onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Prioridade</label>
                    <select
                      value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                      className="input-field"
                    >
                      <option value="LOW">Baixa</option>
                      <option value="MEDIUM">Média</option>
                      <option value="HIGH">Alta</option>
                      <option value="URGENT">Urgente</option>
                    </select>
                  </div>
                </div>

                {/* ── Multi-cidade ──────────────────────────────────────── */}
                {otherAvailableCities.length > 0 && (
                  <div className="border border-gray-700 rounded-xl p-4 space-y-3 bg-gray-800/50">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={createInOtherCities}
                        onChange={e => {
                          setCreateInOtherCities(e.target.checked);
                          if (!e.target.checked) setExtraEntries([]);
                        }}
                        className="w-4 h-4 rounded accent-primary-500"
                      />
                      <div>
                        <p className="text-sm text-white font-medium">Criar esta task em outra cidade também</p>
                        <p className="text-xs text-gray-400">
                          Selecione a cidade e o funcionário responsável em cada cidade extra
                        </p>
                      </div>
                    </label>

                    {createInOtherCities && (
                      <div>
                        <ExtraEntriesManager
                          currentCityId={cityId!}
                          availableCities={availableCities}
                          entries={extraEntries}
                          onChange={setExtraEntries}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetCreateModal(); }}
                    className="btn-secondary flex-1"
                  >Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                    {isSubmitting ? 'Criando...' : (
                      createInOtherCities && extraEntries.filter(e => e.cityId).length > 0
                        ? `Criar em ${1 + extraEntries.filter(e => e.cityId).length} cidade${1 + extraEntries.filter(e => e.cityId).length > 1 ? 's' : ''}`
                        : 'Criar Task'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">❌ Cancelar Task</h2>
              <p className="text-gray-400 text-sm mb-4">Informe o motivo do cancelamento:</p>
              <textarea
                value={cancelForm.reason}
                onChange={e => setCancelForm(f => ({ ...f, reason: e.target.value }))}
                className="input-field"
                rows={3}
                placeholder="Motivo do cancelamento..."
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowCancelModal(false)} className="btn-secondary flex-1">Voltar</button>
                <button onClick={handleCancel} className="btn-danger flex-1">Confirmar Cancelamento</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
