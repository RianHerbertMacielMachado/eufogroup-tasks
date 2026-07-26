import React, { createContext, useContext, useState, ReactNode } from 'react';
import { City, CityContextType } from '../types';

const CityContext = createContext<CityContextType | null>(null);

export const CityProvider = ({ children }: { children: ReactNode }) => {
  const [currentCity, setCurrentCity] = useState<City | null>(() => {
    const stored = localStorage.getItem('currentCity');
    if (stored) {
      try { return JSON.parse(stored); } catch {}
    }
    return null;
  });

  const setCity = (city: City | null) => {
    setCurrentCity(city);
    if (city) {
      localStorage.setItem('currentCity', JSON.stringify(city));
    } else {
      localStorage.removeItem('currentCity');
    }
  };

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
