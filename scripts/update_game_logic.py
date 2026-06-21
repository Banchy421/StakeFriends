#!/usr/bin/env python3
"""Update game components to use power effects in their win/loss logic."""
import os

GAMES_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'components', 'games')

UPDATES = {
    'Coinflip.tsx': [
        ("        const profit = bet * bonusMultiplier;\n        const totalReturn = bet + profit;\n        setWinAmount(profit);\n        onBalanceChange(balanceRef.current + totalReturn);",
         "        const baseProfit = bet * bonusMultiplier;\n        const winResult = applyWinEffects(baseProfit, effects);\n        const totalReturn = bet + winResult.adjustedProfit;\n        setWinAmount(winResult.adjustedProfit);\n        onBalanceChange(balanceRef.current + totalReturn);"),
        ("        Sound.lose();\n        setPhase('lost');",
         "        const lossResult = applyLossEffects(bet, effects);\n        const refund = bet - lossResult.adjustedLoss;\n        if (refund !== 0) onBalanceChange(balanceRef.current + refund);\n        Sound.lose();\n        setPhase('lost');"),
        ("    if (phase === 'flipping') return;",
         "    if (isFrozen(effects)) { Sound.error(); return; }\n    if (phase === 'flipping') return;"),
    ],
    'Crash.tsx': [
        ("    const totalReturn = bet * multiplier * bonusMultiplier;\n    const profit = totalReturn - bet;\n    setCashedAt(multiplier);\n    setWinAmount(profit);\n    onBalanceChange(balanceRef.current + totalReturn);",
         "    const baseReturn = bet * multiplier * bonusMultiplier;\n    const baseProfit = baseReturn - bet;\n    const winResult = applyWinEffects(baseProfit, effects);\n    setCashedAt(multiplier);\n    setWinAmount(winResult.adjustedProfit);\n    onBalanceChange(balanceRef.current + bet + winResult.adjustedProfit);"),
        ("    if (balanceRef.current < bet) { Sound.error(); return; }\n    if (timeRemaining <= 3) { Sound.error(); return; }",
         "    if (isFrozen(effects)) { Sound.error(); return; }\n    if (balanceRef.current < bet) { Sound.error(); return; }\n    if (timeRemaining <= 3) { Sound.error(); return; }"),
    ],
    'Slots.tsx': [
        ("    const totalReturn = bet * payout * bonusMultiplier;\n    const profit = totalReturn - bet;\n    await new Promise((r) => setTimeout(r, 400));\n    setLastPayout(payout);\n    setLastWin(profit);\n    if (payout > 0) {\n      onBalanceChange(balanceRef.current + totalReturn);",
         "    const baseReturn = bet * payout * bonusMultiplier;\n    const baseProfit = baseReturn - bet;\n    const winResult = applyWinEffects(baseProfit, effects);\n    await new Promise((r) => setTimeout(r, 400));\n    setLastPayout(payout);\n    setLastWin(winResult.adjustedProfit);\n    if (payout > 0) {\n      onBalanceChange(balanceRef.current + bet + winResult.adjustedProfit);"),
        ("    } else {\n      Sound.lose();\n      setSpinState('lost');\n    }",
         "    } else {\n      const lossResult = applyLossEffects(bet, effects);\n      const refund = bet - lossResult.adjustedLoss;\n      if (refund !== 0) onBalanceChange(balanceRef.current + refund);\n      Sound.lose();\n      setSpinState('lost');\n    }"),
        ("    if (balanceRef.current < bet) { Sound.error(); return; }\n    if (timeRemaining <= 3) { Sound.error(); return; }\n    if (spinState === 'spinning') return;",
         "    if (isFrozen(effects)) { Sound.error(); return; }\n    if (balanceRef.current < bet) { Sound.error(); return; }\n    if (timeRemaining <= 3) { Sound.error(); return; }\n    if (spinState === 'spinning') return;"),
    ],
    'Tower.tsx': [
        ("    const totalReturn = bet * mult * bonusMultiplier;\n    const profit = totalReturn - bet;\n    setWinAmount(profit);\n    onBalanceChange(balanceRef.current + totalReturn);",
         "    const baseReturn = bet * mult * bonusMultiplier;\n    const baseProfit = baseReturn - bet;\n    const winResult = applyWinEffects(baseProfit, effects);\n    setWinAmount(winResult.adjustedProfit);\n    onBalanceChange(balanceRef.current + bet + winResult.adjustedProfit);"),
        ("      setShakingButton(buttonIndex);\n      Sound.explosion();\n      setGameState('busted');",
         "      setShakingButton(buttonIndex);\n      Sound.explosion();\n      const lossResult = applyLossEffects(bet, effects);\n      const refund = bet - lossResult.adjustedLoss;\n      if (refund !== 0) onBalanceChange(balanceRef.current + refund);\n      setGameState('busted');"),
        ("    if (!canPlay) { Sound.error(); return; }",
         "    if (isFrozen(effects)) { Sound.error(); return; }\n    if (!canPlay) { Sound.error(); return; }"),
        ("  const pickButton = (buttonIndex: number) => {\n    if (gameState !== 'playing') return;",
         "  const pickButton = (buttonIndex: number) => {\n    if (isFrozen(effects)) return;\n    if (gameState !== 'playing') return;"),
    ],
}

for filename, replacements in UPDATES.items():
    filepath = os.path.join(GAMES_DIR, filename)
    if not os.path.exists(filepath):
        print(f"  {filename}: NOT FOUND")
        continue
    content = open(filepath).read()
    for i, (old, new) in enumerate(replacements):
        if old in content:
            content = content.replace(old, new, 1)
            print(f"  {filename}: replacement {i} - OK")
        else:
            print(f"  {filename}: replacement {i} - PATTERN NOT FOUND")
    open(filepath, 'w').write(content)

print("Done")
