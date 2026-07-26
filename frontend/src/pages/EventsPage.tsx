import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Event, Employee } from '../types';
import api from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// ─── helpers ─────────────────────────────────────────────────────────────────
const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL) || '';

function imgUrl(p: string) {
  if (!p) return '';
  if (p.startsWith('http')) return p;
  return `${API_BASE}${p}`;
}

// ─── sub-component: image gallery viewer ─────────────────────────────────────
function ImageGallery({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!images || images.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-700">
        <img
          src={imgUrl(images[idx])}
          alt={`Imagem ${idx + 1}`}
          className="w-full max-h-64 object-contain"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >‹</button>
            <button
              onClick={() => setIdx(i => (i + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >›</button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <p className="text-gray-500 text-xs mt-1 text-center">{idx + 1} / {images.length}</p>
    </div>
  );
}

// ─── sub-component: image upload preview ─────────────────────────────────────
function ImageUploadPreview({
  files,
  onChange,
  keptUrls,
  onRemoveKept
}: {
  files: File[];
  onChange: (files: File[]) => void;
  keptUrls?: string[];
  onRemoveKept?: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files);
    onChange([...files, ...picked]);
    e.target.value = '';
  };

  const removeNew = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">Imagens (opcional)</label>

      {/* Imagens já salvas (edição) */}
      {keptUrls && keptUrls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {keptUrls.map(url => (
            <div key={url} className="relative">
              <img src={imgUrl(url)} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-600" />
              {onRemoveKept && (
                <button
                  type="button"
                  onClick={() => onRemoveKept(url)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600"
                >✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Novas imagens selecionadas */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((file, i) => (
            <div key={i} className="relative">
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="w-16 h-16 object-cover rounded-lg border border-primary-500/40"
              />
              <button
                type="button"
                onClick={() => removeNew(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-gray-600 rounded-xl py-3 text-gray-400 hover:border-primary-500/50 hover:text-primary-400 transition-colors text-sm"
      >
        📷 Clique para adicionar imagens
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.gif"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <p className="text-gray-500 text-xs mt-1">Formatos: JPG, PNG, GIF, WebP — Máx. 20MB por arquivo</p>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function EventsPage() {
  const { cityId } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const [events, setEvents] = useState<Event[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cargos, setCargos] = useState<string[]>([]);
  const [funcoes, setFuncoes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filtros
  const [filterCargo, setFilterCargo] = useState('');
  const [filterFuncao, setFilterFuncao] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Modal criar
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    employeeId: '', description: '', link: ''
  });
  const [createImages, setCreateImages] = useState<File[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Modal editar
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [editForm, setEditForm] = useState({ description: '', link: '' });
  const [editImages, setEditImages] = useState<File[]>([]);
  const [editKeptImages, setEditKeptImages] = useState<string[]>([]);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Expanded detail
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── carregamento inicial ────────────────────────────────────────────────────
  useEffect(() => {
    if (cityId) {
      loadEvents();
      loadEmployees();
      loadFilterOptions();
    }
  }, [cityId, page, filterCargo, filterFuncao, filterMonth, filterYear]);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (filterCargo)  params.cargo  = filterCargo;
      if (filterFuncao) params.funcao = filterFuncao;
      if (filterMonth)  params.month  = filterMonth;
      if (filterYear)   params.year   = filterYear;
      const { data } = await api.get(`/cities/${cityId}/events`, { params });
      setEvents(Array.isArray(data?.data?.events) ? data.data.events : []);
      setTotalPages(data?.data?.pagination?.pages ?? 1);
      setTotalCount(data?.data?.pagination?.total ?? 0);
    } catch {
      toast.error('Erro ao carregar feedbacks');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data } = await api.get(`/cities/${cityId}/employees`, { params: { limit: 200 } });
      setEmployees(Array.isArray(data?.data?.employees) ? data.data.employees : []);
    } catch {
      setEmployees([]);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const { data } = await api.get(`/cities/${cityId}/events/filter-options`);
      setCargos(Array.isArray(data?.data?.cargos) ? data.data.cargos : []);
      setFuncoes(Array.isArray(data?.data?.funcoes) ? data.data.funcoes : []);
    } catch {
      setCargos([]);
      setFuncoes([]);
    }
  };

  // ── handlers criar ──────────────────────────────────────────────────────────
  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find(e => e.id === empId) || null;
    setSelectedEmployee(emp);
    setCreateForm(f => ({ ...f, employeeId: empId }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.description || !createForm.employeeId) {
      toast.error('Preencha os campos obrigatórios'); return;
    }
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('employeeId', createForm.employeeId);
      fd.append('description', createForm.description);
      if (createForm.link) fd.append('link', createForm.link);
      createImages.forEach(f => fd.append('images', f));

      await api.post(`/cities/${cityId}/events`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Feedback registrado com sucesso!');
      setShowCreateModal(false);
      setCreateForm({ employeeId: '', description: '', link: '' });
      setCreateImages([]);
      setSelectedEmployee(null);
      setPage(1);
      loadEvents();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Erro ao criar feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── handlers editar ─────────────────────────────────────────────────────────
  const openEdit = (ev: Event) => {
    setEditEvent(ev);
    setEditForm({ description: ev.description, link: ev.link || '' });
    setEditImages([]);
    setEditKeptImages([...(ev.images || [])]);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEvent || !editForm.description) {
      toast.error('Descrição é obrigatória'); return;
    }
    setIsEditSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('description', editForm.description);
      fd.append('link', editForm.link); // sempre envia, mesmo vazio — permite limpar o campo
      fd.append('keptImages', JSON.stringify(editKeptImages));
      editImages.forEach(f => fd.append('images', f));

      await api.put(`/cities/${cityId}/events/${editEvent.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Feedback atualizado!');
      setEditEvent(null);
      loadEvents();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Erro ao atualizar feedback');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // ── handler deletar ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/cities/${cityId}/events/${deleteId}`);
      toast.success('Feedback excluído');
      setDeleteId(null);
      loadEvents();
    } catch {
      toast.error('Erro ao excluir feedback');
    }
  };

  // ── reset filtros ───────────────────────────────────────────────────────────
  const clearFilters = () => {
    setFilterCargo('');
    setFilterFuncao('');
    setFilterMonth('');
    setFilterYear('');
    setPage(1);
  };
  const hasFilters = filterCargo || filterFuncao || filterMonth || filterYear;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">📝 Registro de Feedback</h1>
          <p className="text-gray-400 text-sm mt-1">{totalCount} registro{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <span>➕</span> Novo Feedback
        </button>
      </div>

      {/* Filtros */}
      <div className="card flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-400 mb-1">Filtrar por Cargo</label>
          <select
            value={filterCargo}
            onChange={e => { setFilterCargo(e.target.value); setPage(1); }}
            className="input-field text-sm"
          >
            <option value="">Todos os cargos</option>
            {cargos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-400 mb-1">Filtrar por Função</label>
          <select
            value={filterFuncao}
            onChange={e => { setFilterFuncao(e.target.value); setPage(1); }}
            className="input-field text-sm"
          >
            <option value="">Todas as funções</option>
            {funcoes.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs text-gray-400 mb-1">Mês</label>
          <select
            value={filterMonth}
            onChange={e => { setFilterMonth(e.target.value); setPage(1); }}
            className="input-field text-sm"
          >
            <option value="">Todos os meses</option>
            <option value="1">Janeiro</option>
            <option value="2">Fevereiro</option>
            <option value="3">Março</option>
            <option value="4">Abril</option>
            <option value="5">Maio</option>
            <option value="6">Junho</option>
            <option value="7">Julho</option>
            <option value="8">Agosto</option>
            <option value="9">Setembro</option>
            <option value="10">Outubro</option>
            <option value="11">Novembro</option>
            <option value="12">Dezembro</option>
          </select>
        </div>
        <div className="flex-1 min-w-[100px]">
          <label className="block text-xs text-gray-400 mb-1">Ano</label>
          <select
            value={filterYear}
            onChange={e => { setFilterYear(e.target.value); setPage(1); }}
            className="input-field text-sm"
          >
            <option value="">Todos os anos</option>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="btn-secondary text-sm flex items-center gap-1">
            ✕ Limpar filtros
          </button>
        )}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-20 text-gray-400 gap-3">
          <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">📭</div>
          <p>Nenhum feedback registrado</p>
          {hasFilters && <p className="text-sm mt-2">Tente remover os filtros</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => {
            const isExpanded = expandedId === event.id;
            const hasImages = Array.isArray(event.images) && event.images.length > 0;
            return (
              <div
                key={event.id}
                className="card hover:border-primary-500/30 transition-all animate-fade-in"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                {/* Row header */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 border border-primary-400/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">📝</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-white font-semibold text-sm">{event.employee?.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          <span className="text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full">
                            {event.cargo}
                          </span>
                          {event.funcao && (
                            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                              {event.funcao}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-gray-400 text-xs">
                            {format(new Date(event.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {format(new Date(event.createdAt), 'HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                        {/* Expand / collapse */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : event.id)}
                          className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center text-xs transition-colors"
                          title={isExpanded ? 'Recolher' : 'Expandir'}
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(event)}
                          className="w-7 h-7 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 flex items-center justify-center text-xs transition-colors"
                          title="Editar"
                        >✏️</button>
                        {/* Delete (admin only) */}
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteId(event.id)}
                            className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center text-xs transition-colors"
                            title="Excluir"
                          >🗑️</button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mt-2 leading-relaxed">{event.description}</p>
                    {/* link preview */}
                    {event.link && (
                      <a
                        href={event.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        🔗 <span className="underline truncate max-w-xs">{event.link}</span>
                      </a>
                    )}
                    {/* indicator */}
                    {hasImages && !isExpanded && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        📷 {event.images.length} imagem{event.images.length !== 1 ? 'ns' : ''} — clique ▼ para ver
                      </p>
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    {hasImages ? (
                      <ImageGallery images={event.images} />
                    ) : (
                      <p className="text-gray-500 text-xs text-center py-2">Sem imagens neste feedback</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm disabled:opacity-30">← Anterior</button>
          <span className="text-gray-400 text-sm">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm disabled:opacity-30">Próxima →</button>
        </div>
      )}

      {/* ── Modal Criar ─────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white">📝 Novo Feedback</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white">✕</button>
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
                    value={createForm.employeeId}
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
                  <label className="block text-sm text-gray-300 mb-1">Descrição do Feedback *</label>
                  <textarea
                    value={createForm.description}
                    onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                    className="input-field"
                    rows={4}
                    placeholder="Descreva o feedback..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Link de evidência (opcional)</label>
                  <input
                    type="url"
                    value={createForm.link}
                    onChange={e => setCreateForm(f => ({ ...f, link: e.target.value }))}
                    className="input-field"
                    placeholder="https://..."
                  />
                </div>
                <ImageUploadPreview
                  files={createImages}
                  onChange={setCreateImages}
                />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                    {isSubmitting ? 'Registrando...' : 'Registrar Feedback'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Editar ─────────────────────────────────────────────────────── */}
      {editEvent && (
        <div className="modal-overlay" onClick={() => setEditEvent(null)}>
          <div className="modal-content max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white">✏️ Editar Feedback</h2>
                <button onClick={() => setEditEvent(null)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <div className="bg-gray-700/50 rounded-xl p-3 text-sm mb-4">
                <p className="text-gray-300">Funcionário: <span className="text-white">{editEvent.employee?.name}</span></p>
                <p className="text-gray-400 text-xs mt-0.5">Data original imutável: {format(new Date(editEvent.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </div>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Descrição *</label>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="input-field"
                    rows={4}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Link de evidência (opcional)</label>
                  <input
                    type="url"
                    value={editForm.link}
                    onChange={e => setEditForm(f => ({ ...f, link: e.target.value }))}
                    className="input-field"
                    placeholder="https://..."
                  />
                </div>
                <ImageUploadPreview
                  files={editImages}
                  onChange={setEditImages}
                  keptUrls={editKeptImages}
                  onRemoveKept={url => setEditKeptImages(prev => prev.filter(u => u !== url))}
                />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditEvent(null)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={isEditSubmitting} className="btn-primary flex-1">
                    {isEditSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Exclusão ─────────────────────────────────────────── */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-3">🗑️ Excluir Feedback</h2>
              <p className="text-gray-300 text-sm mb-5">
                Tem certeza que deseja excluir este feedback? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleDelete} className="btn-danger flex-1">Confirmar Exclusão</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
