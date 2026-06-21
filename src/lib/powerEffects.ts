// Power effect helpers for game components.
// These functions apply/consume power effects on wins and losses.

export interface PowerEffects {
  insured: boolean;
  doubleOrNothing: boolean;
  goldRushActive: boolean;
  jackpotMagnet: boolean;
  cursed: boolean;
  frozen: boolean;
}

export const NO_EFFECTS: PowerEffects = {
  insured: false,
  doubleOrNothing: false,
  goldRushActive: false,
  jackpotMagnet: false,
  cursed: false,
  frozen: false,
};

/**
 * Apply power effects to a WIN.
 * Returns the adjusted profit and which effects were consumed.
 *
 * @param baseProfit The profit before power effects (totalReturn - bet)
 * @param effects Active power effects on the player
 * @returns { adjustedProfit, consumed: { doubleOrNothing, goldRush, cursed } }
 */
export function applyWinEffects(
  baseProfit: number,
  effects: PowerEffects,
): { adjustedProfit: number; consumedDoubleOrNothing: boolean; consumedCursed: boolean } {
  let profit = baseProfit;
  let consumedDoubleOrNothing = false;
  let consumedCursed = false;

  // Gold Rush: ×1.5 on winnings (active for 20s, not consumed)
  if (effects.goldRushActive && profit > 0) {
    profit *= 1.5;
  }

  // Curse: 50% of winnings (consumed)
  if (effects.cursed && profit > 0) {
    profit *= 0.5;
    consumedCursed = true;
  }

  // Double or Nothing: double the profit (consumed)
  if (effects.doubleOrNothing && profit > 0) {
    profit *= 2;
    consumedDoubleOrNothing = true;
  }

  return {
    adjustedProfit: Math.round(profit * 100) / 100,
    consumedDoubleOrNothing,
    consumedCursed,
  };
}

/**
 * Apply power effects to a LOSS.
 * Returns the adjusted loss amount (how much to actually deduct beyond the bet)
 * and which effects were consumed.
 *
 * @param baseLoss The loss amount (typically = bet)
 * @param effects Active power effects on the player
 * @returns { adjustedLoss, consumed: { doubleOrNothing, insured } }
 */
export function applyLossEffects(
  baseLoss: number,
  effects: PowerEffects,
): { adjustedLoss: number; consumedDoubleOrNothing: boolean; consumedInsured: boolean } {
  let loss = baseLoss;
  let consumedDoubleOrNothing = false;
  let consumedInsured = false;

  // Insurance: only lose 50% (consumed)
  if (effects.insured) {
    loss *= 0.5;
    consumedInsured = true;
  }

  // Double or Nothing: double the loss (consumed)
  if (effects.doubleOrNothing) {
    loss *= 2;
    consumedDoubleOrNothing = true;
  }

  return {
    adjustedLoss: Math.round(loss * 100) / 100,
    consumedDoubleOrNothing,
    consumedInsured,
  };
}

/**
 * Apply Jackpot Magnet to an RNG roll.
 * Returns true if the roll should succeed (20% nudge in favor).
 * Consumes the flag — caller must clear it.
 *
 * @param baseChance The base probability of winning (0-1)
 * @param effects Active power effects
 * @returns { adjustedChance }
 */
export function applyJackpotMagnet(
  baseChance: number,
  effects: PowerEffects,
): { adjustedChance: number; consumed: boolean } {
  if (effects.jackpotMagnet) {
    return { adjustedChance: Math.min(0.99, baseChance * 1.2), consumed: true };
  }
  return { adjustedChance: baseChance, consumed: false };
}

/**
 * Check if the player is frozen (can't interact).
 */
export function isFrozen(effects: PowerEffects): boolean {
  return effects.frozen;
}
