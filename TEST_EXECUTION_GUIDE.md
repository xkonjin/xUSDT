# Test Execution Guide

## Quick Start

### Install Dependencies

```bash
cd v0
npm install
```

### Run All Tests

```bash
# Unit and integration tests
npm test

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:coverage

# All tests (unit + E2E)
npm run test:all
```

## Test Types

### 1. Unit Tests

Test individual API endpoints and functions:

```bash
npm test -- __tests__/api
```

### 2. Integration Tests

Test complete flows across multiple endpoints:

```bash
npm test -- __tests__/integration
```

### 3. E2E Tests

Test user journeys in browser:

```bash
npm run test:e2e
```

### 4. Performance Tests

Test API response times and load handling:

```bash
npm test -- __tests__/performance
```

### 5. Security Tests

Test security vulnerabilities:

```bash
npm test -- __tests__/security
```

## Test Environment Setup

### Required Environment Variables

Create `.env.test`:

```env
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
REDIS_URL=redis://localhost:6379
PLASMA_RPC=https://rpc.plasma.to
PLASMA_CHAIN_ID=9745
USDT0_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
MERCHANT_ADDRESS=0x0000000000000000000000000000000000000000
CRON_SECRET=test-secret
TEST_BASE_URL=http://localhost:3000
```

### Database Setup

```bash
# Create test database
createdb test_db

# Run migrations
cd agent/migrations
alembic upgrade head
```

### Redis Setup

```bash
# Start Redis (if not running)
redis-server
```

## Running Specific Tests

### Run Single Test File

```bash
npm test -- __tests__/api/game/toys.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --grep "toys"
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:e2e
```

## Test Coverage

Generate coverage report:

```bash
npm run test:coverage
```

View coverage report:

```bash
open coverage/lcov-report/index.html
```

## Debugging Tests

### Debug Jest Tests

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Debug Playwright Tests

```bash
npm run test:e2e -- --debug
```

## Common Issues

### Database Connection Errors

- Ensure test database exists
- Check DATABASE_URL is correct
- Verify PostgreSQL is running

### Redis Connection Errors

- Ensure Redis is running
- Check REDIS_URL is correct

### Port Already in Use

- Change TEST_BASE_URL to different port
- Or kill process using port 3000

## Best Practices

1. **Write tests before fixing bugs** - TDD approach
2. **Keep tests independent** - Each test should work in isolation
3. **Use descriptive test names** - Clear what is being tested
4. **Mock external dependencies** - Don't rely on external services
5. **Clean up test data** - Use beforeEach/afterEach hooks
6. **Test edge cases** - Not just happy paths
7. **Keep tests fast** - Unit tests should be < 100ms each

## Test Maintenance

- Update tests when features change
- Remove obsolete tests
- Refactor tests for clarity
- Add tests for bug fixes
- Review test coverage regularly

