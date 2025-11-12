# Running the Database Migration

## Migration: 003_add_game_specific_bonuses

This migration adds:
1. `game_types` JSON column to `daily_bonuses` table
2. `games_of_the_day` table for tracking featured games

## Steps to Run

### 1. Set Database URL

Make sure your database URL is set:

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
# OR
export GAME_DATABASE_URL="postgresql://user:password@host:port/database"
```

### 2. Run Migration

From the project root:

```bash
cd agent/migrations
alembic upgrade head
```

Or from project root:

```bash
alembic -c agent/migrations/alembic.ini upgrade head
```

### 3. Verify Migration

Check that the migration was applied:

```sql
-- Check game_types column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'daily_bonuses' AND column_name = 'game_types';

-- Check games_of_the_day table exists
SELECT * FROM games_of_the_day LIMIT 1;
```

### 4. Generate Initial Games of the Day

After migration, trigger the cron job to generate today's Games of the Day:

```bash
# Via API (if server is running)
curl -X GET "http://localhost:3000/api/cron/daily-bonuses" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Or via Python script
python3 -c "
from agent.daily_bonus_rotation import rotate_daily_bonuses
from agent.config import settings
rotate_daily_bonuses(settings.GAME_DATABASE_URL)
"
```

## Rollback (if needed)

If you need to rollback:

```bash
alembic downgrade -1
```

This will remove:
- `games_of_the_day` table
- `game_types` column from `daily_bonuses`

## Troubleshooting

### Migration fails with "relation already exists"
- The migration may have already been run
- Check current revision: `alembic current`
- If needed, mark as current: `alembic stamp head`

### Database connection error
- Verify DATABASE_URL is correct
- Check database is accessible
- Ensure PostgreSQL is running

### Import errors
- Make sure you're in the project root
- Check Python path includes agent directory
- Install dependencies: `pip install -r requirements.txt`

