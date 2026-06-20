'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sound } from '@/lib/sounds';
import { formatMoney } from '@/lib/utils-casino';
import { BetControls } from './BetControls';
import { cn } from '@/lib/utils';

interface TowerProps {
  balance: number;
  onBalanceChange: (n: number) => void;
  bonusMultiplier: number;
  bailoutPenalty: boolean;
  timeRemaining: number;
  seed: number;
}

type GameState = 'idle' | 'playing' | 'busted' | 'cashed';

interface LevelData {
  multiplier: number;
  bombIndex: number;       // 0, 1, or 2 — which button is the bomb
  pickedIndex: number | null;
  bombChance: number;      // for display
}

/**
 * Compute the multiplier for a given level (0-indexed).
 * Starts at 1.15x and grows ~1.3x per level, tapering slightly at high levels.
 */
function multiplierForLevel(level: number): number {
  if (level <= 0) return 1.15;
  let m = 1.15;
  for (let i = 1; i <= level; i++) {
    const growth = i < 5 ? 1.35 : i < 10 ? 1.22 : i < 15 ? 1.15 : 1.10;
    m *= growth;
  }
  return Math.round(m * 100) / 100;
}

/**
 * Compute bomb chance for a given level (0-indexed).
 * Starts at 33% (1 in 3) and increases ~3% per level, capped at 85%.
 */
function bombChanceForLevel(level: number): number {
  return Math.min(0.85, 0.33 + level * 0.03);
}

export function Tower({ balance, onBalanceChange, bonusMultiplier, timeRemaining }: TowerProps) {
  const [bet, setBet] = useState(10);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [levels, setLevels] = useState<LevelData[]>([]);
  const [winAmount, setWinAmount] = useState(0);
  const [shakingButton, setShakingButton] = useState<number | null>(null);
  const levelsRef = useRef<LevelData[]>([]);
  levelsRef.current = levels;

  const canPlay = balance >= bet && gameState === 'idle' && timeRemaining > 3;

  const startGame = () => {
    if (!canPlay) { Sound.error(); return; }
    Sound.bet();
    onBalanceChange(balance - bet);
    setCurrentLevel(0);
    setLevels([]);
    setWinAmount(0);
    setGameState('playing');
    // Generate first level
    generateNextLevel(0);
  };

  const generateNextLevel = (level: number) => {
    const bombChance = bombChanceForLevel(level);
    // Determine if this level has a bomb based on the chance
    const hasBomb = Math.random() < bombChance;
    const bombIndex = hasBomb ? Math.floor(Math.random() * 3) : -1;
    // If no bomb (lucky level), pick a random "decoy" bomb position that's actually safe
    // — but we still need 3 buttons. For non-bomb levels, all 3 are safe (rare bonus).
    const newLevel: LevelData = {
      multiplier: multiplierForLevel(level),
      bombIndex,
      pickedIndex: null,
      bombChance,
    };
    setLevels((prev) => {
      const next = [...prev];
      next[level] = newLevel;
      return next;
    });
  };

  const pickButton = (buttonIndex: number) => {
    if (gameState !== 'playing') return;
    const level = levelsRef.current[currentLevel];
    if (!level || level.pickedIndex !== null) return;

    // Mark picked
    setLevels((prev) => {
      const next = [...prev];
      if (next[currentLevel]) {
        next[currentLevel] = { ...next[currentLevel], pickedIndex: buttonIndex };
      }
      return next;
    });

    if (buttonIndex === level.bombIndex) {
      // BUST!
      setShakingButton(buttonIndex);
      Sound.explosion();
      setGameState('busted');
      setTimeout(() => {
        setShakingButton(null);
        setGameState('idle');
        setCurrentLevel(0);
        setLevels([]);
      }, 2500);
    } else {
      // Safe! Advance to next level
      Sound.gem();
      Sound.towerClimb();
      const nextLevel = currentLevel + 1;
      setCurrentLevel(nextLevel);
      generateNextLevel(nextLevel);
    }
  };

  const cashOut = () => {
    if (gameState !== 'playing' || currentLevel === 0) return;
    // Cash out at the PREVIOUS level's multiplier (the last safe pick)
    const lastSafeLevel = currentLevel - 1;
    const mult = multiplierForLevel(lastSafeLevel);
    const win = bet * mult * bonusMultiplier;
    setWinAmount(win);
    onBalanceChange(balance + win);
    Sound.cashRegister();
    if (mult >= 5) Sound.winBig();
    else Sound.winSmall();
    setGameState('cashed');
    setTimeout(() => {
      setGameState('idle');
      setCurrentLevel(0);
      setLevels([]);
      setWinAmount(0);
    }, 2500);
  };

  const currentMult = multiplierForLevel(currentLevel - 1);
  const nextMult = multiplierForLevel(currentLevel);
  const cashOutAmount = currentLevel > 0 ? bet * currentMult * bonusMultiplier : 0;
  const profit = cashOutAmount - bet;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <div className="text-center">
        <h2 className="font-display text-3xl text-gold mb-1">🗼 Tower</h2>
        <p className="text-xs text-muted-foreground">Pick a safe button. Avoid the bomb. Climb forever for higher multipliers.</p>
      </div>

      <BetControls balance={balance} bet={bet} setBet={setBet} disabled={gameState !== 'idle'} />

      {/* Stats bar */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-3 gap-2">
          <div className="panel p-2 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Level</div>
            <div className="font-display text-xl text-gold">{currentLevel}</div>
          </div>
          <div className="panel p-2 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Current</div>
            <div className="font-display text-xl text-win">{currentMult.toFixed(2)}×</div>
          </div>
          <div className="panel p-2 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Next</div>
            <div className="font-display text-xl text-gold">{nextMult.toFixed(2)}×</div>
          </div>
        </div>
      )}

      {/* Tower visualization — show last 5 levels, current level at bottom */}
      <div className="panel p-4 flex flex-col gap-2 max-h-[360px] overflow-y-auto casino-scroll">
        {gameState === 'idle' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-3">🗼</div>
            <div className="text-muted-foreground text-sm">Place a bet and start climbing</div>
            <div className="text-xs text-muted-foreground mt-2">
              3 buttons per level · 1 is a bomb · 2 are safe
            </div>
          </div>
        )}

        {gameState !== 'idle' && (
          <>
            {/* Show recent completed levels (top, compressed) */}
            {levels.slice(Math.max(0, currentLevel - 4), currentLevel).map((lvl, i) => {
              const actualLevel = Math.max(0, currentLevel - 4) + i;
              return (
                <div key={`done-${actualLevel}}`} className="flex items-center gap-2 opacity-50">
                  <div className="w-10 text-xs text-muted-foreground text-right">L{actualLevel + 1}</div>
                  <div className="flex-1 flex gap-1">
                    {[0, 1, 2].map((bi) => (
                      <div
                        key={bi}
                        className={cn(
                          'flex-1 h-8 rounded flex items-center justify-center text-sm',
                          bi === lvl.pickedIndex && bi !== lvl.bombIndex && 'bg-win bg-opacity-20 text-win',
                          bi === lvl.pickedIndex && bi === lvl.bombIndex && 'bg-lose bg-opacity-20',
                          bi !== lvl.pickedIndex && 'bg-[#0a0a0a] border border-[#1a1a1a]',
                        )}
                      >
                        {bi === lvl.pickedIndex && bi !== lvl.bombIndex && '✓'}
                      </div>
                    ))}
                  </div>
                  <div className="w-14 text-xs text-gold font-mono text-right">{lvl.multiplier.toFixed(2)}×</div>
                </div>
              );
            })}

            {/* Current level — the 3 buttons */}
            {levels[currentLevel] && gameState === 'playing' && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2"
              >
                <div className="w-10 text-xs text-gold text-right font-bold">L{currentLevel + 1}</div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((bi) => {
                    const lvl = levels[currentLevel];
                    const isPicked = lvl.pickedIndex === bi;
                    const isBomb = lvl.bombIndex === bi;
                    const isShaking = shakingButton === bi;
                    return (
                      <motion.button
                        key={bi}
                        onClick={() => pickButton(bi)}
                        disabled={lvl.pickedIndex !== null}
                        whileHover={!isPicked ? { scale: 1.05, y: -2 } : {}}
                        whileTap={!isPicked ? { scale: 0.95 } : {}}
                        animate={isShaking ? { x: [-8, 8, -8, 8, 0] } : {}}
                        transition={isShaking ? { duration: 0.4 } : {}}
                        className={cn(
                          'h-14 rounded-md font-bold text-lg border-2 transition-all',
                          !isPicked && 'bg-[#0a0a0a] border-[#2a2a2a] hover:border-gold text-gold',
                          isPicked && !isBomb && 'bg-win border-win text-white',
                          isPicked && isBomb && 'bg-lose border-lose text-white',
                        )}
                      >
                        {!isPicked && '?'}
                        {isPicked && !isBomb && '💎'}
                        {isPicked && isBomb && '💣'}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="w-14 text-xs text-gold font-mono text-right font-bold">
                  {levels[currentLevel].multiplier.toFixed(2)}×
                </div>
              </motion.div>
            )}

            {/* Bomb chance indicator */}
            {gameState === 'playing' && levels[currentLevel] && (
              <div className="text-center text-xs text-muted-foreground mt-1">
                Bomb chance: <span className="text-lose font-mono">{Math.round(levels[currentLevel].bombChance * 100)}%</span>
              </div>
            )}

            {/* Bust / cashed messages */}
            {gameState === 'busted' && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-4"
              >
                <div className="text-5xl mb-2">💥</div>
                <div className="font-display text-2xl text-lose font-bold">BUSTED!</div>
                <div className="text-sm text-muted-foreground mt-1">Lost {formatMoney(bet)}</div>
              </motion.div>
            )}
            {gameState === 'cashed' && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-4"
              >
                <div className="text-5xl mb-2">💰</div>
                <div className="font-display text-2xl text-win font-bold">CASHED OUT!</div>
                <div className="text-sm text-win mt-1">+{formatMoney(profit)}</div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {gameState === 'idle' && (
          <button
            onClick={startGame}
            disabled={!canPlay}
            onMouseEnter={() => Sound.hover()}
            className={cn(
              'flex-1 py-3 rounded-md font-bold transition-all',
              canPlay ? 'bg-gold hover:bg-gold-dark text-black glow-gold' : 'bg-[#2a2a2a] text-muted-foreground cursor-not-allowed',
            )}
          >
            {balance >= bet ? `Climb (−${formatMoney(bet)})` : 'Not enough balance'}
          </button>
        )}
        {gameState === 'playing' && (
          <button
            onClick={cashOut}
            disabled={currentLevel === 0}
            onMouseEnter={() => Sound.hover()}
            className={cn(
              'flex-1 py-3 rounded-md font-bold transition-all',
              currentLevel > 0
                ? 'bg-win hover:bg-green-700 text-white glow-win'
                : 'bg-[#2a2a2a] text-muted-foreground cursor-not-allowed',
            )}
          >
            {currentLevel > 0
              ? `Cash Out (${formatMoney(cashOutAmount)})`
              : 'Pick a button to climb'
            }
          </button>
        )}
        {(gameState === 'busted' || gameState === 'cashed') && (
          <div className={cn(
            'flex-1 py-3 rounded-md font-bold text-center',
            gameState === 'busted' ? 'bg-lose text-white' : 'bg-win text-white',
          )}>
            {gameState === 'busted' ? '💥 Busted!' : `💰 +${formatMoney(profit)}`}
          </div>
        )}
      </div>
    </div>
  );
}
