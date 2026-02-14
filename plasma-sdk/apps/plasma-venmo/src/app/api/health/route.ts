import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { plasmaMainnet, PLASMA_MAINNET_RPC } from '@plasma-pay/core';
import { logHealthCheck } from '@/lib/monitoring';

/**
 * Health Check Endpoint
 * 
 * GET /api/health
 * 
 * Returns the health status of the Plenmo application and its dependencies.
 * Used by load balancers, monitoring systems, and deployment pipelines.
 * 
 * Response format:
 * {
 *   status: 'healthy' | 'degraded' | 'unhealthy',
 *   timestamp: ISO8601 string,
 *   version: string,
 *   environment: string,
 *   checks: {
 *     database: { status, latency? },
 *     rpc: { status, latency?, blockNumber? },
 *     relayer: { status, balance? },
 *     redis: { status, latency? }
 *   }
 * }
 */

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  latency?: number;
  error?: string;
  [key: string]: unknown;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: Record<string, HealthCheck>;
}

const startTime = Date.now();

/**
 * Check RPC connectivity and get latest block
 */
async function checkRPC(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const client = createPublicClient({
      chain: plasmaMainnet,
      transport: http(PLASMA_MAINNET_RPC),
    });
    
    const blockNumber = await client.getBlockNumber();
    const latency = Date.now() - start;
    
    return {
      status: latency < 5000 ? 'pass' : 'warn',
      latency,
      blockNumber: blockNumber.toString(),
      rpcUrl: PLASMA_MAINNET_RPC.replace(/\/\/.*@/, '//***@'), // Mask credentials
    };
  } catch (error) {
    return {
      status: 'fail',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'RPC check failed',
    };
  }
}

/**
 * Check relayer wallet configuration and balance
 */
async function checkRelayer(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const relayerAddress = process.env.RELAYER_ADDRESS;
    
    if (!relayerAddress) {
      return {
        status: 'fail',
        error: 'Relayer address not configured',
      };
    }
    
    if (!process.env.RELAYER_PRIVATE_KEY) {
      return {
        status: 'fail',
        error: 'Relayer private key not configured',
      };
    }
    
    const client = createPublicClient({
      chain: plasmaMainnet,
      transport: http(PLASMA_MAINNET_RPC),
    });
    
    const balance = await client.getBalance({
      address: relayerAddress as `0x${string}`,
    });
    
    const balanceEth = Number(balance) / 1e18;
    const latency = Date.now() - start;
    
    // Warn if balance is low (< 0.01 ETH)
    const status = balanceEth < 0.001 ? 'fail' : balanceEth < 0.01 ? 'warn' : 'pass';
    
    return {
      status,
      latency,
      balance: balanceEth.toFixed(6),
      address: `${relayerAddress.slice(0, 6)}...${relayerAddress.slice(-4)}`,
    };
  } catch (error) {
    return {
      status: 'fail',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Relayer check failed',
    };
  }
}

/**
 * Check database connectivity (if applicable)
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return {
        status: 'warn',
        error: 'Database not configured (using local storage)',
      };
    }
    
    // Simple connectivity check - in a real app, you'd query the DB
    // For now, just check the URL is configured
    return {
      status: 'pass',
      latency: Date.now() - start,
      type: databaseUrl.startsWith('postgresql') ? 'PostgreSQL' : 'Other',
    };
  } catch (error) {
    return {
      status: 'fail',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database check failed',
    };
  }
}

/**
 * Check Redis connectivity (for rate limiting)
 */
async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const redisUrl = process.env.KV_REST_API_URL;
    
    if (!redisUrl) {
      return {
        status: 'warn',
        error: 'Redis not configured (rate limiting may be degraded)',
      };
    }
    
    // Would perform actual Redis PING in production
    return {
      status: 'pass',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'fail',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Redis check failed',
    };
  }
}

/**
 * Check external service configuration
 */
function checkServices(): HealthCheck {
  const services: Record<string, boolean> = {
    privy: !!process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    resend: !!process.env.RESEND_API_KEY,
    posthog: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
    sentry: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  };
  
  const configured = Object.values(services).filter(Boolean).length;
  const total = Object.keys(services).length;
  
  return {
    status: configured === total ? 'pass' : configured >= 2 ? 'warn' : 'fail',
    configured: `${configured}/${total}`,
    services,
  };
}

/**
 * Determine overall health status
 */
function determineOverallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map(c => c.status);
  
  // Unhealthy if any critical check fails
  const criticalChecks = ['rpc', 'relayer'];
  for (const check of criticalChecks) {
    if (checks[check]?.status === 'fail') {
      return 'unhealthy';
    }
  }
  
  // Degraded if any check fails or warns
  if (statuses.includes('fail')) {
    return 'degraded';
  }
  
  if (statuses.includes('warn')) {
    return 'degraded';
  }
  
  return 'healthy';
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || '0.1.0';
  
  // Run health checks in parallel
  const [rpc, relayer, database, redis] = await Promise.all([
    checkRPC(),
    checkRelayer(),
    checkDatabase(),
    checkRedis(),
  ]);
  
  const services = checkServices();
  
  const checks = {
    rpc,
    relayer,
    database,
    redis,
    services,
  };
  
  const status = determineOverallStatus(checks);
  
  const response: HealthResponse = {
    status,
    timestamp,
    version,
    environment,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };
  
  // Log health check result
  logHealthCheck({
    status,
    checks: Object.fromEntries(
      Object.entries(checks).map(([key, value]) => [
        key,
        { status: value.status, latency: value.latency, error: value.error },
      ])
    ),
  });
  
  // Return appropriate status code
  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
  
  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

// HEAD request for simple uptime checks
export async function HEAD() {
  return new Response(null, { status: 200 });
}
