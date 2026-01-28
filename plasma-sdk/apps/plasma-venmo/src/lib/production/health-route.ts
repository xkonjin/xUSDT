import { NextResponse } from "next/server";
import { db } from "@plasma-pay/db";
import { Redis } from "@upstash/redis";
import * as Sentry from "@sentry/nextjs";

/**
 * Represents the status of a single service.
 */
interface ServiceStatus {
  status: "ok" | "error" | "degraded";
  latencyMs?: number;
  message?: string;
}

/**
 * Represents the overall health check response.
 */
interface HealthCheckResponse {
  status: "ok" | "error" | "degraded";
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    rpc: ServiceStatus;
  };
}

/**
 * Checks the database connection with latency measurement.
 */
async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return { 
      status: latencyMs > 1000 ? "degraded" : "ok",
      latencyMs 
    };
  } catch (error) {
    Sentry.captureException(error);
    return { status: "error", message: "Database connection failed" };
  }
}

/**
 * Checks the Redis connection with latency measurement.
 */
async function checkRedis(): Promise<ServiceStatus> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return { status: "ok", message: "Redis not configured" };
  }
  
  const start = Date.now();
  try {
    const redis = Redis.fromEnv();
    await redis.ping();
    const latencyMs = Date.now() - start;
    return { 
      status: latencyMs > 500 ? "degraded" : "ok",
      latencyMs 
    };
  } catch (error) {
    Sentry.captureException(error);
    return { status: "error", message: "Redis connection failed" };
  }
}

/**
 * Checks the RPC connection with latency measurement.
 */
async function checkRpc(): Promise<ServiceStatus> {
  const rpcUrl = process.env.PLASMA_RPC || process.env.NEXT_PUBLIC_PLASMA_RPC;
  if (!rpcUrl) {
    return { status: "ok", message: "RPC not configured" };
  }
  
  const start = Date.now();
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`RPC returned status ${response.status}`);
    }
    
    const latencyMs = Date.now() - start;
    return { 
      status: latencyMs > 2000 ? "degraded" : "ok",
      latencyMs 
    };
  } catch (error) {
    Sentry.captureException(error);
    return { status: "error", message: "RPC connection failed" };
  }
}

// Track process start time for uptime calculation
const processStartTime = Date.now();

/**
 * GET /api/health
 * Returns the health status of the application and its services.
 */
export async function GET(): Promise<NextResponse> {
  const [database, redis, rpc] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkRpc(),
  ]);

  const services = { database, redis, rpc };

  // Determine overall status
  const statuses = Object.values(services).map(s => s.status);
  let overallStatus: "ok" | "error" | "degraded" = "ok";
  if (statuses.includes("error")) {
    overallStatus = "error";
  } else if (statuses.includes("degraded")) {
    overallStatus = "degraded";
  }

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
    uptime: Math.floor((Date.now() - processStartTime) / 1000),
    services,
  };

  const httpStatus = overallStatus === "error" ? 503 : 200;
  return NextResponse.json(response, { status: httpStatus });
}
