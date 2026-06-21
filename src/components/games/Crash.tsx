'use client';
import { applyWinEffects, applyLossEffects, applyJackpotMagnet, isFrozen, type PowerEffects } from '@/lib/powerEffects';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { crashPointsForRound } from '@/lib/utils-casino';
import { Sound } from '@/lib/sounds';
import { formatMoney } from '@/lib/utils-casino';
import { BetControls } from './BetControls';
import { cn } from '@/lib/utils';

interface CrashProps {
  balance: number;
  onBalanceChange: (n: number) => void;
  bonusMultiplier: number;
  bailoutPenalty: boolean;
  timeRemaining: number;
  seed: number;
  insured: boolean;
  doubleOrNothing: boolean;
  goldRushActive: boolean;
  jackpotMagnet: boolean;
  cursed: boolean;
  frozen: boolean;
}

type Phase = 'idle' | 'running' | 'crashed' | 'cashed';

export function Crash({ balance, onBalanceChange, bonusMultiplier, timeRemaining, seed, ...powerProps }: CrashProps) {
  const effects: PowerEffects = powerProps;
  const [bet, setBet] = useState(10);
  const [phase, setPhase] = useState<Phase>('idle');
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [crashIndex, setCrashIndex] = useState(0);
  const [cashedAt, setCashedAt] = useState(0);
  const [winAmount, setWinAmount] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<Phase>('idle');
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const cashedRef = useRef(false);
  const balanceRef = useRef(balance);
  useEffect(() => { balanceRef.current = balance; }, [balance]);

  const crashPoints = useRef<number[]>(crashPointsForRound(seed, 10));

  const startRound = () => {
    if (isFrozen(effects)) { Sound.error(); return; }
    if (balanceRef.current < bet) { Sound.error(); return; }
    if (timeRemaining <= 3) { Sound.error(); return; }
    Sound.bet();
    onBalanceChange(balanceRef.current - bet);
    const idx = crashIndex % crashPoints.current.length;
    const point = crashPoints.current[idx];
    setCrashPoint(point);
    setCrashIndex(idx + 1);
    setMultiplier(1.0);
    setCashedAt(0);
    setWinAmount(0);
    cashedRef.current = false;
    setPhase('running');
    startTimeRef.current = performance.now();
    Sound.reelSpin();
  };

  useEffect(() => {
    if (phase !== 'running') return;
    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const k = 0.18;
      const m = Math.pow(Math.E, k * elapsed);
      if (m >= crashPoint) {
        setMultiplier(crashPoint);
        setPhase('crashed');
        Sound.crashBoom();
        setHistory((h) => [crashPoint, ...h].slice(0, 8));
        setTimeout(() => setPhase('idle'), 2500);
        return;
      }
      setMultiplier(m);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, crashPoint]);

  const cashOut = () => {
    if (phase !== 'running' || cashedRef.current) return;
    cashedRef.current = true;
    const baseReturn = bet * multiplier * bonusMultiplier;
    const baseProfit = baseReturn - bet;
    const winResult = applyWinEffects(baseProfit, effects);
    setCashedAt(multiplier);
    setWinAmount(winResult.adjustedProfit);
    onBalanceChange(balanceRef.current + bet + winResult.adjustedProfit);
    Sound.cashRegister();
    if (multiplier >= 3) Sound.winBig();
    else Sound.winSmall();
    setPhase('cashed');
    setHistory((h) => [multiplier, ...h].slice(0, 8));
    setTimeout(() => setPhase('idle'), 2500);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <div className="text-center">
        <h2 className="font-display text-2xl mb-1" style={{ fontWeight: 500, color: 'var(--sf-text)' }}>Crash</h2>
        <p className="text-xs" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>Cash out before the rocket crashes.</p>
      </div>

      <BetControls balance={balance} bet={bet} setBet={setBet} disabled={phase === 'running'} />

      {history.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto casino-scroll">
          {history.map((h, i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 rounded font-mono flex-shrink-0"
              style={{
                backgroundColor: h >= 2 ? 'var(--sf-border)' : 'var(--sf-bg)',
                border: '0.5px solid var(--sf-border)',
                color: h >= 2 ? 'var(--sf-win)' : 'var(--sf-lose)',
                fontWeight: 400,
              }}
            >
              {h.toFixed(2)}×
            </span>
          ))}
        </div>
      )}

      <div
        className={cn('panel p-6 h-56 flex items-center justify-center relative overflow-hidden',
          phase === 'crashed' && 'flash-lose',
          phase === 'cashed' && 'flash-win',
        )}
      >
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          {phase === 'running' || phase === 'cashed' ? (
            <>
              <motion.path
                d={`M 0 100 Q ${50} ${100 - Math.min(95, (multiplier - 1) * 30)}, ${Math.min(95, (multiplier - 1) * 50)} ${100 - Math.min(95, (multiplier - 1) * 30)}`}
                stroke={phase === 'cashed' ? 'var(--sf-win)' : 'var(--sf-accent)'}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </>
          ) : null}
        </svg>

        <div className="relative z-10 text-center">
          {phase === 'crashed' ? (
            <>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-sm mb-1"
                style={{ color: 'var(--sf-lose)', fontWeight: 400 }}
              >
                Crashed
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5 }}
                className="font-display font-mono text-5xl"
                style={{ color: 'var(--sf-lose)', fontWeight: 500 }}
              >
                {crashPoint.toFixed(2)}×
              </motion.div>
            </>
          ) : (
            <motion.div
              animate={phase === 'running' ? { scale: [1, 1.03, 1] } : {}}
              transition={{ duration: 0.5, repeat: phase === 'running' ? Infinity : 0 }}
              className="font-display font-mono text-6xl"
              style={{
                color: phase === 'cashed' ? 'var(--sf-win)' : 'var(--sf-text)',
                fontWeight: 500,
              }}
            >
              {multiplier.toFixed(2)}×
            </motion.div>
          )}
          {phase === 'idle' && (
            <div className="text-sm mt-2" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>Place a bet to launch</div>
          )}
          {phase === 'cashed' && (
            <div className="text-lg mt-2 font-mono" style={{ color: 'var(--sf-win)', fontWeight: 400 }}>+{formatMoney(winAmount)}</div>
          )}
        </div>
      </div>

      <button
        onClick={phase === 'running' ? cashOut : startRound}
        disabled={
          (phase === 'idle' && (balance < bet || timeRemaining <= 3)) ||
          (phase === 'cashed' || phase === 'crashed')
        }
        className="py-3 rounded-md transition-colors"
        style={{
          backgroundColor: phase === 'running' ? 'var(--sf-win)' : (phase === 'idle' && balance >= bet && timeRemaining > 3) ? 'var(--sf-accent)' : 'var(--sf-border)',
          color: 'var(--sf-text)',
          fontWeight: 400,
          cursor: ((phase === 'idle' && (balance < bet || timeRemaining <= 3)) || phase === 'cashed' || phase === 'crashed') ? 'not-allowed' : 'pointer',
        }}
      >
        {phase === 'running'
          ? `Cash out (${formatMoney(bet * multiplier * bonusMultiplier)})`
          : phase === 'cashed' || phase === 'crashed'
            ? '...'
            : balance >= bet ? `Launch (−${formatMoney(bet)})` : 'Not enough balance'
        }
      </button>
    </div>
  );
}
