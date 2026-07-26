import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { City, User } from '../types';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

type AdminTab = 'cities' | 'users' | 'global-bg';

interface CityForm { name: string; carouselInterval: number; }
interface UserForm { name: string; discordId: string; email: string; role: string; cityIds: string[]; password: string; }

interface BgImage { id: string; imageUrl: string; order: number; }

// ---------- sub-componente: modal de background de cidade ----------
function CityBgModal({
  city,
  onClose,
  onSaved,
}: {
  city: City;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [existing, setExisting] = useState<BgImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [interval, setInterval] = useState(city.carouselInterval || 5);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadExisting();
    return () => previews.forEach(URL.revokeObjectURL);
  }, []);

  const loadExisting = async () => {
    try {
      const { data } = await api.get(`/cities/${city.id}/backgrounds`);
      setExisting(Array.isArray(data?.data) ? data.data : []);
    } catch { setExisting([]); }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    setPendingFiles(prev => [...prev, ...arr]);
    const newPreviews = arr.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePending = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setPendingFiles(p => p.filter((_, i) => i !== idx));
    setPreviews(p => p.filter((_, i) => i !== idx));
  };

  const removeExisting = async (bgId: string) => {
    try {
      await api.delete(`/cities/${city.id}/backgrounds/${bgId}`);
      toast.success('Imagem removida');
      loadExisting();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Erro ao remover imagem');
    }
  };

  const handleSave = async () => {
    if (pendingFiles.length === 0 && existing.length === 0) {
      toast.error('Adicione pelo menos uma imagem'); return;
    }

    // Atualiza carouselInterval
    try {
      await api.put(`/cities/${city.id}`, { carouselInterval: interval });
    } catch { /* ignora */ }

    if (pendingFiles.length > 0) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        pendingFiles.forEach(f => formData.append('images', f));
        await api.post(`/cities/${city.id}/backgrounds`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Backgrounds salvos com sucesso!');
        onSaved();
        onClose();
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast.error(msg || 'Erro ao fazer upload');
      }
      finally { setIsUploading(false); }
    } else {
      toast.success('Configurações salvas!');
      onSaved();
      onClose();
    }
  };

  const totalImages = existing.length + pendingFiles.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white">🖼️ Background — {city.name}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
          </div>

          {/* Info de tamanho recomendado */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-5">
            <p className="text-blue-300 text-xs font-medium mb-1">📐 Tamanho recomendado</p>
            <p className="text-blue-200 text-xs">
              <strong>1920 × 1080 px</strong> (Full HD, 16:9) • Formatos: JPG, PNG, WebP, GIF • Máx. 20MB por arquivo
            </p>
            <p className="text-blue-300/70 text-xs mt-1">
              1 imagem/GIF → modo estático &nbsp;|&nbsp; 2+ imagens → carrossel automático
            </p>
          </div>

          {/* Imagens existentes */}
          {existing.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">Imagens atuais</p>
              <div className="flex flex-wrap gap-3">
                {existing.map(bg => (
                  <div key={bg.id} className="relative group">
                    <img
                      src={bg.imageUrl}
                      alt="background"
                      className="w-28 h-20 object-cover rounded-xl border border-gray-700"
                    />
                    <button
                      onClick={() => removeExisting(bg.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity">
                      Remover
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previews de novas imagens */}
          {previews.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">Novas imagens (aguardando salvar)</p>
              <div className="flex flex-wrap gap-3">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={src}
                      alt={`preview-${idx}`}
                      className="w-28 h-20 object-cover rounded-xl border border-primary-500/50"
                    />
                    <button
                      onClick={() => removePending(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-primary-600/60 text-white text-xs text-center py-0.5 rounded-b-xl">
                      Nova
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload de novas imagens */}
          <div
            className="border-2 border-dashed border-gray-600 hover:border-primary-500/60 rounded-xl p-6 text-center cursor-pointer transition-colors mb-4"
            onClick={() => inputRef.current?.click()}
          >
            <div className="text-3xl mb-2">📁</div>
            <p className="text-gray-300 text-sm">Clique para adicionar imagens ou GIFs</p>
            <p className="text-gray-500 text-xs mt-1">JPG, PNG, WebP ou GIF • Máx. 20MB cada</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.gif"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </div>

          {/* Configuração de carrossel (aparece apenas se tiver 2+ imagens) */}
          {totalImages >= 2 && (
            <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
              <p className="text-gray-300 text-sm font-medium mb-3">
                🎠 Configuração do Carrossel ({totalImages} imagens)
              </p>
              <div className="flex items-center gap-3">
                <label className="text-gray-400 text-sm whitespace-nowrap">Tempo por imagem:</label>
                <input
                  type="range"
                  min="2"
                  max="30"
                  value={interval}
                  onChange={e => setInterval(parseInt(e.target.value))}
                  className="flex-1 accent-primary-500"
                />
                <span className="text-white font-bold text-sm w-16 text-center">
                  {interval}s
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button
              onClick={handleSave}
              disabled={isUploading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
              ) : (
                <><span>✅</span> Concluir e Salvar</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- sub-componente: modal de background global ----------
function GlobalBgModal({
  scope,
  label,
  onClose,
}: {
  scope: 'LOGIN' | 'CITY_SELECT';
  label: string;
  onClose: () => void;
}) {
  const [existing, setExisting] = useState<BgImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [interval, setInterval] = useState(5);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadExisting();
    return () => previews.forEach(URL.revokeObjectURL);
  }, []);

  const loadExisting = async () => {
    try {
      const { data } = await api.get(`/global-backgrounds?scope=${scope}`);
      setExisting(Array.isArray(data?.data) ? data.data : []);
    } catch { setExisting([]); }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    setPendingFiles(prev => [...prev, ...arr]);
    setPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))]);
  };

  const removePending = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setPendingFiles(p => p.filter((_, i) => i !== idx));
    setPreviews(p => p.filter((_, i) => i !== idx));
  };

  const removeExisting = async (bgId: string) => {
    try {
      await api.delete(`/global-backgrounds/${bgId}`);
      toast.success('Imagem removida');
      loadExisting();
    } catch { toast.error('Erro ao remover'); }
  };

  const handleSave = async () => {
    if (pendingFiles.length === 0) {
      toast.error('Selecione pelo menos uma imagem'); return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('scope', scope);
      formData.append('carouselInterval', String(interval));
      pendingFiles.forEach(f => formData.append('images', f));
      await api.post('/global-backgrounds', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Background de "${label}" atualizado!`);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Erro ao salvar backgrounds');
    }
    finally { setIsUploading(false); }
  };

  const totalImages = existing.length + pendingFiles.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white">🌐 Background — {label}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-5">
            <p className="text-blue-300 text-xs font-medium mb-1">📐 Tamanho recomendado</p>
            <p className="text-blue-200 text-xs">
              <strong>1920 × 1080 px</strong> (Full HD, 16:9) • Formatos: JPG, PNG, WebP, GIF • Máx. 20MB por arquivo
            </p>
            <p className="text-blue-300/70 text-xs mt-1">
              1 imagem/GIF → fundo estático &nbsp;|&nbsp; 2+ imagens → carrossel automático na tela
            </p>
          </div>

          {/* Imagens existentes */}
          {existing.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">Imagens atuais</p>
              <div className="flex flex-wrap gap-3">
                {existing.map(bg => (
                  <div key={bg.id} className="relative group">
                    <img src={bg.imageUrl} alt="" className="w-28 h-20 object-cover rounded-xl border border-gray-700" />
                    <button
                      onClick={() => removeExisting(bg.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >✕</button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity">Remover</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previews novas */}
          {previews.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">Novas imagens (aguardando salvar)</p>
              <div className="flex flex-wrap gap-3">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative group">
                    <img src={src} alt="" className="w-28 h-20 object-cover rounded-xl border border-primary-500/50" />
                    <button
                      onClick={() => removePending(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >✕</button>
                    <div className="absolute bottom-0 left-0 right-0 bg-primary-600/60 text-white text-xs text-center py-0.5 rounded-b-xl">Nova</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className="border-2 border-dashed border-gray-600 hover:border-primary-500/60 rounded-xl p-6 text-center cursor-pointer transition-colors mb-4"
            onClick={() => inputRef.current?.click()}
          >
            <div className="text-3xl mb-2">📁</div>
            <p className="text-gray-300 text-sm">Clique para adicionar imagens</p>
            <p className="text-gray-500 text-xs mt-1">JPG, PNG ou WebP • Máx. 10MB cada</p>
            <input ref={inputRef} type="file" accept="image/*,.gif" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          </div>

          {totalImages >= 2 && (
            <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
              <p className="text-gray-300 text-sm font-medium mb-3">🎠 Carrossel ({totalImages} imagens)</p>
              <div className="flex items-center gap-3">
                <label className="text-gray-400 text-sm whitespace-nowrap">Tempo por imagem:</label>
                <input type="range" min="2" max="30" value={interval} onChange={e => setInterval(parseInt(e.target.value))} className="flex-1 accent-primary-500" />
                <span className="text-white font-bold text-sm w-16 text-center">{interval}s</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSave} disabled={isUploading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isUploading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
              ) : <><span>✅</span> Concluir e Salvar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// PÁGINA PRINCIPAL
// ================================================================
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

  // Background modals
  const [cityBgTarget, setCityBgTarget] = useState<City | null>(null);
  const [globalBgScope, setGlobalBgScope] = useState<'LOGIN' | 'CITY_SELECT' | null>(null);

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
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setTab('cities')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'cities' ? 'bg-primary-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            🏙️ Cidades
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setTab('users')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'users' ? 'bg-primary-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              👤 Usuários
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setTab('global-bg')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'global-bg' ? 'bg-primary-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              🌐 Backgrounds Globais
            </button>
          )}
        </div>

        {/* ── Tab Cidades ── */}
        {tab === 'cities' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Cidades ({cities.length})</h2>
              <button onClick={() => { setEditCity(null); setCityForm({ name: '', carouselInterval: 5 }); setShowCityModal(true); }} className="btn-primary">
                ➕ Nova Cidade
              </button>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-20 text-gray-400 gap-3">
                <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
              </div>
            ) : (
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
                      {city.backgroundImages && city.backgroundImages.length > 0 && (
                        <span className="text-primary-400">
                          🖼️ {city.backgroundImages.length} img{city.backgroundImages.length > 1 ? ` • 🎠 ${city.carouselInterval}s` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCityBgTarget(city)}
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
            )}
          </div>
        )}

        {/* ── Tab Usuários ── */}
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
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-400' : u.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                          {u.role}
                        </span>
                        {(u.cities ?? []).map(c => (
                          <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400">{c.name}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => openUserEdit(u)} className="btn-secondary text-xs py-1.5">✏️ Editar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab Backgrounds Globais ── */}
        {tab === 'global-bg' && isSuperAdmin && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">🌐 Backgrounds Globais</h2>
              <p className="text-gray-400 text-sm">Defina o fundo da tela de Login e da tela de Seleção de Cidade.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card Login */}
              <div className="card space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-xl">🔐</div>
                  <div>
                    <h3 className="text-white font-semibold">Tela de Login</h3>
                    <p className="text-gray-400 text-xs">Fundo exibido na página de autenticação</p>
                  </div>
                </div>
                <button
                  onClick={() => setGlobalBgScope('LOGIN')}
                  className="w-full btn-primary text-sm flex items-center justify-center gap-2"
                >
                  🖼️ Gerenciar Background
                </button>
              </div>
              {/* Card City Select */}
              <div className="card space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl">🏙️</div>
                  <div>
                    <h3 className="text-white font-semibold">Seleção de Cidade</h3>
                    <p className="text-gray-400 text-xs">Fundo exibido na tela de seleção de cidades</p>
                  </div>
                </div>
                <button
                  onClick={() => setGlobalBgScope('CITY_SELECT')}
                  className="w-full btn-primary text-sm flex items-center justify-center gap-2"
                >
                  🖼️ Gerenciar Background
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modais ── */}

      {/* City form modal */}
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
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCityModal(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Salvando...' : 'Salvar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* User form modal */}
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

      {/* City background modal */}
      {cityBgTarget && (
        <CityBgModal
          city={cityBgTarget}
          onClose={() => setCityBgTarget(null)}
          onSaved={loadCities}
        />
      )}

      {/* Global background modal */}
      {globalBgScope && (
        <GlobalBgModal
          scope={globalBgScope}
          label={globalBgScope === 'LOGIN' ? 'Tela de Login' : 'Seleção de Cidade'}
          onClose={() => setGlobalBgScope(null)}
        />
      )}
    </div>
  );
}
