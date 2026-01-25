/**
 * Admin API: Relayer Wallet Management
 *
 * Provides endpoints for:
 * - GET: Check relayer wallet balance and status
 * - POST: Trigger balance check with alerts
 *
 * Authentication: Requires API_AUTH_SECRET header
 *
 * @example
 * ```bash
 * # Check relayer wallet status
 * curl -H "X-API-Secret: $API_AUTH_SECRET" \
 *   https://your-app.com/api/admin/relayer
 *
 * # Trigger balance check with webhook alert
 * curl -X POST -H "X-API-Secret: $API_AUTH_SECRET" \
 *   -H "Content-Type: application/json" \
 *   -d '{"webhookUrl": "https://your-webhook.com/alerts"}' \
 *   https://your-app.com/api/admin/relayer
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getRelayerWalletStatus,
  getMultiWalletStatus,
  checkAndAlert,
  parseRotationConfigFromEnv,
  type AlertConfig,
} from '@/lib/relayer-wallet';

// =============================================================================
// Auth Middleware
// =============================================================================

function validateAdminAuth(request: NextRequest): boolean {
  const secret = process.env.API_AUTH_SECRET;
  if (!secret) {
    console.warn('[admin/relayer] API_AUTH_SECRET not configured - admin endpoints disabled');
    return false;
  }

  const providedSecret = request.headers.get('X-API-Secret');
  return providedSecret === secret;
}

// =============================================================================
// GET /api/admin/relayer
// =============================================================================

/**
 * Get relayer wallet status
 *
 * Query params:
 * - all: If "true", return status of all configured wallets (for rotation)
 * - minNative: Override minimum native balance threshold (in XPL)
 * - minUsdt0: Override minimum USDT0 balance threshold
 */
export async function GET(request: NextRequest) {
  // Auth check
  if (!validateAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all') === 'true';
    const minNative = searchParams.get('minNative');
    const minUsdt0 = searchParams.get('minUsdt0');

    const config: Partial<AlertConfig> = {};
    if (minNative) config.minNativeBalance = parseFloat(minNative);
    if (minUsdt0) config.minUsdt0Balance = parseFloat(minUsdt0);

    // Check if rotation is configured
    const rotationConfig = parseRotationConfigFromEnv();

    if (showAll && rotationConfig && rotationConfig.wallets.length > 1) {
      // Return status of all wallets
      const statuses = await getMultiWalletStatus(rotationConfig.wallets, config);

      const hasLowBalance = statuses.some(s => s.lowNativeBalance || s.lowUsdt0Balance);

      return NextResponse.json({
        mode: 'rotation',
        strategy: rotationConfig.strategy,
        walletCount: statuses.length,
        hasLowBalance,
        wallets: statuses.map(s => ({
          address: s.address,
          label: s.label,
          nativeBalance: s.nativeBalance,
          usdt0Balance: s.usdt0Balance,
          lowNativeBalance: s.lowNativeBalance,
          lowUsdt0Balance: s.lowUsdt0Balance,
          estimatedTxRemaining: s.estimatedTxRemaining,
        })),
        timestamp: Date.now(),
      });
    }

    // Single wallet mode
    const status = await getRelayerWalletStatus(config);

    if (!status) {
      return NextResponse.json(
        {
          error: 'Relayer wallet not configured',
          hint: 'Set RELAYER_PRIVATE_KEY environment variable',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      mode: 'single',
      address: status.address,
      label: status.label,
      balances: {
        native: {
          wei: status.nativeBalanceWei,
          formatted: status.nativeBalance,
          symbol: 'XPL',
          low: status.lowNativeBalance,
        },
        usdt0: {
          atomic: status.usdt0BalanceAtomic,
          formatted: status.usdt0Balance,
          symbol: 'USDT0',
          low: status.lowUsdt0Balance,
        },
      },
      estimatedTxRemaining: status.estimatedTxRemaining,
      timestamp: status.timestamp,
      alerts: {
        lowNativeBalance: status.lowNativeBalance,
        lowUsdt0Balance: status.lowUsdt0Balance,
        critical: status.lowNativeBalance && status.lowUsdt0Balance,
      },
    });
  } catch (error) {
    console.error('[admin/relayer] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get relayer status' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/admin/relayer
// =============================================================================

interface PostBody {
  /** Webhook URL to send alerts to */
  webhookUrl?: string;
  /** Override minimum native balance threshold */
  minNativeBalance?: number;
  /** Override minimum USDT0 balance threshold */
  minUsdt0Balance?: number;
  /** Force send alert even if thresholds not exceeded */
  forceAlert?: boolean;
}

/**
 * Trigger balance check with optional webhook alert
 *
 * Body:
 * - webhookUrl: URL to send alert webhook
 * - minNativeBalance: Override threshold for native token
 * - minUsdt0Balance: Override threshold for USDT0
 * - forceAlert: Send alert regardless of thresholds (for testing)
 */
export async function POST(request: NextRequest) {
  // Auth check
  if (!validateAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    let body: PostBody = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is OK
    }

    // Use env webhook if not provided
    const webhookUrl = body.webhookUrl || process.env.RELAYER_ALERT_WEBHOOK;

    const alertConfig: AlertConfig = {
      webhookUrl,
      minNativeBalance: body.minNativeBalance,
      minUsdt0Balance: body.minUsdt0Balance,
      enabled: true,
    };

    const { status, alertsSent } = await checkAndAlert(alertConfig);

    if (!status) {
      return NextResponse.json(
        {
          error: 'Relayer wallet not configured',
          hint: 'Set RELAYER_PRIVATE_KEY environment variable',
        },
        { status: 503 }
      );
    }

    // Force alert for testing
    if (body.forceAlert && webhookUrl && !alertsSent) {
      const { sendLowBalanceAlert } = await import('@/lib/relayer-wallet');
      // Temporarily set flags to trigger alert
      const forcedStatus = {
        ...status,
        lowNativeBalance: true,
        lowUsdt0Balance: true,
      };
      await sendLowBalanceAlert(forcedStatus, webhookUrl);
    }

    const needsAttention = status.lowNativeBalance || status.lowUsdt0Balance;

    return NextResponse.json({
      success: true,
      status: {
        address: status.address,
        label: status.label,
        nativeBalance: status.nativeBalance,
        usdt0Balance: status.usdt0Balance,
        estimatedTxRemaining: status.estimatedTxRemaining,
      },
      alerts: {
        needed: needsAttention,
        sent: alertsSent,
        webhookConfigured: !!webhookUrl,
        lowNativeBalance: status.lowNativeBalance,
        lowUsdt0Balance: status.lowUsdt0Balance,
      },
      timestamp: status.timestamp,
    });
  } catch (error) {
    console.error('[admin/relayer] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to check relayer status' },
      { status: 500 }
    );
  }
}
