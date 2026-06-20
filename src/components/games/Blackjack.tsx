'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { freshDeck, handValue, isBlackjack, type Card } from '@/lib/utils-casino';
import { Sound } from '@/lib/sounds';
import { formatMoney } from '@/lib/utils-casino';
import { BetControls } from './BetControls';
import { cn } from '@/lib/utils';

interface BlackjackProps {
  balance: number;
  onBalanceChange: (n: number) => void;
  bonusMultiplier: number;
  bailoutPenalty: boolean;
  timeRemaining: number;
  seed: number;
}

type Phase = 'idle' | 'dealing' | 'player' | 'dealer' | 'done';
type Result = 'win' | 'lose' | 'push' | 'blackjack' | null;

export function Blackjack({ balance, onBalanceChange, bonusMultiplier, timeRemaining, seed }: BlackjackProps) {
  const [bet, setBet] = useState(10);
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<Result>(null);
  const [winAmount, setWinAmount] = useState(0);
  const deckIndexRef = useRef(0);

  const dealCard = (): Card => {
    if (deckIndexRef.current >= deck.length) {
      const newDeck = freshDeck((seed ^ Date.now()) >>> 0);
      setDeck(newDeck);
      deckIndexRef.current = 1;
      return newDeck[0];
    }
    return deck[deckIndexRef.current++];
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const startHand = async () => {
    if (balance < bet) { Sound.error(); return; }
    if (timeRemaining <= 3) { Sound.error(); return; }
    Sound.bet();
    onBalanceChange(balance - bet);
    setResult(null);
    setWinAmount(0);
    const newDeck = freshDeck((seed ^ Date.now()) >>> 0);
    setDeck(newDeck);
    deckIndexRef.current = 0;
    setPhase('dealing');
    const p: Card[] = [];
    const d: Card[] = [];
    await sleep(200); p.push({ ...newDeck[deckIndexRef.current++], faceUp: true }); setPlayerHand([...p]); Sound.cardDeal();
    await sleep(400); d.push({ ...newDeck[deckIndexRef.current++], faceUp: true }); setDealerHand([...d]); Sound.cardDeal();
    await sleep(400); p.push({ ...newDeck[deckIndexRef.current++], faceUp: true }); setPlayerHand([...p]); Sound.cardDeal();
    await sleep(400); d.push({ ...newDeck[deckIndexRef.current++], faceUp: false }); setDealerHand([...d]); Sound.cardDeal();
    const playerBJ = isBlackjack(p);
    const dealerBJ = isBlackjack(d);
    if (playerBJ || dealerBJ) {
      await sleep(300);
      d[1].faceUp = true;
      setDealerHand([...d]);
      Sound.cardFlip();
      await sleep(600);
      if (playerBJ && dealerBJ) { finishHand('push', bet); }
      else if (playerBJ) { finishHand('blackjack', bet * 1.5 * bonusMultiplier); }
      else { finishHand('lose', 0); }
      return;
    }
    setPhase('player');
  };

  const hit = async () => {
    if (phase !== 'player') return;
    Sound.cardDeal();
    const card = { ...deck[deckIndexRef.current++], faceUp: true };
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    const v = handValue(newHand).total;
    if (v > 21) {
      await sleep(400);
      const d = [...dealerHand];
      d[1].faceUp = true;
      setDealerHand(d);
      Sound.cardFlip();
      await sleep(500);
      finishHand('lose', 0);
    } else if (v === 21) {
      await sleep(300);
      stand();
    }
  };

  const stand = async () => {
    if (phase !== 'player') return;
    setPhase('dealer');
    const d = [...dealerHand];
    d[1].faceUp = true;
    setDealerHand(d);
    Sound.cardFlip();
    await sleep(700);
    let cur = d;
    while (handValue(cur).total < 17) {
      await sleep(700);
      const card = { ...deck[deckIndexRef.current++], faceUp: true };
      Sound.cardDeal();
      cur = [...cur, card];
      setDealerHand([...cur]);
    }
    await sleep(500);
    const playerTotal = handValue(playerHand).total;
    const dealerTotal = handValue(cur).total;
    if (dealerTotal > 21 || playerTotal > dealerTotal) { finishHand('win', bet * bonusMultiplier); }
    else if (playerTotal < dealerTotal) { finishHand('lose', 0); }
    else { finishHand('push', bet); }
  };

  const doubleDown = async () => {
    if (phase !== 'player') return;
    if (playerHand.length !== 2) return;
    if (balance < bet) { Sound.error(); return; }
    Sound.bet();
    onBalanceChange(balance - bet);
    const doubledBet = bet * 2;
    setBet(doubledBet);
    Sound.cardDeal();
    const card = { ...deck[deckIndexRef.current++], faceUp: true };
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    await sleep(500);
    const v = handValue(newHand).total;
    if (v > 21) {
      const d = [...dealerHand];
      d[1].faceUp = true;
      setDealerHand(d);
      Sound.cardFlip();
      await sleep(500);
      finishHand('lose', 0);
      setBet(bet);
    } else {
      setPhase('dealer');
      const d = [...dealerHand];
      d[1].faceUp = true;
      setDealerHand(d);
      Sound.cardFlip();
      await sleep(700);
      let cur = d;
      while (handValue(cur).total < 17) {
        await sleep(700);
        const c = { ...deck[deckIndexRef.current++], faceUp: true };
        Sound.cardDeal();
        cur = [...cur, c];
        setDealerHand([...cur]);
      }
      await sleep(500);
      const playerTotal = handValue(newHand).total;
      const dealerTotal = handValue(cur).total;
      if (dealerTotal > 21 || playerTotal > dealerTotal) { finishHand('win', doubledBet * bonusMultiplier); }
      else if (playerTotal < dealerTotal) { finishHand('lose', 0); }
      else { finishHand('push', doubledBet); }
      setBet(bet);
    }
  };

  const finishHand = (res: Result, win: number) => {
    setResult(res);
    setWinAmount(win);
    if (win > 0) {
      onBalanceChange(balance + win);
      if (res === 'blackjack') Sound.winBig();
      else Sound.chipClink();
    } else if (res === 'lose') {
      Sound.lose();
    }
    setPhase('done');
    setTimeout(() => {
      setPlayerHand([]);
      setDealerHand([]);
      setResult(null);
      setWinAmount(0);
      setPhase('idle');
    }, 3000);
  };

  const playerTotal = handValue(playerHand).total;
  const dealerTotal = handValue(dealerHand.filter((c) => c.faceUp)).total;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <div className="text-center">
        <h2 className="font-display text-2xl mb-1" style={{ fontWeight: 500, color: 'var(--sf-text)' }}>Blackjack</h2>
        <p className="text-xs" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>Beat the dealer to 21. Blackjack pays 3:2.</p>
      </div>

      <BetControls balance={balance} bet={bet} setBet={setBet} disabled={phase !== 'idle'} />

      <div className="panel p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>Dealer</span>
          {dealerHand.length > 0 && (
            <span className="font-mono text-sm" style={{ color: 'var(--sf-text)', fontWeight: 400 }}>
              {dealerHand.some((c) => !c.faceUp) ? `${dealerTotal}+?` : dealerTotal}
            </span>
          )}
        </div>
        <div className="flex gap-2 min-h-[100px] items-center">
          <AnimatePresence>
            {dealerHand.map((card, i) => (
              <CardView key={i} card={card} delay={i * 0.4} />
            ))}
            {dealerHand.length === 0 && (
              <div className="text-sm" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>Awaiting deal...</div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="panel p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>You</span>
          {playerHand.length > 0 && (
            <span className="font-mono text-sm" style={{
              color: playerTotal > 21 ? 'var(--sf-lose)' : playerTotal === 21 ? 'var(--sf-win)' : 'var(--sf-text)',
              fontWeight: 400,
            }}>
              {playerTotal}{playerTotal > 21 ? ' bust' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-2 min-h-[100px] items-center">
          <AnimatePresence>
            {playerHand.map((card, i) => (
              <CardView key={i} card={card} delay={i * 0.4} />
            ))}
            {playerHand.length === 0 && (
              <div className="text-sm" style={{ color: 'var(--sf-text-muted)', fontWeight: 400 }}>Place your bet and deal</div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center font-display text-xl py-2"
            style={{
              color: result === 'win' || result === 'blackjack' ? 'var(--sf-win)' : result === 'lose' ? 'var(--sf-lose)' : 'var(--sf-text-muted)',
              fontWeight: 500,
            }}
          >
            {result === 'win' && `Win +${formatMoney(winAmount - bet)}`}
            {result === 'blackjack' && `Blackjack +${formatMoney(winAmount - bet)}`}
            {result === 'lose' && `Lost −${formatMoney(bet)}`}
            {result === 'push' && 'Push — bet returned'}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        {phase === 'idle' && (
          <button
            onClick={startHand}
            disabled={balance < bet || timeRemaining <= 3}
            className="btn-premium flex-1 py-3"
            style={{ opacity: (balance < bet || timeRemaining <= 3) ? 0.5 : 1, cursor: (balance < bet || timeRemaining <= 3) ? 'not-allowed' : 'pointer' }}
          >
            {balance >= bet ? `Deal (−${formatMoney(bet)})` : 'Not enough balance'}
          </button>
        )}
        {phase === 'player' && (
          <>
            <button onClick={hit} className="btn-premium flex-1 py-3">Hit</button>
            <button
              onClick={stand}
              className="flex-1 py-3 rounded-md transition-colors"
              style={{ backgroundColor: 'var(--sf-win)', color: 'var(--sf-bg)', fontWeight: 400 }}
            >
              Stand
            </button>
            <button
              onClick={doubleDown}
              disabled={playerHand.length !== 2 || balance < bet}
              className="flex-1 py-3 rounded-md border transition-colors"
              style={{
                backgroundColor: 'var(--sf-bg)',
                borderColor: 'var(--sf-border)',
                color: 'var(--sf-text)',
                fontWeight: 400,
                cursor: (playerHand.length !== 2 || balance < bet) ? 'not-allowed' : 'pointer',
                opacity: (playerHand.length !== 2 || balance < bet) ? 0.4 : 1,
              }}
            >
              Double
            </button>
          </>
        )}
        {(phase === 'dealing' || phase === 'dealer') && (
          <div className="flex-1 py-3 rounded-md text-center" style={{ backgroundColor: 'var(--sf-bg-secondary)', border: '0.5px solid var(--sf-border)', color: 'var(--sf-text-muted)', fontWeight: 400 }}>
            {phase === 'dealing' ? 'Dealing...' : 'Dealer playing...'}
          </div>
        )}
      </div>
    </div>
  );
}

function CardView({ card, delay = 0 }: { card: Card; delay?: number }) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      className="w-14 h-20 rounded-md flex flex-col items-center justify-center"
      style={{
        backgroundColor: card.faceUp ? 'var(--sf-bg)' : 'var(--sf-bg-secondary)',
        border: '0.5px solid var(--sf-border)',
      }}
    >
      {card.faceUp ? (
        <>
          <div className="text-xl" style={{ color: isRed ? 'var(--sf-lose)' : 'var(--sf-text)', fontWeight: 500 }}>
            {card.rank}
          </div>
          <div className="text-xl" style={{ color: isRed ? 'var(--sf-lose)' : 'var(--sf-text)' }}>
            {card.suit}
          </div>
        </>
      ) : (
        <div className="w-full h-full rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--sf-bg-secondary)' }}>
          <span style={{ color: 'var(--sf-text-muted)' }}>♠</span>
        </div>
      )}
    </motion.div>
  );
}
