import { prisma } from "@plasma-pay/db";
import { DAILY_FREE_TX_LIMIT, DAILY_GAS_BUDGET_USD } from "./constants";

function getTodayStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getTomorrowStart(): Date {
  const d = getTodayStart();
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export async function logGasSponsorship(
  userAddress: string,
  txHash: string,
  gasUsed: string,
  gasCostUsd: number,
  txType: string = "send"
) {
  return prisma.gasSponsorshipLog.create({
    data: {
      userAddress: userAddress.toLowerCase(),
      txHash,
      gasUsed,
      gasCostUsd,
      txType,
    },
  });
}

export async function getUserDailyUsage(userAddress: string) {
  const todayStart = getTodayStart();
  const logs = await prisma.gasSponsorshipLog.findMany({
    where: {
      userAddress: userAddress.toLowerCase(),
      createdAt: { gte: todayStart },
    },
  });

  const txCount = logs.length;
  const totalGasCostUSD = logs.reduce((sum, log) => sum + log.gasCostUsd, 0);

  return { txCount, totalGasCostUSD };
}

export async function checkGasBudget(userAddress: string): Promise<{
  allowed: boolean;
  remaining: number;
  reason?: string;
  resetsAt: string;
}> {
  const { txCount, totalGasCostUSD } = await getUserDailyUsage(userAddress);
  const resetsAt = getTomorrowStart().toISOString();

  if (txCount >= DAILY_FREE_TX_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      reason: "Daily free transfer limit reached",
      resetsAt,
    };
  }

  if (totalGasCostUSD >= DAILY_GAS_BUDGET_USD) {
    return {
      allowed: false,
      remaining: 0,
      reason: "Daily gas budget exceeded",
      resetsAt,
    };
  }

  return {
    allowed: true,
    remaining: DAILY_FREE_TX_LIMIT - txCount,
    resetsAt,
  };
}
