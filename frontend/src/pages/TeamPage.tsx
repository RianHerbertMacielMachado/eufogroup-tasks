import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Employee } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';

interface EmpForm { name: string; discordId: string; cargo: string; funcao: string; }

export default function TeamPage() {
  const { cityId } = useParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmpForm>({ name: '', discordId: '', cargo: '', funcao: '' });
  const [search, setSearch] = useState('');

  useEffect(() => { if (cityId) loadEmployees(); }, [cityId]);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/cities/${cityId}/employees`, { params: { limit: 200 } });
      setEmployees(data.data.employees);
    } catch { toast.error('Erro ao carregar equipe'); }
    finally { setIsLoading(false); }
  };

  const openCreate = () => {
    setEditEmployee(null);
    setForm({ name: '', discordId: '', cargo: '', funcao: '' });
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditEmployee(emp);
    setForm({ name: emp.name, discordId: emp.discordId, cargo: emp.cargo, funcao: emp.funcao });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.discordId || !form.cargo || !form.funcao) {
      toast.error('Preencha todos os campos'); return;
    }
    setIsSubmitting(true);
    try {
      if (editEmployee) {
        await api.put(`/cities/${cityId}/employees/${editEmployee.id}`, form);
        toast.success('Funcionário atualizado!');
      } else {
        await api.post(`/cities/${cityId}/employees`, form);
        toast.success('Funcionário cadastrado!');
      }
      setShowModal(false);
      loadEmployees();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Erro ao salvar funcionário');
    } finally { setIsSubmitting(false); }
  };

  const handleDeactivate = async (emp: Employee) => {
    if (!confirm(`Desativar ${emp.name}?`)) return;
    try {
      await api.delete(`/cities/${cityId}/employees/${emp.id}`);
      toast.success('Funcionário desativado');
      loadEmployees();
    } catch { toast.error('Erro ao desativar funcionário'); }
  };

  const filtered = employees.filter(e =>
    search === '' ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.discordId.toLowerCase().includes(search.toLowerCase()) ||
    e.cargo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">👥 Cadastro de Equipe</h1>
          <p className="text-gray-400 text-sm mt-1">{employees.length} funcionários nesta cidade</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <span>➕</span> Novo Funcionário
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Buscar por nome, Discord ID ou cargo..."
        className="input-field"
      />

      {isLoading ? (
        <div className="flex justify-center py-20 text-gray-400 gap-3">
          <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">👤</div>
          <p>{search ? 'Nenhum resultado para a busca' : 'Nenhum funcionário cadastrado'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((emp, i) => (
            <div
              key={emp.id}
              className="card hover:border-primary-500/30 transition-all animate-fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500/30 to-primary-700/30 border border-primary-400/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-primary-300">
                    {emp.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">{emp.name}</h3>
                  <p className="text-gray-400 text-xs truncate">{emp.discordId}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{emp.cargo}</span>
                    <span className="text-xs bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded-full">{emp.funcao}</span>
                  </div>
                </div>
              </div>
              {emp._count && (
                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                  <span>📋 {emp._count.tasks} tasks</span>
                  <span>📝 {emp._count.events} eventos</span>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => openEdit(emp)}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleDeactivate(emp)}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  🗑️ Desativar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white">
                  {editEmployee ? '✏️ Editar Funcionário' : '➕ Novo Funcionário'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Nome *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Discord ID *</label>
                  <input value={form.discordId} onChange={e => setForm(f => ({ ...f, discordId: e.target.value }))} className="input-field" placeholder="exemplo#1234" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Cargo *</label>
                  <input value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Função *</label>
                  <input value={form.funcao} onChange={e => setForm(f => ({ ...f, funcao: e.target.value }))} className="input-field" required />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                    {isSubmitting ? 'Salvando...' : editEmployee ? 'Salvar Alterações' : 'Cadastrar'}
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
