'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SLOTS_SYMBOLS, slotsPayout } from '@/lib/utils-casino';
import { Sound } from '@/lib/sounds';
import { formatMoney } from '@/lib/utils-casino';
import { BetControls } from './BetControls';
import { cn } from '@/lib/utils';

interface SlotsProps {
  balance: number;
  onBalanceChange: (n: number) => void;
  bonusMultiplier: number;
  bailoutPenalty: boolean;
  timeRemaining: number;
  seed: number;
}

type SpinState = 'idle' | 'spinning' | 'evaluating' | 'won' | 'lost';

export function Slots({ balance, onBalanceChange, bonusMultiplier, timeRemaining }: SlotsProps) {
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState<string[]>(['🍒', '🍋', '🍊']);
  const [reelStates, setReelStates] = useState<('idle' | 'spinning' | 'stopped')[]>(['idle', 'idle', 'idle']);
  const [spinState, setSpinState] = useState<SpinState>('idle');
  const [lastWin, setLastWin] = useState(0);
  const [lastPayout, setLastPayout] = useState(0);
  const spinIntervals = useRef<ReturnType<typeof setInterval>[]>([]);
  const balanceRef = useRef(balance);
  useEffect(() => { balanceRef.current = balance; }, [balance]);

  const stopAllIntervals = () => {
    spinIntervals.current.forEach(clearInterval);
    spinIntervals.current = [];
  };

  useEffect(() => () => stopAllIntervals(), []);

  const spin = async () => {
    if (balanceRef.current < bet) { Sound.error(); return; }
    if (timeRemaining <= 3) { Sound.error(); return; }
    if (spinState === 'spinning') return;
    stopAllIntervals();

    Sound.bet();
    onBalanceChange(balanceRef.current - bet);
    setSpinState('spinning');
    setReelStates(['spinning', 'spinning', 'spinning']);
    setLastWin(0);
    setLastPayout(0);
    Sound.reelSpin();

    const final = [
      SLOTS_SYMBOLS[Math.floor(Math.random() * SLOTS_SYMBOLS.length)],
      SLOTS_SYMBOLS[Math.floor(Math.random() * SLOTS_SYMBOLS.length)],
      SLOTS_SYMBOLS[Math.floor(Math.random() * SLOTS_SYMBOLS.length)],
    ];

    const intervals: ReturnType<typeof setInterval>[] = [];
    for (let i = 0; i < 3; i++) {
      const id = setInterval(() => {
        setReels((prev) => {
          const next = [...prev];
          next[i] = SLOTS_SYMBOLS[Math.floor(Math.random() * SLOTS_SYMBOLS.length)];
          return next;
        });
      }, 80);
      intervals.push(id);
    }
    spinIntervals.current = intervals;

    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      clearInterval(intervals[i]);
      setReels((prev) => {
        const next = [...prev];
        next[i] = final[i];
        return next;
      });
      setReelStates((prev) => {
        const next = [...prev];
        next[i] = 'stopped';
        return next;
      });
      Sound.reelStop();
    }

    setSpinState('evaluating');
    const payout = slotsPayout(final);
    const totalReturn = bet * payout * bonusMultiplier;
    const profit = totalReturn - bet;
    await new Promise((r) => setTimeout(r, 400));
    setLastPayout(payout);
    setLastWin(profit);
    if (payout > 0) {
      onBalanceChange(balanceRef.current + totalReturn);
      if (payout >= 5) Sound.winBig();
      else Sound.winSmall();
      setSpinState('won');
    } else {
      Sound.lose();
      setSpinState('lost');
    }
    setTimeout(() => setSpinState('idle'), 1800);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <div className="text-center">
        <h2 className="font-display text-2xl mb-1" style={{ fontWeight: 500, color: 'var(--sf-text)' }}>Slots</h2>
        <p className="text-xs" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>Spin 3 reels. Match symbols for up to 10×.</p>
      </div>

      <BetControls balance={balance} bet={bet} setBet={setBet} disabled={spinState === 'spinning'} />

      <div className="panel p-5">
        <div className="flex justify-center gap-3 mb-3">
          {reels.map((sym, i) => {
            const isSpinning = reelStates[i] === 'spinning';
            const isStopped = reelStates[i] === 'stopped';
            return (
              <div
                key={i}
                className={cn(
                  'w-24 h-32 md:w-28 md:h-36 rounded-md flex items-center justify-center text-6xl transition-colors',
                  isSpinning && 'reel-spinning',
                )}
                style={{
                  backgroundColor: isStopped ? 'var(--sf-border)' : 'var(--sf-bg)',
                  border: '0.5px solid var(--sf-border)',
                }}
              >
                {sym}
              </div>
            );
          })}
        </div>
        <div className="text-center text-xs grid grid-cols-3 gap-1" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>
          <span>7️⃣7️⃣7️⃣ = 10×</span>
          <span>💎💎💎 = 7×</span>
          <span>⭐⭐⭐ = 5×</span>
          <span>🍊🍊🍊 = 3×</span>
          <span>🍋🍋🍋 = 2×</span>
          <span>🍒🍒🍒 = 1.5×</span>
        </div>
      </div>

      <AnimatePresence>
        {lastPayout > 0 && spinState === 'won' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center font-display text-2xl py-2 font-mono"
            style={{ color: lastPayout >= 5 ? 'var(--sf-accent)' : 'var(--sf-win)', fontWeight: 500 }}
          >
            {lastPayout}× — +{formatMoney(lastWin)}
          </motion.div>
        )}
        {spinState === 'lost' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm py-2"
            style={{ color: 'var(--sf-lose)', fontWeight: 400 }}
          >
            No match. Try again!
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={spin}
        disabled={balance < bet || spinState === 'spinning' || timeRemaining <= 3}
        className="btn-premium py-3"
        style={{
          cursor: (balance < bet || spinState === 'spinning' || timeRemaining <= 3) ? 'not-allowed' : 'pointer',
          opacity: (balance < bet || spinState === 'spinning' || timeRemaining <= 3) ? 0.5 : 1,
        }}
      >
        {spinState === 'spinning' ? 'Spinning...' : balance >= bet ? `Spin (−${formatMoney(bet)})` : 'Not enough balance'}
      </button>
    </div>
  );
}
