'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Theme {
  id: string;
  name: string;
  icon: string;
  description: string;
  colors: {
    bg: string;           // page background
    bgSecondary: string;  // panels
    bgTertiary: string;   // inputs, nested panels
    border: string;       // borders
    accent: string;       // primary accent (gold equivalent)
    accentDark: string;   // hover state
    accentRgb: string;    // RGB values for rgba() usage
    win: string;          // win green
    lose: string;         // lose red
    text: string;         // main text
    textMuted: string;    // muted text
    glow: string;         // glow shadow color
  };
  gradient: string;       // background gradient
  panelGradient: string;  // panel background gradient
}

export const THEMES: Theme[] = [
  {
    id: 'casino-gold',
    name: 'Casino Gold',
    icon: '🎰',
    description: 'Classic casino — deep black with gold accents',
    colors: {
      bg: '#0a0a0a',
      bgSecondary: '#1a1a1a',
      bgTertiary: '#0a0a0a',
      border: '#2a2a2a',
      accent: '#C9A84C',
      accentDark: '#8a6f2c',
      accentRgb: '201, 168, 76',
      win: '#38A169',
      lose: '#E53E3E',
      text: '#f5f5f5',
      textMuted: '#8a8a8a',
      glow: 'rgba(201, 168, 76, 0.5)',
    },
    gradient: 'radial-gradient(at 20% 20%, rgba(201, 168, 76, 0.05) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(229, 62, 62, 0.03) 0px, transparent 50%)',
    panelGradient: 'linear-gradient(135deg, #1a1a1a 0%, #161616 100%)',
  },
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    icon: '🌃',
    description: 'Futuristic neon — dark blue with cyan & magenta',
    colors: {
      bg: '#050510',
      bgSecondary: '#0d0d20',
      bgTertiary: '#050510',
      border: '#1a1a35',
      accent: '#00e5ff',
      accentDark: '#0099b8',
      accentRgb: '0, 229, 255',
      win: '#00ff88',
      lose: '#ff0055',
      text: '#e0e0ff',
      textMuted: '#6a6a8a',
      glow: 'rgba(0, 229, 255, 0.5)',
    },
    gradient: 'radial-gradient(at 20% 20%, rgba(0, 229, 255, 0.06) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(255, 0, 85, 0.04) 0px, transparent 50%)',
    panelGradient: 'linear-gradient(135deg, #0d0d20 0%, #0a0a18 100%)',
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    icon: '👑',
    description: 'Regal elegance — deep purple with violet & gold',
    colors: {
      bg: '#0d0813',
      bgSecondary: '#1a1228',
      bgTertiary: '#0d0813',
      border: '#2a1f3d',
      accent: '#a855f7',
      accentDark: '#7c3aed',
      accentRgb: '168, 85, 247',
      win: '#22c55e',
      lose: '#ef4444',
      text: '#f0e6ff',
      textMuted: '#8a7a9a',
      glow: 'rgba(168, 85, 247, 0.5)',
    },
    gradient: 'radial-gradient(at 20% 20%, rgba(168, 85, 247, 0.06) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(201, 168, 76, 0.03) 0px, transparent 50%)',
    panelGradient: 'linear-gradient(135deg, #1a1228 0%, #150f20 100%)',
  },
  {
    id: 'ocean-blue',
    name: 'Midnight Ocean',
    icon: '🌊',
    description: 'Deep sea vibes — dark teal with aqua & coral',
    colors: {
      bg: '#04101a',
      bgSecondary: '#0a1a28',
      bgTertiary: '#04101a',
      border: '#15293d',
      accent: '#06b6d4',
      accentDark: '#0891b2',
      accentRgb: '6, 182, 212',
      win: '#10b981',
      lose: '#f43f5e',
      text: '#e0f0ff',
      textMuted: '#6a8a9a',
      glow: 'rgba(6, 182, 212, 0.5)',
    },
    gradient: 'radial-gradient(at 20% 20%, rgba(6, 182, 212, 0.06) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(244, 63, 94, 0.03) 0px, transparent 50%)',
    panelGradient: 'linear-gradient(135deg, #0a1a28 0%, #08141f 100%)',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    icon: '💚',
    description: 'Fresh & clean — dark green with emerald & lime',
    colors: {
      bg: '#04120a',
      bgSecondary: '#0a1f14',
      bgTertiary: '#04120a',
      border: '#153020',
      accent: '#10b981',
      accentDark: '#059669',
      accentRgb: '16, 185, 129',
      win: '#22c55e',
      lose: '#ef4444',
      text: '#e0ffe8',
      textMuted: '#6a9a7a',
      glow: 'rgba(16, 185, 129, 0.5)',
    },
    gradient: 'radial-gradient(at 20% 20%, rgba(16, 185, 129, 0.06) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(239, 68, 68, 0.02) 0px, transparent 50%)',
    panelGradient: 'linear-gradient(135deg, #0a1f14 0%, #081810 100%)',
  },
];

interface ThemeContextValue {
  theme: Theme;
  setThemeId: (id: string) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return 'casino-gold';
    return localStorage.getItem('sf-theme') || 'casino-gold';
  });

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  const setThemeId = (id: string) => {
    setThemeIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sf-theme', id);
    }
  };

  // Apply theme CSS variables to :root
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const c = theme.colors;
    root.style.setProperty('--sf-bg', c.bg);
    root.style.setProperty('--sf-bg-secondary', c.bgSecondary);
    root.style.setProperty('--sf-bg-tertiary', c.bgTertiary);
    root.style.setProperty('--sf-border', c.border);
    root.style.setProperty('--sf-accent', c.accent);
    root.style.setProperty('--sf-accent-dark', c.accentDark);
    root.style.setProperty('--sf-accent-rgb', c.accentRgb);
    root.style.setProperty('--sf-win', c.win);
    root.style.setProperty('--sf-lose', c.lose);
    root.style.setProperty('--sf-text', c.text);
    root.style.setProperty('--sf-text-muted', c.textMuted);
    root.style.setProperty('--sf-glow', c.glow);
    root.style.setProperty('--sf-gradient', theme.gradient);
    root.style.setProperty('--sf-panel-gradient', theme.panelGradient);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setThemeId, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback if used outside provider (shouldn't happen)
    return { theme: THEMES[0], setThemeId: () => {}, themes: THEMES };
  }
  return ctx;
}
