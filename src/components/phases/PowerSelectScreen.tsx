'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState, Player, PowerType } from '@/lib/types';
import { POWER_META } from '@/lib/types';
import { useTimer } from '@/hooks/useTimer';
import { Sound } from '@/lib/sounds';
import { RoundTimer } from '@/components/game/RoundTimer';
import { cn } from '@/lib/utils';

interface PowerSelectScreenProps {
  state: GameState;
  self: Player | null;
  isHost: boolean;
  onSelect: (power: PowerType) => void;
  onAdvance: () => void;
  onLeave: () => void;
}

export function PowerSelectScreen({ state, self, isHost, onSelect, onAdvance, onLeave }: PowerSelectScreenProps) {
  const myOptions = self ? state.powerOptions[self.id] : [];
  const mySelection = self?.power?.type;
  const [localPick, setLocalPick] = useState<PowerType | undefined>(undefined);
  const selected = localPick ?? mySelection;

  const timeRemaining = useTimer(state.timeRemaining, state.phase, () => {}, () => {
    if (isHost) onAdvance();
  });

  const handlePick = (p: PowerType) => {
    if (selected) return;
    setLocalPick(p);
    onSelect(p);
    Sound.click();
  };

  const totalPlayers = Object.keys(state.players).filter((id) => !state.players[id].isEliminated).length;
  const pickedCount = Object.keys(state.powerSelections).length;

  return (
    <div className="min-h-screen flex flex-col p-4">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl mb-1" style={{ fontWeight: 500, color: 'var(--sf-text)' }}>
            Choose your power
          </h2>
          <p className="text-xs" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>
            Pick one of your 2 random powers. {pickedCount}/{totalPlayers} players chose
          </p>
        </div>
        <RoundTimer remaining={timeRemaining} total={state.roundDuration} label="Pick time" compact />
        <button
          onClick={onLeave}
          className="text-xs transition-colors"
          style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}
        >
          Leave
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm max-w-md"
          style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}
        >
          Each player gets 2 random powers. Choose wisely — you can only activate it once during the game.
        </motion.p>

        {myOptions && myOptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full items-stretch">
            {myOptions.map((p, i) => {
              const meta = POWER_META[p];
              const isPicked = selected === p;
              return (
                <motion.button
                  key={p}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={!selected ? { y: -2 } : {}}
                  whileTap={!selected ? { scale: 0.99 } : {}}
                  onClick={() => handlePick(p)}
                  disabled={!!selected}
                  className="panel p-6 text-center transition-colors flex flex-col h-full"
                  style={{
                    borderColor: isPicked ? 'var(--sf-accent)' : 'var(--sf-border)',
                    backgroundColor: isPicked ? 'var(--sf-border)' : 'var(--sf-bg-secondary)',
                    cursor: selected ? 'default' : 'pointer',
                  }}
                >
                  <div className="text-5xl mb-4">{meta.icon}</div>
                  <h3 className="font-display text-xl mb-2" style={{ fontWeight: 500, color: 'var(--sf-text)' }}>
                    {meta.label}
                  </h3>
                  <p className="text-sm flex-1" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>
                    {meta.description}
                  </p>
                  {meta.targeted && (
                    <div className="text-xs mt-3" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>
                      Targets another player
                    </div>
                  )}
                  {isPicked && (
                    <div
                      className="mt-3 inline-block px-2.5 py-0.5 rounded text-xs self-center"
                      style={{ backgroundColor: 'var(--sf-accent)', color: 'var(--sf-text)', fontWeight: 400 }}
                    >
                      Selected
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="text-sm" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>
            Waiting for power options...
          </div>
        )}

        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm"
            style={{ color: 'var(--sf-text)', fontWeight: 400 }}
          >
            You chose {POWER_META[selected].label}. Activate it during a round with the power button.
          </motion.div>
        )}
      </div>
    </div>
  );
}
