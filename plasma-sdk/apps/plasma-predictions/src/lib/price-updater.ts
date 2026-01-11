/**
 * Price Updater Service
 * 
 * Provides real-time price updates for prediction markets.
 * Currently implements polling, structured to easily add WebSocket support later.
 */

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type PriceChange = 'up' | 'down' | 'none';

export interface PriceUpdate {
  marketId: string;
  yesPrice: number;
  noPrice: number;
  timestamp: number;
  priceChange: PriceChange;
}

export type PriceUpdateListener = (update: PriceUpdate) => void;
export type ConnectionListener = (status: ConnectionStatus) => void;

interface PriceUpdaterOptions {
  pollingInterval?: number; // in milliseconds
  apiUrl?: string;
}

const DEFAULT_POLLING_INTERVAL = 30000; // 30 seconds
const DEFAULT_API_URL = '/api/markets';

export class PriceUpdater {
  private options: Required<PriceUpdaterOptions>;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private pollingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  // Subscribers by market ID
  private marketListeners: Map<string, Set<PriceUpdateListener>> = new Map();
  private connectionListeners: Set<ConnectionListener> = new Set();
  
  // Track previous prices for change detection
  private previousPrices: Map<string, number> = new Map();

  constructor(options: PriceUpdaterOptions = {}) {
    this.options = {
      pollingInterval: options.pollingInterval ?? DEFAULT_POLLING_INTERVAL,
      apiUrl: options.apiUrl ?? DEFAULT_API_URL,
    };
  }

  /**
   * Subscribe to price updates for a specific market
   * @returns Unsubscribe function
   */
  subscribe(marketId: string, listener: PriceUpdateListener): () => void {
    if (!this.marketListeners.has(marketId)) {
      this.marketListeners.set(marketId, new Set());
    }
    this.marketListeners.get(marketId)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.marketListeners.get(marketId);
      if (listeners) {
        listeners.delete(listener);
        // Clean up empty sets
        if (listeners.size === 0) {
          this.marketListeners.delete(marketId);
        }
      }
    };
  }

  /**
   * Subscribe to connection status changes
   * @returns Unsubscribe function
   */
  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Get currently subscribed market IDs
   */
  getSubscribedMarkets(): string[] {
    return Array.from(this.marketListeners.keys());
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Start the price updater service
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    
    this.setConnectionStatus('connecting');
    this.fetchPrices(); // Immediate first fetch
    
    // Start polling
    this.pollingInterval = setInterval(() => {
      this.fetchPrices();
    }, this.options.pollingInterval);
  }

  /**
   * Stop the price updater service
   */
  stop(): void {
    this.isRunning = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.setConnectionStatus('disconnected');
  }

  /**
   * Clean up and destroy the instance
   */
  destroy(): void {
    this.stop();
    this.marketListeners.clear();
    this.connectionListeners.clear();
    this.previousPrices.clear();
  }

  /**
   * Fetch prices from the API
   */
  private async fetchPrices(): Promise<void> {
    const subscribedMarkets = this.getSubscribedMarkets();
    if (subscribedMarkets.length === 0) {
      this.setConnectionStatus('connected');
      return;
    }

    try {
      const response = await fetch(this.options.apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        // Handle unexpected response format gracefully
        this.setConnectionStatus('connected');
        return;
      }
      
      this.setConnectionStatus('connected');
      
      // Process each market
      for (const market of data) {
        if (!market || !market.id) continue;
        
        const marketId = market.id;
        const listeners = this.marketListeners.get(marketId);
        
        if (!listeners || listeners.size === 0) continue;
        
        // Determine price change
        const currentYesPrice = market.yesPrice ?? 0.5;
        const previousYesPrice = this.previousPrices.get(marketId);
        
        let priceChange: PriceChange = 'none';
        if (previousYesPrice !== undefined) {
          if (currentYesPrice > previousYesPrice) {
            priceChange = 'up';
          } else if (currentYesPrice < previousYesPrice) {
            priceChange = 'down';
          }
        }
        
        // Store current price for next comparison
        this.previousPrices.set(marketId, currentYesPrice);
        
        // Create update object
        const update: PriceUpdate = {
          marketId,
          yesPrice: currentYesPrice,
          noPrice: market.noPrice ?? (1 - currentYesPrice),
          timestamp: Date.now(),
          priceChange,
        };
        
        // Notify all listeners for this market
        for (const listener of listeners) {
          try {
            listener(update);
          } catch (error) {
            console.error('Error in price update listener:', error);
          }
        }
      }
    } catch (error) {
      console.error('Price fetch error:', error);
      this.setConnectionStatus('error');
    }
  }

  /**
   * Update and broadcast connection status
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    for (const listener of this.connectionListeners) {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    }
  }
}

// Singleton instance for app-wide usage
let globalInstance: PriceUpdater | null = null;

export function getGlobalPriceUpdater(): PriceUpdater {
  if (!globalInstance) {
    globalInstance = new PriceUpdater();
  }
  return globalInstance;
}

export function resetGlobalPriceUpdater(): void {
  if (globalInstance) {
    globalInstance.destroy();
    globalInstance = null;
  }
}
