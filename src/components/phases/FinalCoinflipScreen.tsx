'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { GameState, Player, GameName } from '@/lib/types';
import { GAME_META } from '@/lib/games-meta';
import { Sound } from '@/lib/sounds';
import { cn } from '@/lib/utils';

interface FinalCoinflipScreenProps {
  state: GameState;
  self: Player | null;
  isHost: boolean;
  onResolve: () => void;
  onLeave: () => void;
}

export function FinalCoinflipScreen({ state, self, isHost, onResolve, onLeave }: FinalCoinflipScreenProps) {
  const [flipping, setFlipping] = useState(true);
  const [landed, setLanded] = useState(false);
  const resolvedRef = useRef(false);

  const winner = state.coinflipResult;
  const loser = state.finalVoteOptions.find((g) => g !== winner);
  const winnerMeta = winner ? GAME_META[winner] : null;
  const loserMeta = loser ? GAME_META[loser] : null;

  // Play coin spin sound on mount
  useEffect(() => {
    Sound.coinSpin();
  }, []);

  // After 3s of flipping, land the coin and call onResolve (host advances after 1s)
  useEffect(() => {
    const landTimer = setTimeout(() => {
      setFlipping(false);
      setLanded(true);
      Sound.coinLand();
    }, 3000);

    const resolveTimer = setTimeout(() => {
      if (!resolvedRef.current && isHost) {
        resolvedRef.current = true;
        onResolve();
      }
    }, 4500);

    return () => {
      clearTimeout(landTimer);
      clearTimeout(resolveTimer);
    };
  }, [isHost, onResolve]);

  if (!winner || !winnerMeta || !loserMeta) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center" style={{ color: 'var(--sf-text-muted)' }}>
          Resolving coinflip...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-2xl" style={{ color: 'var(--sf-accent)' }}>
            🪙 Tie-Breaker Coinflip
          </h2>
          <p className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>
            50/50 vote — let the coin decide!
          </p>
        </div>
        <button onClick={onLeave} className="text-xs hover:text-lose transition-colors" style={{ color: 'var(--sf-text-muted)' }}>
          Leave
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {/* Status text */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {flipping ? (
            <p className="text-lg" style={{ color: 'var(--sf-text-muted)' }}>
              The vote is tied! Flipping the coin...
            </p>
          ) : (
            <motion.p
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-bold"
              style={{ color: 'var(--sf-accent)' }}
            >
              The coin has decided!
            </motion.p>
          )}
        </motion.div>

        {/* The coin */}
        <div style={{ perspective: '1200px' }}>
          <motion.div
            animate={
              flipping
                ? { rotateY: 360 * 12 }  // 12 full spins over 3s
                : { rotateY: winner === state.finalVoteOptions[0] ? 0 : 180 }
            }
            transition={{
              duration: flipping ? 3 : 0.5,
              ease: flipping ? 'easeOut' : 'easeInOut',
            }}
            className="coin-3d"
            style={{ width: '200px', height: '200px' }}
          >
            {/* Heads — first option */}
            <div
              className="coin-face"
              style={{
                background: `linear-gradient(135deg, ${winnerMeta.accent}, ${loserMeta.accent})`,
                border: `4px solid ${winnerMeta.accent}`,
                boxShadow: `0 0 30px ${winnerMeta.accent}66`,
                flexDirection: 'column',
              }}
            >
              <div className="text-6xl">{GAME_META[state.finalVoteOptions[0]].icon}</div>
              <div className="text-xs font-bold mt-1" style={{ color: 'var(--sf-bg)' }}>
                {GAME_META[state.finalVoteOptions[0]].label}
              </div>
            </div>
            {/* Tails — second option */}
            <div
              className="coin-face back"
              style={{
                background: `linear-gradient(135deg, ${loserMeta.accent}, ${winnerMeta.accent})`,
                border: `4px solid ${loserMeta.accent}`,
                boxShadow: `0 0 30px ${loserMeta.accent}66`,
                flexDirection: 'column',
              }}
            >
              <div className="text-6xl">{GAME_META[state.finalVoteOptions[1]].icon}</div>
              <div className="text-xs font-bold mt-1" style={{ color: 'var(--sf-bg)' }}>
                {GAME_META[state.finalVoteOptions[1]].label}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Both options shown for context */}
        <div className="flex gap-6 items-center">
          <div className="text-center opacity-60">
            <div className="text-4xl mb-1">{GAME_META[state.finalVoteOptions[0]].icon}</div>
            <div className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>
              {GAME_META[state.finalVoteOptions[0]].label}
            </div>
          </div>
          <div className="text-2xl" style={{ color: 'var(--sf-text-muted)' }}>vs</div>
          <div className="text-center opacity-60">
            <div className="text-4xl mb-1">{GAME_META[state.finalVoteOptions[1]].icon}</div>
            <div className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>
              {GAME_META[state.finalVoteOptions[1]].label}
            </div>
          </div>
        </div>

        {/* Result */}
        <AnimatePresenceResult landed={landed} winner={winner} winnerMeta={winnerMeta} />
      </div>
    </div>
  );
}

function AnimatePresenceResult({ landed, winner, winnerMeta }: { landed: boolean; winner: GameName; winnerMeta: typeof GAME_META[GameName] }) {
  if (!landed) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200 }}
      className={cn('panel p-6 text-center border-2')}
      style={{ borderColor: winnerMeta.accent, boxShadow: `0 0 40px ${winnerMeta.accent}66` }}
    >
      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--sf-text-muted)' }}>
        Final Round Game
      </div>
      <div className="text-7xl mb-2">{winnerMeta.icon}</div>
      <div className="font-display text-3xl mb-1" style={{ color: winnerMeta.accent }}>
        {winnerMeta.label}
      </div>
      <div className="text-sm" style={{ color: 'var(--sf-text-muted)' }}>
        {winnerMeta.description}
      </div>
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="text-xs mt-3"
        style={{ color: 'var(--sf-accent)' }}
      >
        Starting round...
      </motion.div>
    </motion.div>
  );
}
