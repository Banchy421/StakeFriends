'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/lib/themes';
import { Sound } from '@/lib/sounds';
import { cn } from '@/lib/utils';

interface ThemePickerProps {
  compact?: boolean;
}

export function ThemePicker({ compact = false }: ThemePickerProps) {
  const { theme, setThemeId, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setOpen(!open); Sound.click(); }}
        onMouseEnter={() => Sound.hover()}
        className={cn(
          'flex items-center gap-2 rounded-md border transition-all',
          compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
        )}
        style={{
          backgroundColor: 'var(--sf-bg-secondary)',
          borderColor: open ? 'var(--sf-accent)' : 'var(--sf-border)',
          color: 'var(--sf-text)',
        }}
      >
        <span className={compact ? 'text-base' : 'text-lg'}>{theme.icon}</span>
        {!compact && <span>{theme.name}</span>}
        <span className="text-xs opacity-60">▼</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 rounded-lg border shadow-2xl z-50 overflow-hidden"
            style={{
              backgroundColor: 'var(--sf-bg-secondary)',
              borderColor: 'var(--sf-border)',
            }}
          >
            <div className="p-2">
              <div
                className="text-xs uppercase tracking-widest px-2 py-1.5 mb-1"
                style={{ color: 'var(--sf-text-muted)' }}
              >
                Select Theme
              </div>
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setThemeId(t.id);
                    Sound.winSmall();
                    setOpen(false);
                  }}
                  onMouseEnter={() => Sound.hover()}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md transition-all text-left"
                  style={{
                    backgroundColor: theme.id === t.id ? `rgba(${t.colors.accentRgb}, 0.15)` : 'transparent',
                  }}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-bold"
                      style={{ color: theme.id === t.id ? t.colors.accent : 'var(--sf-text)' }}
                    >
                      {t.name}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--sf-text-muted)' }}>
                      {t.description}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.colors.accent }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.colors.win }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.colors.lose }} />
                  </div>
                  {theme.id === t.id && (
                    <span className="text-xs" style={{ color: t.colors.accent }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
