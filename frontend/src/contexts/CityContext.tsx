import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { City, CityContextType } from '../types';
import api from '../services/api';

const CityContext = createContext<CityContextType | null>(null);

const STORAGE_KEY = 'currentCityId';

export const CityProvider = ({ children }: { children: ReactNode }) => {
  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Na montagem: migrar chave antiga e re-buscar cidade pelo ID salvo
  useEffect(() => {
    const init = async () => {
      // Migração: remove chave antiga que guardava o objeto completo (base64 enorme)
      if (localStorage.getItem('currentCity')) {
        try {
          const old = JSON.parse(localStorage.getItem('currentCity') ?? '');
          if (old?.id) {
            localStorage.setItem(STORAGE_KEY, old.id);
          }
        } catch {
          // ignorar parse error
        }
        localStorage.removeItem('currentCity');
      }

      const cityId = localStorage.getItem(STORAGE_KEY);
      if (cityId) {
        try {
          const { data } = await api.get(`/cities/${cityId}`);
          const city: City = data.data ?? data;
          setCurrentCity(city);
        } catch {
          // Se a cidade não existir mais ou não tiver permissão, limpa o ID salvo
          localStorage.removeItem(STORAGE_KEY);
          setCurrentCity(null);
        }
      }

      setIsLoading(false);
    };

    init();
  }, []);

  const setCity = (city: City | null) => {
    setCurrentCity(city);
    if (city) {
      // Salva APENAS o ID — nunca o objeto completo (evita QuotaExceededError com imagens base64)
      localStorage.setItem(STORAGE_KEY, city.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Enquanto verifica localStorage, não renderiza filhos para evitar flash
  if (isLoading) {
    return null;
  }

  return (
    <CityContext.Provider value={{ currentCity, setCurrentCity: setCity }}>
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error('useCity must be used within CityProvider');
  return ctx;
};
