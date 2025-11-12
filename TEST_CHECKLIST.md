# Test Checklist - Trillionaire Toy Store

Use this checklist to verify all functionality before deployment.

## Pre-Deployment Tests

### Database Tests
- [ ] Database migrations run successfully
- [ ] Toy catalog seeded correctly (20 toys)
- [ ] All tables created with correct schema
- [ ] Indexes created for performance
- [ ] Foreign key constraints work
- [ ] Unique constraints enforced

### API Endpoint Tests

#### Toys Endpoints
- [ ] `GET /api/game/toys` - Returns all toys with mint counts
- [ ] `GET /api/game/toys/[id]/invoice` - Returns 402 PaymentRequired
- [ ] `POST /api/game/toys/purchase` - Purchases toy after payment
- [ ] Toy availability calculated correctly
- [ ] Sold out toys rejected

#### Player Endpoints
- [ ] `POST /api/game/players/register` - Registers new player
- [ ] `GET /api/game/players/[address]` - Returns player profile
- [ ] `GET /api/game/players/[address]/inventory` - Returns inventory
- [ ] `POST /api/game/players/[address]/inventory/equip` - Equips toy
- [ ] `POST /api/game/players/[address]/inventory/unequip` - Unequips toy
- [ ] Nickname validation works
- [ ] Duplicate nickname rejected
- [ ] Invalid wallet address rejected

#### Game Endpoints
- [ ] `POST /api/game/games/start` - Starts game session
- [ ] `POST /api/game/games/submit` - Submits game result
- [ ] Points calculated correctly
- [ ] Multipliers applied correctly
- [ ] Leaderboard updated after game
- [ ] Credits deducted when wagering
- [ ] Challenge expiration works

#### Leaderboard Endpoints
- [ ] `GET /api/game/leaderboard?period=weekly` - Returns weekly rankings
- [ ] `GET /api/game/leaderboard?period=monthly` - Returns monthly rankings
- [ ] `GET /api/game/leaderboard?period=alltime` - Returns all-time rankings
- [ ] Rankings sorted correctly
- [ ] Player appears after playing game

#### Daily Bonuses
- [ ] `GET /api/game/daily-bonuses` - Returns today's bonuses
- [ ] Bonuses rotate daily
- [ ] Multipliers applied in games

### Frontend Component Tests

#### Pages
- [ ] `/play` - Game selection page loads
- [ ] `/store` - Toy store page loads
- [ ] `/inventory` - Inventory page loads
- [ ] `/leaderboard` - Leaderboard page loads
- [ ] `/marketplace` - Marketplace page loads
- [ ] `/onboard` - Onboarding page loads

#### Game Components
- [ ] Reaction Time game works
- [ ] Dice Roll game works
- [ ] Game wrapper handles state
- [ ] Results submitted correctly
- [ ] Errors displayed properly

#### Navigation
- [ ] All navigation links work
- [ ] Mobile menu works
- [ ] Wallet connection persists

### Integration Tests

#### User Flows
- [ ] Register → Buy Toy → Equip → Play Game
- [ ] Register → Play Game → Earn Points → View Leaderboard
- [ ] Buy Toy → View in Inventory → Equip → Play Game
- [ ] Play Multiple Games → Check Leaderboard Position

#### Payment Flow
- [ ] Get invoice → Sign payment → Purchase toy
- [ ] Payment verification works
- [ ] NFT minted after purchase
- [ ] Player registered automatically

### E2E Tests

#### Browser Tests
- [ ] Onboarding flow completes
- [ ] Wallet connection works
- [ ] Toy purchase flow works
- [ ] Game playthrough works
- [ ] Leaderboard displays correctly
- [ ] Mobile responsive design works

### Performance Tests

#### API Performance
- [ ] `/api/game/toys` responds < 500ms
- [ ] `/api/game/leaderboard` responds < 500ms
- [ ] `/api/game/daily-bonuses` responds < 200ms
- [ ] Handles 10 concurrent requests
- [ ] Handles 100 requests without errors

#### Database Performance
- [ ] Queries use indexes
- [ ] No N+1 query problems
- [ ] Transactions complete quickly

### Security Tests

#### Input Validation
- [ ] SQL injection prevented
- [ ] XSS attacks prevented
- [ ] Invalid wallet addresses rejected
- [ ] Invalid nicknames rejected
- [ ] Invalid game types rejected

#### Authorization
- [ ] Cannot access other player's inventory
- [ ] Cannot equip unowned toys
- [ ] Cannot submit invalid game results

#### Rate Limiting
- [ ] Rapid requests handled gracefully
- [ ] No DoS vulnerabilities

### Mobile Tests

#### Responsive Design
- [ ] Works on mobile devices
- [ ] Touch controls work
- [ ] Buttons are touch-friendly (44px+)
- [ ] No horizontal scrolling
- [ ] Text readable without zoom

#### Wallet Integration
- [ ] Rabby wallet connects
- [ ] MetaMask wallet connects
- [ ] Wallet switching works
- [ ] Chain switching works

### Cron Job Tests

#### Daily Bonuses
- [ ] Cron job runs daily
- [ ] Bonuses generated correctly
- [ ] Old bonuses cleaned up

#### Weekly Prizes
- [ ] Cron job runs Fridays
- [ ] Winners calculated correctly
- [ ] Prizes recorded in database
- [ ] USDT0 distribution (when implemented)

### Error Handling

#### API Errors
- [ ] Database errors handled gracefully
- [ ] Redis errors handled gracefully
- [ ] Payment errors handled gracefully
- [ ] Invalid requests return 400
- [ ] Not found returns 404
- [ ] Server errors return 500

#### Frontend Errors
- [ ] Network errors displayed
- [ ] Wallet errors displayed
- [ ] Game errors displayed
- [ ] Error messages are user-friendly

## Post-Deployment Verification

### Smoke Tests
- [ ] Health endpoint responds
- [ ] Home page loads
- [ ] Can connect wallet
- [ ] Can view toy store
- [ ] Can view leaderboard

### Monitoring
- [ ] Error logs monitored
- [ ] Performance metrics tracked
- [ ] Database connections healthy
- [ ] Redis connections healthy
- [ ] Cron jobs executing

## Test Execution Commands

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all

# Run specific test suite
npm test -- __tests__/api/game/toys.test.ts

# Run tests in watch mode
npm run test:watch
```

## Test Results

Record test results here:

- **Date**: ___________
- **Tester**: ___________
- **Environment**: ___________
- **Tests Passed**: ___ / ___
- **Tests Failed**: ___ / ___
- **Coverage**: ___%

### Issues Found

1. ___________
2. ___________
3. ___________

### Notes

___________

