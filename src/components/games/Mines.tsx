'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { minesMultiplier, mulberry32 } from '@/lib/utils-casino';
import { Sound } from '@/lib/sounds';
import { formatMoney } from '@/lib/utils-casino';
import { BetControls } from './BetControls';
import { cn } from '@/lib/utils';

interface MinesProps {
  balance: number;
  onBalanceChange: (n: number) => void;
  bonusMultiplier: number;
  bailoutPenalty: boolean;
  timeRemaining: number;
  seed: number;
}

interface GameState {
  status: 'idle' | 'playing' | 'won' | 'lost';
  mineCount: number;
  minePositions: Set<number>;
  revealed: Set<number>;
  bet: number;
}

const TILES = 25;

export function Mines({ balance, onBalanceChange, bonusMultiplier, timeRemaining, seed }: MinesProps) {
  const [bet, setBet] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [game, setGame] = useState<GameState>({
    status: 'idle', mineCount: 3, minePositions: new Set(), revealed: new Set(), bet: 10,
  });

  const safePicks = game.revealed.size;
  const currentMult = useMemo(
    () => minesMultiplier(safePicks, game.mineCount),
    [safePicks, game.mineCount],
  );
  const cashOutAmount = bet * currentMult * bonusMultiplier;
  const profit = cashOutAmount - bet;

  const startGame = () => {
    if (balance < bet) { Sound.error(); return; }
    if (timeRemaining <= 3) { Sound.error(); return; }
    Sound.bet();
    onBalanceChange(balance - bet);
    const rng = mulberry32((seed ^ Date.now()) >>> 0);
    const positions = new Set<number>();
    while (positions.size < mineCount) {
      positions.add(Math.floor(rng() * TILES));
    }
    setGame({
      status: 'playing',
      mineCount,
      minePositions: positions,
      revealed: new Set(),
      bet,
    });
  };

  const revealTile = (idx: number) => {
    if (game.status !== 'playing') return;
    if (game.revealed.has(idx)) return;
    const newRevealed = new Set(game.revealed);
    newRevealed.add(idx);

    if (game.minePositions.has(idx)) {
      Sound.explosion();
      setGame({ ...game, status: 'lost', revealed: newRevealed });
      setTimeout(() => {
        setGame({ status: 'idle', mineCount, minePositions: new Set(), revealed: new Set(), bet });
      }, 3000);
    } else {
      Sound.gem();
      setGame({ ...game, revealed: newRevealed });
    }
  };

  const cashOut = () => {
    if (game.status !== 'playing' || game.revealed.size === 0) return;
    onBalanceChange(balance + cashOutAmount);
    if (currentMult >= 5) Sound.winBig();
    else Sound.winSmall();
    Sound.cashRegister();
    setGame({ ...game, status: 'won' });
    setTimeout(() => {
      setGame({ status: 'idle', mineCount, minePositions: new Set(), revealed: new Set(), bet });
    }, 2500);
  };

  const tiles = Array.from({ length: TILES }, (_, i) => ({
    idx: i,
    isMine: game.minePositions.has(i),
    isRevealed: game.revealed.has(i),
  }));

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <div className="text-center">
        <h2 className="font-display text-2xl mb-1" style={{ fontWeight: 500, color: 'var(--sf-text)' }}>Mines</h2>
        <p className="text-xs" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>Reveal gems, avoid mines. More mines = bigger multipliers.</p>
      </div>

      <BetControls balance={balance} bet={bet} setBet={setBet} disabled={game.status === 'playing'} />

      {game.status === 'idle' && (
        <div className="panel p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>
            <span>Number of mines</span>
            <span className="font-mono" style={{ color: 'var(--sf-text)' }}>{mineCount}</span>
          </div>
          <input
            type="range"
            min={3}
            max={10}
            value={mineCount}
            onChange={(e) => { setMineCount(parseInt(e.target.value, 10)); Sound.hover(); }}
            className="w-full"
            style={{ accentColor: 'var(--sf-accent)' }}
          />
          <div className="text-xs text-center" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>
            Next safe pick: <span className="font-mono" style={{ color: 'var(--sf-text)' }}>{minesMultiplier(game.revealed.size + 1, mineCount).toFixed(2)}×</span>
          </div>
        </div>
      )}

      <div className="panel p-3">
        <div className="grid grid-cols-5 gap-1.5">
          {tiles.map((tile) => {
            const showMine = (tile.isMine && (tile.isRevealed || game.status === 'lost'));
            const showGem = tile.isRevealed && !tile.isMine;
            return (
              <motion.button
                key={tile.idx}
                layout
                onClick={() => revealTile(tile.idx)}
                disabled={game.status !== 'playing' || tile.isRevealed}
                whileHover={game.status === 'playing' && !tile.isRevealed ? { scale: 1.03 } : {}}
                whileTap={game.status === 'playing' && !tile.isRevealed ? { scale: 0.97 } : {}}
                className={cn(
                  'aspect-square rounded-md flex items-center justify-center text-2xl transition-colors',
                  showMine && 'shake',
                )}
                style={{
                  backgroundColor: showGem ? 'var(--sf-win)' : showMine ? 'var(--sf-lose)' : 'var(--sf-bg)',
                  border: '0.5px solid var(--sf-border)',
                  color: 'var(--sf-bg)',
                }}
              >
                <AnimatePresence mode="wait">
                  {showGem && (
                    <motion.span
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      💎
                    </motion.span>
                  )}
                  {showMine && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                    >
                      💣
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        {game.status === 'idle' && (
          <button
            onClick={startGame}
            disabled={balance < bet || timeRemaining <= 3}
            className="btn-premium flex-1 py-3"
            style={{ opacity: (balance < bet || timeRemaining <= 3) ? 0.5 : 1, cursor: (balance < bet || timeRemaining <= 3) ? 'not-allowed' : 'pointer' }}
          >
            {balance >= bet ? `Start (−${formatMoney(bet)})` : 'Not enough balance'}
          </button>
        )}
        {game.status === 'playing' && (
          <>
            <div className="panel p-3 text-center flex-1">
              <div className="text-xs" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>Current multiplier</div>
              <div className="font-display text-xl font-mono" style={{ color: 'var(--sf-text)', fontWeight: 500 }}>{currentMult.toFixed(2)}×</div>
              <div className="text-xs font-mono" style={{ color: 'var(--sf-win)', fontWeight: 400 }}>+{formatMoney(profit)}</div>
            </div>
            <button
              onClick={cashOut}
              disabled={game.revealed.size === 0}
              className="flex-1 py-3 rounded-md transition-colors"
              style={{
                backgroundColor: game.revealed.size > 0 ? 'var(--sf-win)' : 'var(--sf-border)',
                color: 'var(--sf-bg)',
                fontWeight: 400,
                cursor: game.revealed.size > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              {game.revealed.size > 0 ? `Cash out (${formatMoney(cashOutAmount)})` : 'Reveal to cash out'}
            </button>
          </>
        )}
        {game.status === 'lost' && (
          <div className="flex-1 py-3 rounded-md text-center" style={{ backgroundColor: 'var(--sf-lose)', color: 'var(--sf-bg)', fontWeight: 400 }}>
            Boom! Lost {formatMoney(bet)}
          </div>
        )}
        {game.status === 'won' && (
          <div className="flex-1 py-3 rounded-md text-center" style={{ backgroundColor: 'var(--sf-win)', color: 'var(--sf-bg)', fontWeight: 400 }}>
            Cashed out: +{formatMoney(profit)}
          </div>
        )}
      </div>
    </div>
  );
}
