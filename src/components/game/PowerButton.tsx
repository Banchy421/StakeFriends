'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState, Player } from '@/lib/types';
import { POWER_META } from '@/lib/types';
import { Sound } from '@/lib/sounds';
import { formatMoney } from '@/lib/utils-casino';
import { cn } from '@/lib/utils';

interface PowerButtonProps {
  state: GameState;
  self: Player | null;
  onActivate: (targetId?: string) => void;
}

export function PowerButton({ state, self, onActivate }: PowerButtonProps) {
  const [open, setOpen] = useState(false);
  const [showFrozen, setShowFrozen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const myPower = self?.power;
  const isUsed = !myPower || myPower.used;
  const powerMeta = myPower ? POWER_META[myPower.type] : null;

  // Check if frozen
  const isFrozen = self ? self.frozenUntil > Date.now() : false;

  useEffect(() => {
    if (isFrozen) {
      setShowFrozen(true);
      const id = setTimeout(() => setShowFrozen(false), 5000);
      return () => clearTimeout(id);
    }
  }, [isFrozen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!powerMeta || isUsed) {
    // Show a dimmed/used button
    return (
      <div className="fixed bottom-5 right-5 z-40">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl opacity-30"
          style={{
            backgroundColor: 'var(--sf-bg-secondary)',
            border: '0.5px solid var(--sf-border)',
          }}
        >
          {powerMeta?.icon || '✦'}
        </div>
      </div>
    );
  }

  const otherPlayers = Object.values(state.players)
    .filter((p) => p.id !== self?.id && !p.isEliminated);

  const handleActivate = (targetId?: string) => {
    onActivate(targetId);
    setOpen(false);
    Sound.cashRegister();
  };

  return (
    <>
      {/* Frozen overlay */}
      <AnimatePresence>
        {showFrozen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="panel p-6 text-center"
              style={{ borderColor: 'var(--sf-lose)' }}
            >
              <div className="text-5xl mb-2">🧊</div>
              <div className="font-display text-xl" style={{ fontWeight: 500, color: 'var(--sf-lose)' }}>
                You are frozen!
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>
                Wait 5 seconds...
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating round button */}
      <div className="fixed bottom-5 right-5 z-40" ref={dropdownRef}>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => { setOpen(!open); Sound.click(); }}
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg"
          style={{
            backgroundColor: 'var(--sf-accent)',
            border: '2px solid var(--sf-bg)',
            color: 'var(--sf-text)',
          }}
          title={`Activate ${powerMeta.label}`}
        >
          {powerMeta.icon}
        </motion.button>

        {/* Activation dropdown / modal */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-20 right-0 w-72 rounded-lg border overflow-hidden"
              style={{
                backgroundColor: 'var(--sf-bg-secondary)',
                borderColor: 'var(--sf-border)',
              }}
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">{powerMeta.icon}</div>
                  <div className="flex-1">
                    <div className="font-display text-base" style={{ fontWeight: 500, color: 'var(--sf-text)' }}>
                      {powerMeta.label}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>
                      {powerMeta.description}
                    </div>
                  </div>
                </div>

                {powerMeta.targeted ? (
                  <>
                    <div className="text-xs mb-2" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>
                      Select a target:
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto casino-scroll">
                      {otherPlayers.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleActivate(p.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left"
                          style={{ backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sf-border)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span className="text-lg">{p.avatar}</span>
                          <span className="flex-1 text-sm" style={{ color: 'var(--sf-text)', fontWeight: 400 }}>
                            {p.name}
                          </span>
                          <span className="font-mono text-xs" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>
                            {formatMoney(p.balance)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => handleActivate()}
                    className="w-full py-2.5 rounded-md text-sm transition-colors"
                    style={{
                      backgroundColor: 'var(--sf-accent)',
                      color: 'var(--sf-text)',
                      fontWeight: 400,
                    }}
                  >
                    Activate {powerMeta.label}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
