import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Employee, City } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface EmpForm { name: string; discordId: string; cargo: string; funcao: string; }

// ─── Modal de confirmação personalizado ──────────────────────────────────────
interface ConfirmModalProps {
  employee: Employee;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeactivateConfirmModal({ employee, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Ícone de aviso */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
          </div>

          {/* Texto */}
          <h2 className="text-xl font-bold text-white text-center mb-2">
            Desativar Funcionário
          </h2>
          <p className="text-gray-400 text-sm text-center mb-1">
            Tem certeza que deseja desativar
          </p>
          <p className="text-white font-semibold text-center mb-1">
            {employee.name}
          </p>
          <p className="text-gray-500 text-xs text-center mb-5">
            {employee.cargo} · {employee.funcao}
          </p>

          {/* Aviso */}
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-5">
            <p className="text-orange-300 text-xs text-center">
              🔒 O funcionário perderá acesso ao sistema. Tasks e feedbacks vinculados serão mantidos.
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 font-medium text-sm transition-all duration-200"
            >
              🗑️ Confirmar Desativação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Seletor de cidades extras ────────────────────────────────────────────────
interface ExtraCitySelectorProps {
  currentCityId: string;
  availableCities: City[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

function ExtraCitySelector({ currentCityId, availableCities, selected, onChange }: ExtraCitySelectorProps) {
  const otherCities = availableCities.filter(c => c.id !== currentCityId);
  const usedIds = new Set([currentCityId, ...selected.filter(Boolean)]);

  const addSlot = () => onChange([...selected, '']);

  const updateSlot = (idx: number, val: string) => {
    const updated = [...selected];
    updated[idx] = val;
    onChange(updated);
  };

  const removeSlot = (idx: number) => {
    onChange(selected.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2 mt-2">
      {selected.map((val, idx) => {
        const options = otherCities.filter(c => !usedIds.has(c.id) || c.id === val);
        return (
          <div key={idx} className="flex gap-2 items-center">
            <select
              value={val}
              onChange={e => updateSlot(idx, e.target.value)}
              className="input-field flex-1 text-sm"
            >
              <option value="">Selecione a cidade...</option>
              {options.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeSlot(idx)}
              className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
              title="Remover"
            >✕</button>
          </div>
        );
      })}

      {selected.length < otherCities.length && (
        <button
          type="button"
          onClick={addSlot}
          className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
        >
          ➕ Adicionar outra cidade
        </button>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TeamPage() {
  const { cityId } = useParams();
  const { user } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmpForm>({ name: '', discordId: '', cargo: '', funcao: '' });
  const [search, setSearch] = useState('');

  // Modal de confirmação de desativação
  const [deactivateTarget, setDeactivateTarget] = useState<Employee | null>(null);

  // Multi-cidade no cadastro
  const [registerInOtherCities, setRegisterInOtherCities] = useState(false);
  const [extraCityIds, setExtraCityIds] = useState<string[]>(['']);

  // Lista de cidades disponíveis carregada da API (não depende de user.cities)
  const [availableCities, setAvailableCities] = useState<City[]>([]);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  // IDs de cidades que o usuário tem acesso (do JWT)
  const userCityIds: string[] = Array.isArray(user?.cities)
    ? (user!.cities as City[]).map(c => c.id).filter(Boolean)
    : [];

  useEffect(() => { if (cityId) { loadEmployees(); loadAvailableCities(); } }, [cityId]);

  const loadAvailableCities = async () => {
    try {
      const { data } = await api.get('/cities');
      const allCities: City[] = Array.isArray(data?.data) ? data.data : [];
      // Super Admin vê todas; outros veem apenas as cidades às quais têm acesso
      const filtered = isSuperAdmin
        ? allCities
        : allCities.filter(c => userCityIds.includes(c.id));
      setAvailableCities(filtered);
    } catch {
      setAvailableCities([]);
    }
  };

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/cities/${cityId}/employees`, { params: { limit: 200 } });
      setEmployees(Array.isArray(data?.data?.employees) ? data.data.employees : []);
    } catch {
      toast.error('Erro ao carregar equipe');
      setEmployees([]);
    } finally { setIsLoading(false); }
  };

  const openCreate = () => {
    setEditEmployee(null);
    setForm({ name: '', discordId: '', cargo: '', funcao: '' });
    setRegisterInOtherCities(false);
    setExtraCityIds(['']);
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditEmployee(emp);
    setForm({ name: emp.name, discordId: emp.discordId, cargo: emp.cargo, funcao: emp.funcao });
    setRegisterInOtherCities(false);
    setExtraCityIds(['']);
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
        // Edição: apenas cidade atual
        await api.put(`/cities/${cityId}/employees/${editEmployee.id}`, form);
        toast.success('Funcionário atualizado!');
      } else {
        // Criação: cidade atual + cidades extras
        await api.post(`/cities/${cityId}/employees`, form);

        const validExtras = registerInOtherCities
          ? [...new Set(extraCityIds.filter(id => id && id !== cityId))]
          : [];

        const errors: string[] = [];
        for (const extraId of validExtras) {
          try {
            await api.post(`/cities/${extraId}/employees`, form);
          } catch {
            const city = availableCities.find(c => c.id === extraId);
            errors.push(city?.name || extraId);
          }
        }

        if (validExtras.length > 0 && errors.length === 0) {
          toast.success(`Funcionário cadastrado em ${1 + validExtras.length} cidades!`);
        } else if (errors.length > 0) {
          toast.success('Funcionário cadastrado na cidade atual');
          toast.error(`Falha em: ${errors.join(', ')} (Discord ID pode já existir)`);
        } else {
          toast.success('Funcionário cadastrado!');
        }
      }
      setShowModal(false);
      loadEmployees();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Erro ao salvar funcionário');
    } finally { setIsSubmitting(false); }
  };

  // Solicita confirmação abrindo modal personalizado
  const requestDeactivate = (emp: Employee) => {
    setDeactivateTarget(emp);
  };

  // Executa a desativação após confirmação
  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const emp = deactivateTarget;
    setDeactivateTarget(null);
    try {
      await api.delete(`/cities/${cityId}/employees/${emp.id}`);
      toast.success(`${emp.name} desativado com sucesso`);
      loadEmployees();
    } catch { toast.error('Erro ao desativar funcionário'); }
  };

  const filtered = employees.filter(e =>
    search === '' ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.discordId.toLowerCase().includes(search.toLowerCase()) ||
    e.cargo.toLowerCase().includes(search.toLowerCase()) ||
    e.funcao.toLowerCase().includes(search.toLowerCase())
  );

  const otherAvailableCities = availableCities.filter(c => c.id !== cityId);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">👥 Cadastro de Equipe</h1>
          <p className="text-gray-400 text-sm mt-1">{employees.length} funcionário{employees.length !== 1 ? 's' : ''} nesta cidade</p>
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
        placeholder="🔍 Buscar por nome, Discord ID, cargo ou função..."
        className="input-field"
      />

      {/* Lista */}
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
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full">{emp.cargo}</span>
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{emp.funcao}</span>
                  </div>
                </div>
              </div>
              {emp._count && (
                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                  <span>📋 {emp._count.tasks} tasks</span>
                  <span>📝 {emp._count.events} feedbacks</span>
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
                  onClick={() => requestDeactivate(emp)}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  🗑️ Desativar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Cadastro / Edição ───────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="input-field"
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Discord ID *</label>
                  <input
                    value={form.discordId}
                    onChange={e => setForm(f => ({ ...f, discordId: e.target.value }))}
                    className="input-field"
                    placeholder="exemplo#1234"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Cargo *</label>
                  <input
                    value={form.cargo}
                    onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                    className="input-field"
                    placeholder="Ex: Gerente, Supervisor..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Função *</label>
                  <input
                    value={form.funcao}
                    onChange={e => setForm(f => ({ ...f, funcao: e.target.value }))}
                    className="input-field"
                    placeholder="Ex: Atendimento, Operacional..."
                    required
                  />
                </div>

                {/* ── Multi-cidade (somente na criação, quando há outras cidades) ── */}
                {!editEmployee && otherAvailableCities.length > 0 && (
                  <div className="border border-gray-700 rounded-xl p-4 space-y-3 bg-gray-800/50">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={registerInOtherCities}
                        onChange={e => {
                          setRegisterInOtherCities(e.target.checked);
                          if (!e.target.checked) setExtraCityIds(['']);
                        }}
                        className="w-4 h-4 mt-0.5 rounded accent-primary-500 flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm text-white font-medium">Cadastrar em outra cidade também</p>
                        <p className="text-xs text-gray-400">
                          O funcionário será cadastrado com os mesmos dados em cada cidade selecionada
                        </p>
                      </div>
                    </label>

                    {registerInOtherCities && (
                      <div className="pl-7">
                        <p className="text-xs text-gray-400 mb-2">Selecione a(s) cidade(s):</p>
                        <ExtraCitySelector
                          currentCityId={cityId!}
                          availableCities={availableCities}
                          selected={extraCityIds}
                          onChange={setExtraCityIds}
                        />

                        {/* Preview das cidades selecionadas */}
                        {extraCityIds.filter(Boolean).length > 0 && (
                          <div className="mt-3 p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                            <p className="text-xs text-primary-300 mb-1.5 font-medium">
                              📋 Será cadastrado em {1 + extraCityIds.filter(Boolean).length} cidades:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {/* cidade atual */}
                              {(() => {
                                const current = availableCities.find(c => c.id === cityId);
                                return current ? (
                                  <span className="text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full">
                                    🏙️ {current.name} <span className="opacity-60">(atual)</span>
                                  </span>
                                ) : null;
                              })()}
                              {/* cidades extras */}
                              {extraCityIds.filter(Boolean).map(id => {
                                const c = availableCities.find(cc => cc.id === id);
                                return c ? (
                                  <span key={id} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                                    🏙️ {c.name}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                    {isSubmitting
                      ? 'Salvando...'
                      : editEmployee
                        ? 'Salvar Alterações'
                        : registerInOtherCities && extraCityIds.filter(Boolean).length > 0
                          ? `Cadastrar em ${1 + extraCityIds.filter(Boolean).length} cidades`
                          : 'Cadastrar'
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de confirmação de desativação ──────────────────────────────── */}
      {deactivateTarget && (
        <DeactivateConfirmModal
          employee={deactivateTarget}
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivateTarget(null)}
        />
      )}
    </div>
  );
}
