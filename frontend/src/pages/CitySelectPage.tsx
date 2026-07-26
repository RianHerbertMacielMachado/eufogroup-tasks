import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCity } from '../contexts/CityContext';
import { City } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';

interface BgImage { id: string; imageUrl: string; order: number; }

function useDynamicBackground(scope: 'LOGIN' | 'CITY_SELECT', intervalSeconds: number = 5) {
  const [images, setImages] = useState<BgImage[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get(`/global-backgrounds?scope=${scope}`)
      .then(({ data }) => {
        const imgs = Array.isArray(data?.data) ? data.data : [];
        setImages(imgs);
      })
      .catch(() => setImages([]));
  }, [scope]);

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % images.length);
    }, intervalSeconds * 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [images, intervalSeconds]);

  const currentBg = images[currentIdx]?.imageUrl ?? null;
  const isCarousel = images.length > 1;

  return { currentBg, isCarousel, images, currentIdx };
}

export default function CitySelectPage() {
  const { user, logout } = useAuth();
  const { setCurrentCity } = useCity();
  const navigate = useNavigate();
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentBg, isCarousel, images, currentIdx } = useDynamicBackground('CITY_SELECT', 7);

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      const { data } = await api.get('/cities');
      setCities(data.data || []);
    } catch {
      toast.error('Erro ao carregar cidades');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitySelect = (city: City) => {
    const userCityIds = user?.cities?.map(c => c.id) ?? [];
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    if (!isSuperAdmin && !userCityIds.includes(city.id)) {
      toast.error('Você não tem permissão para acessar esta cidade');
      return;
    }

    setCurrentCity(city);
    navigate(`/city/${city.id}/dashboard`);
    toast.success(`Acessando ${city.name}`);
  };

  const userCityIds = user?.cities?.map(c => c.id) ?? [];
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen relative overflow-hidden">

      {/* Background dinâmico */}
      {currentBg ? (
        <>
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="absolute inset-0 bg-center bg-cover transition-opacity duration-1000"
              style={{
                backgroundImage: `url(${img.imageUrl})`,
                opacity: idx === currentIdx ? 1 : 0,
                zIndex: 0,
              }}
            />
          ))}
          <div className="absolute inset-0 bg-black/50 z-0" />
        </>
      ) : (
        /* Fallback */
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-900/30 to-transparent" />
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full opacity-5"
                style={{
                  background: 'radial-gradient(circle, #667eea, transparent)',
                  width: Math.random() * 300 + 100,
                  height: Math.random() * 300 + 100,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 5}s`
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Indicadores de carrossel */}
      {isCarousel && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="p-6 flex items-center justify-between backdrop-blur-sm bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center border border-primary-400/30">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg drop-shadow">Eufogroup Tasks</h1>
              <p className="text-gray-300 text-xs">Sistema de Gestão Multi-Cidade</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {(isSuperAdmin || user?.role === 'ADMIN') && (
              <button
                onClick={() => navigate('/admin')}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <span>⚙️</span> Admin
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-white text-sm font-medium drop-shadow">{user?.name}</p>
                <p className="text-gray-300 text-xs">{user?.discordId}</p>
              </div>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="w-8 h-8 rounded-lg bg-gray-700/80 hover:bg-red-600/20 hover:text-red-400 flex items-center justify-center transition-colors backdrop-blur-sm"
                title="Sair"
              >
                🚪
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">Selecione uma Cidade</h2>
            <p className="text-gray-200 text-lg drop-shadow">Cada cidade é um ambiente completamente isolado</p>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 text-gray-200">
              <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
              Carregando cidades...
            </div>
          ) : (
            <div className="flex flex-wrap gap-8 justify-center max-w-5xl">
              {cities.map((city, index) => {
                const hasAccess = isSuperAdmin || userCityIds.includes(city.id);
                const bgImage = city.backgroundImages?.[0]?.imageUrl;

                return (
                  <div
                    key={city.id}
                    onClick={() => handleCitySelect(city)}
                    className={hasAccess ? 'city-card animate-fade-in' : 'city-card-locked animate-fade-in'}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Background */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: bgImage
                          ? `url(${bgImage}) center/cover`
                          : `linear-gradient(135deg, hsl(${220 + index * 40}, 60%, 20%), hsl(${260 + index * 40}, 60%, 30%))`,
                      }}
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Locked overlay */}
                    {!hasAccess && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-5xl mb-2">🔒</div>
                          <p className="text-gray-300 text-sm">Sem permissão</p>
                        </div>
                      </div>
                    )}

                    {/* City info */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-center gap-2 mb-2">
                        {hasAccess ? (
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-gray-500" />
                        )}
                        <span className="text-xs text-gray-300 uppercase tracking-wider">
                          {hasAccess ? 'Disponível' : 'Bloqueado'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-white">{city.name}</h3>
                      {city._count && (
                        <p className="text-gray-300 text-sm mt-1">
                          {city._count.employees} funcionários • {city._count.tasks} tasks
                        </p>
                      )}
                    </div>

                    {/* Hover effect */}
                    {hasAccess && (
                      <div className="absolute inset-0 border-2 border-transparent hover:border-primary-400/60 rounded-3xl transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                        <div className="bg-primary-500/90 text-white px-4 py-2 rounded-full text-sm font-semibold">
                          Acessar →
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {cities.length === 0 && (
                <div className="text-center text-gray-300 py-20">
                  <div className="text-5xl mb-4">🏙️</div>
                  <p className="text-lg">Nenhuma cidade cadastrada</p>
                  {(isSuperAdmin || user?.role === 'ADMIN') && (
                    <button
                      onClick={() => navigate('/admin')}
                      className="btn-primary mt-4"
                    >
                      Criar primeira cidade
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
