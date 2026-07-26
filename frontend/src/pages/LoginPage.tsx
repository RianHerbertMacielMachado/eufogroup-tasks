import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

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

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [discordId, setDiscordId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentBg, isCarousel, images, currentIdx } = useDynamicBackground('LOGIN', 6);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordId || !password) {
      toast.error('Preencha todos os campos');
      return;
    }
    setIsLoading(true);
    try {
      await login(discordId, password);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
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
          {/* Overlay escuro para legibilidade */}
          <div className="absolute inset-0 bg-black/60 z-0" />
        </>
      ) : (
        /* Fallback gradiente */
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full opacity-5 bg-primary-400"
                style={{
                  width: Math.random() * 200 + 50,
                  height: Math.random() * 200 + 50,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 3}s`
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Indicadores de carrossel */}
      {isCarousel && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      )}

      {/* Form */}
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-500/20 rounded-full border border-primary-400/30 mb-4 backdrop-blur-sm">
            <span className="text-4xl">🎯</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Eufogrup</h1>
          <p className="text-gray-300 drop-shadow">Sistema de Gestão de Tasks</p>
        </div>

        <div className="card animate-fade-in backdrop-blur-sm bg-gray-900/80 border-gray-700/80">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">Entrar na plataforma</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Discord ID</label>
              <input
                type="text"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                placeholder="exemplo#1234"
                className="input-field"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                <><span>🔐</span> Entrar</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          Eufogrup Tasks v1.0 • Multi-Tenant
        </p>
      </div>
    </div>
  );
}
