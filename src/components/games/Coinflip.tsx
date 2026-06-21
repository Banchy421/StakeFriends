'use client';
import { applyWinEffects, applyLossEffects, applyJackpotMagnet, isFrozen, type PowerEffects } from '@/lib/powerEffects';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CoinSide } from '@/lib/utils-casino';
import { Sound } from '@/lib/sounds';
import { formatMoney } from '@/lib/utils-casino';
import { BetControls } from './BetControls';

interface CoinflipProps {
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

type Phase = 'idle' | 'flipping' | 'won' | 'lost';

export function Coinflip({ balance, onBalanceChange, bonusMultiplier, timeRemaining, ...powerProps }: CoinflipProps) {
  const effects: PowerEffects = powerProps;
  const [bet, setBet] = useState(10);
  const [side, setSide] = useState<CoinSide>('heads');
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<CoinSide | null>(null);
  const [flips, setFlips] = useState(0);
  const [winAmount, setWinAmount] = useState(0);
  const balanceRef = useRef(balance);
  useEffect(() => { balanceRef.current = balance; }, [balance]);

  const flip = () => {
    if (balance < bet) { Sound.error(); return; }
    if (timeRemaining <= 3) { Sound.error(); return; }
    if (isFrozen(effects)) { Sound.error(); return; }
    if (phase === 'flipping') return;
    Sound.bet();
    onBalanceChange(balanceRef.current - bet);
    setPhase('flipping');
    setResult(null);
    setWinAmount(0);
    Sound.coinSpin();
    const landed: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails';
    const spins = 8 + (landed === 'heads' ? 0 : 0.5);
    setFlips(spins);
    setTimeout(() => {
      setResult(landed);
      Sound.coinLand();
      const won = landed === side;
      if (won) {
        // Win = bet + profit (total return). balanceRef already has bet deducted.
        const baseProfit = bet * bonusMultiplier;
        const winResult = applyWinEffects(baseProfit, effects);
        const totalReturn = bet + winResult.adjustedProfit;
        setWinAmount(winResult.adjustedProfit);
        onBalanceChange(balanceRef.current + totalReturn);
        Sound.winSmall();
        setPhase('won');
      } else {
        const lossResult = applyLossEffects(bet, effects);
        const refund = bet - lossResult.adjustedLoss;
        if (refund !== 0) onBalanceChange(balanceRef.current + refund);
        Sound.lose();
        setPhase('lost');
      }
      setTimeout(() => setPhase('idle'), 2200);
    }, 2200);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <div className="text-center">
        <h2 className="font-display text-2xl mb-1" style={{ fontWeight: 500, color: 'var(--sf-text)' }}>Coin flip</h2>
        <p className="text-xs" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>Heads or tails. 1:1 payout. Pure luck.</p>
      </div>

      <BetControls balance={balance} bet={bet} setBet={setBet} disabled={phase !== 'idle'} />

      <div className="grid grid-cols-2 gap-2">
        {(['heads', 'tails'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setSide(s); Sound.click(); }}
            disabled={phase !== 'idle'}
            className="py-3 rounded-md transition-colors capitalize"
            style={{
              backgroundColor: side === s ? 'var(--sf-border)' : 'var(--sf-bg)',
              border: '0.5px solid var(--sf-border)',
              color: side === s ? 'var(--sf-text)' : 'var(--sf-text-muted)',
              fontWeight: 400,
            }}
          >
            {s === 'heads' ? '👑' : '🦅'} {s}
          </button>
        ))}
      </div>

      <div className="panel p-8 flex flex-col items-center justify-center min-h-[240px]">
        <div style={{ perspective: '1000px' }}>
          <motion.div
            animate={phase === 'flipping' ? { rotateY: 360 * flips } : { rotateY: result === 'tails' ? 180 : 0 }}
            transition={{ duration: phase === 'flipping' ? 2 : 0.3, ease: phase === 'flipping' ? 'easeOut' : 'easeInOut' }}
            className="coin-3d w-28 h-28"
          >
            <div
              className="coin-face"
              style={{
                backgroundColor: 'var(--sf-bg-secondary)',
                border: '0.5px solid var(--sf-border)',
                fontSize: '3rem',
              }}
            >
              👑
            </div>
            <div
              className="coin-face back"
              style={{
                backgroundColor: 'var(--sf-bg-secondary)',
                border: '0.5px solid var(--sf-border)',
                fontSize: '3rem',
              }}
            >
              🦅
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 text-center"
            >
              <div className="text-xs" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>Landed on</div>
              <div className="font-display text-2xl capitalize" style={{ color: 'var(--sf-text)', fontWeight: 500 }}>{result}</div>
              {phase === 'won' && (
                <div className="text-lg font-mono mt-1" style={{ color: 'var(--sf-win)', fontWeight: 400 }}>+{formatMoney(winAmount)}</div>
              )}
              {phase === 'lost' && (
                <div className="text-lg font-mono mt-1" style={{ color: 'var(--sf-lose)', fontWeight: 400 }}>−{formatMoney(bet)}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'idle' && (
          <div className="text-sm mt-5" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>Pick a side, then flip</div>
        )}
      </div>

      <button
        onClick={flip}
        disabled={balance < bet || phase !== 'idle' || timeRemaining <= 3}
        className="btn-premium py-3"
        style={{
          opacity: (balance < bet || phase !== 'idle' || timeRemaining <= 3) ? 0.5 : 1,
          cursor: (balance < bet || phase !== 'idle' || timeRemaining <= 3) ? 'not-allowed' : 'pointer',
        }}
      >
        {phase === 'flipping' ? 'Flipping...' : balance >= bet ? `Flip (−${formatMoney(bet)})` : 'Not enough balance'}
      </button>
    </div>
  );
}
