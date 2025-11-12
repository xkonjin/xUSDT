# Toy-to-Game Mechanics Documentation

## Overview

The Trillionaire Toy Store Game features a strategic toy system where toys affect game performance through multipliers. Understanding how toys interact with games is crucial for maximizing your points and climbing the leaderboard.

## Core Concepts

### 1. **Equipping System**
- Players can equip up to **3 toys** simultaneously in their inventory slots
- Only equipped toys provide bonuses during gameplay
- Toys can be equipped/unequipped freely at any time
- Each toy occupies one slot (Slot 1, 2, or 3)

### 2. **Base Toy Multiplier**
All equipped toys provide a **base multiplier** based on their stats:
- **Formula:** Base Multiplier = 1.0 + (Sum of all stat points × 0.01)
- **Example:** A toy with stats {Speed: 20, Power: 15, Luck: 10} = 45 total stats
  - Base multiplier contribution = 45 × 0.01 = 0.45
  - If you equip 3 toys with similar stats, your base multiplier could be ~2.35x

**Important:** Base multipliers apply to ALL games, regardless of game type.

### 3. **Daily Bonuses & Games of the Day**
Each day, the system:
1. **Selects 2 random games** as "Games of the Day"
2. **Assigns bonuses to 3-5 toy types** tied to specific games
3. **Only toys with bonuses matching the Games of the Day** provide daily multipliers

**Daily Multiplier Rules:**
- Daily bonuses range from 1.5x to 3.0x
- Only toys with bonuses matching the current game provide daily multipliers
- If you play a game that's NOT a Game of the Day, you only get base multipliers
- If you play a Game of the Day but don't have matching toys, you only get base multipliers

### 4. **Point Calculation Formula**

```
Final Points = Base Points × Toy Multiplier × Daily Bonus Multiplier × Wager Multiplier
```

**Where:**
- **Base Points:** Fixed points per game type (e.g., Memory Match = 150, Reaction Time = 100)
- **Toy Multiplier:** Sum of base multipliers from all equipped toys (always applies)
- **Daily Bonus Multiplier:** Highest multiplier from equipped toys matching the current game (only if game is Game of the Day)
- **Wager Multiplier:** Bonus from wagering credits or USDT0 (optional)

## Strategic Gameplay

### Building Your Squad

**Optimal Strategy:**
1. **Check Games of the Day** - Visit the Play page to see which 2 games are featured
2. **Review Your Toys** - Check your inventory to see which toys have bonuses for those games
3. **Equip Matching Toys** - Equip toys that match the Games of the Day for maximum bonuses
4. **Balance Stats** - Higher rarity toys have better stats, providing stronger base multipliers

### Example Scenario

**Today's Games of the Day:**
- Memory Match
- Reaction Time

**Your Toys:**
- Robot (Legendary): Stats {Speed: 30, Power: 25, Precision: 20} = 75 total stats
  - Has bonus for Memory Match: 2.5x
- Teddy Bear (Rare): Stats {Luck: 15, Defense: 10, Magic: 12} = 37 total stats
  - Has bonus for Reaction Time: 2.0x
- Race Car (Epic): Stats {Speed: 20, Power: 18, Precision: 15} = 53 total stats
  - No daily bonus (doesn't match Games of the Day)

**If you equip all 3 toys and play Memory Match:**
- Base Multiplier: 1.0 + (75 + 37 + 53) × 0.01 = 1.0 + 1.65 = **2.65x**
- Daily Multiplier: **2.5x** (from Robot matching Memory Match)
- Base Points: 150 (Memory Match)
- **Final Points:** 150 × 2.65 × 2.5 = **993 points**

**If you play Reaction Time instead:**
- Base Multiplier: **2.65x** (same)
- Daily Multiplier: **2.0x** (from Teddy Bear matching Reaction Time)
- Base Points: 100 (Reaction Time)
- **Final Points:** 100 × 2.65 × 2.0 = **530 points**

**If you play Wheel Spin (NOT a Game of the Day):**
- Base Multiplier: **2.65x** (same)
- Daily Multiplier: **1.0x** (no matching toys, game not featured)
- Base Points: 100 (Wheel Spin)
- **Final Points:** 100 × 2.65 × 1.0 = **265 points**

## Toy Rarity & Stats

### Rarity Tiers
- **Common:** Base stats ~10-20 per category
- **Rare:** Base stats ~15-30 per category (1.5x multiplier)
- **Epic:** Base stats ~20-40 per category (2.0x multiplier)
- **Legendary:** Base stats ~30-60 per category (3.0x multiplier)

### Stat Categories
Different toy types have different stat categories:
- **Speed, Power, Precision** (e.g., Robot, Race Car, Ninja)
- **Luck, Magic, Defense** (e.g., Teddy Bear, Magic Wand, Castle)
- **Mixed** (e.g., Space Ship, Dragon, Phoenix)

All stats contribute equally to the base multiplier calculation.

## Marketplace Strategy

### Buying Toys
- **Check Daily Bonuses** - Before buying, check which toys have bonuses for Games of the Day
- **Consider Rarity** - Higher rarity = better stats = stronger base multipliers
- **Diversify** - Having toys that affect different games gives you flexibility

### Selling Toys
- **Timing Matters** - Toys with bonuses for Games of the Day may fetch higher prices
- **Rarity Premium** - Legendary and Epic toys are more valuable due to better stats
- **Market Dynamics** - Toy values fluctuate based on daily bonuses and demand

## Best Practices

1. **Daily Check-In:** Always check Games of the Day before playing
2. **Squad Optimization:** Equip toys matching Games of the Day for maximum bonuses
3. **Stat Balance:** Higher total stats = better base multipliers (applies to all games)
4. **Strategic Trading:** Buy/sell toys based on daily bonuses and your playstyle
5. **Flexibility:** Keep a diverse collection to adapt to different Games of the Day

## Technical Details

### Database Schema
- `daily_bonuses` table stores toy bonuses with `game_types` JSON array
- `games_of_the_day` table tracks featured games each day
- `player_inventory` table tracks equipped toys (3 slots max)

### API Endpoints
- `GET /api/game/games-of-the-day` - Get today's featured games and toy bonuses
- `GET /api/game/players/{address}/inventory` - Get player's inventory with equipped toys
- `POST /api/game/games/submit` - Submit game result (calculates multipliers)

### Multiplier Calculation (TypeScript)
```typescript
// Base multiplier from stats
let toyMultiplier = 1.0;
for (const toy of equippedToys) {
  const totalStats = Object.values(toy.stats).reduce((sum, val) => sum + val, 0);
  toyMultiplier += totalStats * 0.01; // 1% per stat point
}

// Daily multiplier (only for matching games)
let dailyMultiplier = 1.0;
for (const bonus of dailyBonuses) {
  if (bonus.game_types.includes(currentGameType)) {
    dailyMultiplier = Math.max(dailyMultiplier, bonus.multiplier);
  }
}

// Final points
const points = basePoints * toyMultiplier * dailyMultiplier * wagerMultiplier;
```

## FAQ

**Q: Do I need to equip toys to get bonuses?**
A: Yes, only equipped toys provide multipliers. Unequipped toys don't affect gameplay.

**Q: Can I change my squad during the day?**
A: Yes! You can equip/unequip toys freely at any time.

**Q: What if I don't have toys matching Games of the Day?**
A: You'll still get base multipliers from your equipped toys' stats, but no daily bonus multipliers.

**Q: Do daily bonuses stack?**
A: No, only the highest daily multiplier from your equipped toys applies.

**Q: Can one toy affect multiple games?**
A: Yes! Some toys have bonuses for multiple games (including both Games of the Day).

**Q: How often do Games of the Day change?**
A: Daily at midnight UTC. Check back each day for new featured games!

## Summary

The toy-to-game system creates strategic depth:
- **Base multipliers** reward players with strong toy collections (always active)
- **Daily bonuses** reward players who adapt their squad to Games of the Day
- **Marketplace** allows players to buy/sell toys based on daily bonuses
- **Balance** ensures both casual and strategic players can succeed

Master the system, optimize your squad, and climb the leaderboard! 🎮⭐

