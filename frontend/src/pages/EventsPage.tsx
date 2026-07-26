import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Event, Employee } from '../types';
import api from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function EventsPage() {
  const { cityId } = useParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ description: '', employeeId: '', cargo: '' });
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (cityId) { loadEvents(); loadEmployees(); }
  }, [cityId, page]);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/cities/${cityId}/events`, { params: { page, limit: 20 } });
      setEvents(data.data.events);
      setTotalPages(data.data.pagination.pages);
    } catch { toast.error('Erro ao carregar eventos'); }
    finally { setIsLoading(false); }
  };

  const loadEmployees = async () => {
    try {
      const { data } = await api.get(`/cities/${cityId}/employees`, { params: { limit: 200 } });
      setEmployees(data.data.employees);
    } catch {}
  };

  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    setSelectedEmployee(emp || null);
    setForm(f => ({ ...f, employeeId: empId, cargo: emp?.cargo || '' }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.employeeId) {
      toast.error('Preencha todos os campos'); return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`/cities/${cityId}/events`, form);
      toast.success('Evento registrado com sucesso!');
      setShowModal(false);
      setForm({ description: '', employeeId: '', cargo: '' });
      setSelectedEmployee(null);
      loadEvents();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Erro ao criar evento');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📝 Registro de Eventos</h1>
          <p className="text-gray-400 text-sm mt-1">Data/hora gerada pelo servidor, imutável</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <span>➕</span> Novo Evento
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-gray-400 gap-3">
          <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">📭</div>
          <p>Nenhum evento registrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => (
            <div key={event.id} className="card flex gap-4 hover:border-primary-500/30 transition-all animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="w-10 h-10 rounded-full bg-primary-500/20 border border-primary-400/30 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📝</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-semibold text-sm">{event.employee?.name}</p>
                    <p className="text-primary-400 text-xs">{event.cargo}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gray-400 text-xs">
                      {format(new Date(event.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {format(new Date(event.createdAt), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm mt-2">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm disabled:opacity-30">← Anterior</button>
          <span className="text-gray-400 text-sm">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm disabled:opacity-30">Próxima →</button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white">📝 Novo Evento</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4">
                <p className="text-blue-300 text-xs">
                  ⏰ Data e hora serão registradas automaticamente pelo servidor (UTC-3 / Brasília)
                </p>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Funcionário *</label>
                  <select
                    value={form.employeeId}
                    onChange={e => handleEmployeeChange(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Selecione o funcionário...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} — {emp.cargo}</option>
                    ))}
                  </select>
                </div>
                {selectedEmployee && (
                  <div className="bg-gray-700/50 rounded-xl p-3 text-sm">
                    <p className="text-gray-300">Cargo: <span className="text-white">{selectedEmployee.cargo}</span></p>
                    <p className="text-gray-300">Função: <span className="text-white">{selectedEmployee.funcao}</span></p>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Descrição do Evento *</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="input-field"
                    rows={4}
                    placeholder="Descreva o evento..."
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                    {isSubmitting ? 'Registrando...' : 'Registrar Evento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
