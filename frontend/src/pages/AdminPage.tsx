import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { City, User } from '../types';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

type AdminTab = 'cities' | 'users';

interface CityForm { name: string; carouselInterval: number; }
interface UserForm { name: string; discordId: string; email: string; role: string; cityIds: string[]; password: string; }

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('cities');
  const [cities, setCities] = useState<City[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editCity, setEditCity] = useState<City | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cityForm, setCityForm] = useState<CityForm>({ name: '', carouselInterval: 5 });
  const [userForm, setUserForm] = useState<UserForm>({ name: '', discordId: '', email: '', role: 'OPERATOR', cityIds: [], password: '' });
  const [bgUploadCityId, setBgUploadCityId] = useState<string | null>(null);

  useEffect(() => {
    loadCities();
    if (user?.role === 'SUPER_ADMIN') loadUsers();
  }, []);

  const loadCities = async () => {
    try {
      const { data } = await api.get('/cities');
      setCities(Array.isArray(data?.data) ? data.data : []);
    } catch { toast.error('Erro ao carregar cidades'); }
    finally { setIsLoading(false); }
  };

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(Array.isArray(data?.data) ? data.data : []);
    } catch {}
  };

  const handleSaveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editCity) {
        await api.put(`/cities/${editCity.id}`, cityForm);
        toast.success('Cidade atualizada!');
      } else {
        await api.post('/cities', cityForm);
        toast.success('Cidade criada!');
      }
      setShowCityModal(false);
      loadCities();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Erro ao salvar cidade');
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteCity = async (city: City) => {
    if (!confirm(`Excluir "${city.name}"? Todos os dados serão perdidos!`)) return;
    try {
      await api.delete(`/cities/${city.id}`);
      toast.success('Cidade excluída');
      loadCities();
    } catch { toast.error('Erro ao excluir cidade'); }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editUser) {
        const { password, ...rest } = userForm;
        await api.put(`/admin/users/${editUser.id}`, password ? userForm : rest);
        toast.success('Usuário atualizado!');
      } else {
        if (!userForm.password) { toast.error('Senha é obrigatória'); setIsSubmitting(false); return; }
        await api.post('/admin/users', userForm);
        toast.success('Usuário criado!');
      }
      setShowUserModal(false);
      loadUsers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Erro ao salvar usuário');
    } finally { setIsSubmitting(false); }
  };

  const handleUploadBg = async (cityId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('images', f));
    try {
      await api.post(`/cities/${cityId}/backgrounds`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Background atualizado!');
      loadCities();
    } catch { toast.error('Erro ao fazer upload'); }
    setBgUploadCityId(null);
  };

  const openCityEdit = (c: City) => {
    setEditCity(c);
    setCityForm({ name: c.name, carouselInterval: c.carouselInterval });
    setShowCityModal(true);
  };

  const openUserEdit = (u: User) => {
    setEditUser(u);
    setUserForm({ name: u.name, discordId: u.discordId, email: u.email || '', role: u.role, cityIds: Array.isArray(u.cities) ? u.cities.map(c => c.id) : [], password: '' });
    setShowUserModal(true);
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <div>
            <h1 className="text-white font-bold text-lg">Painel Administrativo</h1>
            <p className="text-gray-400 text-xs">Gerenciamento global</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-secondary text-sm">🏙️ Cidades</button>
          <button onClick={() => { logout(); navigate('/login'); }} className="btn-danger text-sm">Sair</button>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('cities')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'cities' ? 'bg-primary-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            🏙️ Gerenciar Cidades
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setTab('users')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'users' ? 'bg-primary-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              👤 Gerenciar Usuários
            </button>
          )}
        </div>

        {/* Cities tab */}
        {tab === 'cities' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Cidades ({cities.length})</h2>
              <button onClick={() => { setEditCity(null); setCityForm({ name: '', carouselInterval: 5 }); setShowCityModal(true); }} className="btn-primary">
                ➕ Nova Cidade
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {cities.map(city => (
                <div key={city.id} className="card space-y-3">
                  <div className="h-32 rounded-xl overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 relative">
                    {city.backgroundImages?.[0] ? (
                      <img src={city.backgroundImages[0].imageUrl} alt={city.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🏙️</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                      <h3 className="text-white font-bold">{city.name}</h3>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs text-gray-400">
                    <span>👥 {city._count?.employees || 0} func.</span>
                    <span>📋 {city._count?.tasks || 0} tasks</span>
                    <span className={city.isActive ? 'text-green-400' : 'text-red-400'}>
                      {city.isActive ? '● Ativo' : '● Inativo'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setBgUploadCityId(city.id); }}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                    >
                      🖼️ Background
                    </button>
                    <button onClick={() => openCityEdit(city)} className="flex-1 text-xs py-1.5 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors">
                      ✏️ Editar
                    </button>
                    {isSuperAdmin && (
                      <button onClick={() => handleDeleteCity(city)} className="flex-1 text-xs py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                        🗑️ Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users tab */}
        {tab === 'users' && isSuperAdmin && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Usuários ({users.length})</h2>
              <button onClick={() => { setEditUser(null); setUserForm({ name: '', discordId: '', email: '', role: 'OPERATOR', cityIds: [], password: '' }); setShowUserModal(true); }} className="btn-primary">
                ➕ Novo Usuário
              </button>
            </div>
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="card flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center font-bold text-primary-300">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{u.name}</p>
                      <p className="text-gray-400 text-xs">{u.discordId}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-400' : u.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                          {u.role}
                        </span>
                        {(u.cities ?? []).map(c => (
                          <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400">{c.name}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openUserEdit(u)} className="btn-secondary text-xs py-1.5">✏️ Editar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* City modal */}
      {showCityModal && (
        <div className="modal-overlay" onClick={() => setShowCityModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white">{editCity ? '✏️ Editar Cidade' : '➕ Nova Cidade'}</h2>
                <button onClick={() => setShowCityModal(false)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleSaveCity} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Nome da Cidade *</label>
                  <input value={cityForm.name} onChange={e => setCityForm(f => ({ ...f, name: e.target.value }))} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Intervalo do Carrossel (segundos)</label>
                  <input type="number" min="1" max="30" value={cityForm.carouselInterval} onChange={e => setCityForm(f => ({ ...f, carouselInterval: parseInt(e.target.value) }))} className="input-field" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCityModal(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Salvando...' : 'Salvar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* User modal */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white">{editUser ? '✏️ Editar Usuário' : '➕ Novo Usuário'}</h2>
                <button onClick={() => setShowUserModal(false)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Nome *</label>
                  <input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Discord ID *</label>
                  <input value={userForm.discordId} onChange={e => setUserForm(f => ({ ...f, discordId: e.target.value }))} className="input-field" placeholder="exemplo#1234" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Email</label>
                  <input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Cargo</label>
                  <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} className="input-field">
                    <option value="OPERATOR">Operador</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Cidades com Acesso</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {cities.map(c => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userForm.cityIds.includes(c.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setUserForm(f => ({ ...f, cityIds: [...f.cityIds, c.id] }));
                            } else {
                              setUserForm(f => ({ ...f, cityIds: f.cityIds.filter(id => id !== c.id) }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-gray-300 text-sm">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    {editUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
                  </label>
                  <input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} className="input-field" placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowUserModal(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Salvando...' : 'Salvar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Background upload modal */}
      {bgUploadCityId && (
        <div className="modal-overlay" onClick={() => setBgUploadCityId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">🖼️ Upload de Background</h2>
              <p className="text-gray-400 text-sm mb-4">
                Envie 1 imagem para modo estático ou múltiplas para carrossel.
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => handleUploadBg(bgUploadCityId, e.target.files)}
                className="input-field"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setBgUploadCityId(null)} className="btn-secondary flex-1">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
