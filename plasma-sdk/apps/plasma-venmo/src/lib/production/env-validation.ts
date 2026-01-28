import { z } from 'zod';

/**
 * Required environment variables for the xUSDT/Plenmo app.
 * These are validated at startup to ensure the app can function correctly.
 */
export const requiredEnvVars = [
  'DATABASE_URL',
  'PRIVY_APP_ID',
  'PRIVY_APP_SECRET',
  'NEXT_PUBLIC_PRIVY_APP_ID',
] as const;

/**
 * Optional but recommended environment variables.
 */
export const recommendedEnvVars = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'RELAYER_PRIVATE_KEY',
  'PLASMA_RPC',
] as const;

/**
 * Defines the schema for environment variables using Zod.
 * This ensures that all required environment variables are present and correctly formatted.
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Authentication (Privy)
  PRIVY_APP_ID: z.string().min(1, 'PRIVY_APP_ID is required'),
  PRIVY_APP_SECRET: z.string().min(1, 'PRIVY_APP_SECRET is required'),
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1, 'NEXT_PUBLIC_PRIVY_APP_ID is required'),

  // Blockchain (optional)
  PLASMA_RPC: z.string().optional(),
  NEXT_PUBLIC_PLASMA_RPC: z.string().optional(),
  RELAYER_PRIVATE_KEY: z.string().optional(),

  // Rate Limiting (Upstash Redis - optional)
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Error Tracking (Sentry - optional)
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // Next.js
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * A type definition for the validated environment variables.
 */
export type AppEnv = z.infer<typeof envSchema>;

/**
 * Validation result interface.
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates the current environment variables against the defined schema.
 * Returns validation result instead of exiting process.
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required env vars
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // Check recommended env vars
  for (const envVar of recommendedEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(`Missing recommended environment variable: ${envVar}`);
    }
  }

  // Validate format with Zod
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${issue.path.join('.')}: ${issue.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates environment and logs results.
 * Call this at app startup.
 */
export function checkEnvironment(): void {
  const result = validateEnv();

  if (result.warnings.length > 0) {
    console.warn('[ENV] Warnings:');
    result.warnings.forEach(w => console.warn(`  - ${w}`));
  }

  if (!result.valid) {
    console.error('[ENV] Validation failed:');
    result.errors.forEach(e => console.error(`  - ${e}`));
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Environment validation failed');
    }
  } else {
    console.log('[ENV] Environment validation passed');
  }
}
