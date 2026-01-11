/**
 * Stream Contract Interface
 *
 * Defines the interface for Sablier-style payment streaming contracts.
 * This abstraction allows easy swapping between mock (database) and
 * real on-chain contract implementations.
 *
 * Based on Sablier V2 streaming protocol patterns:
 * - Linear streams with optional cliff periods
 * - Cancelable streams (sender can reclaim unvested funds)
 * - Withdrawable by recipient at any time after cliff
 */

/**
 * Stream data structure representing a payment stream
 */
export interface Stream {
  /** Unique stream identifier (database ID or on-chain stream ID) */
  id: string;
  /** Address of the stream sender (funds provider) */
  sender: string;
  /** Address of the stream recipient */
  recipient: string;
  /** Total deposited amount in smallest unit (6 decimals for USDT) */
  depositAmount: string;
  /** Amount already withdrawn by recipient */
  withdrawnAmount: string;
  /** Unix timestamp when stream started */
  startTime: number;
  /** Unix timestamp when stream ends (fully vested) */
  endTime: number;
  /** Unix timestamp before which no withdrawals are allowed */
  cliffTime: number;
  /** Amount that vests at cliff time */
  cliffAmount: string;
  /** Token amount that vests per second */
  ratePerSecond: string;
  /** Whether sender can cancel the stream */
  cancelable: boolean;
  /** Whether stream is still active (not cancelled or fully withdrawn) */
  active: boolean;
}

/**
 * Parameters for creating a new stream
 */
export interface CreateStreamParams {
  /** Sender wallet address */
  sender: string;
  /** Recipient wallet address */
  recipient: string;
  /** Total amount to stream (in smallest unit, 6 decimals) */
  depositAmount: string;
  /** Stream duration in seconds */
  duration: number;
  /** Optional cliff period in seconds (default: 0) */
  cliffDuration?: number;
  /** Whether sender can cancel the stream (default: true) */
  cancelable?: boolean;
}

/**
 * Result of creating a stream
 */
export interface CreateStreamResult {
  success: boolean;
  streamId?: string;
  stream?: Stream;
  txHash?: string;
  error?: string;
}

/**
 * Result of withdrawing from a stream
 */
export interface WithdrawResult {
  success: boolean;
  txHash?: string;
  amount?: string;
  amountFormatted?: string;
  details?: {
    streamId: string;
    totalVested: string;
    previouslyWithdrawn: string;
    newWithdrawal: string;
    remainingInStream: string;
  };
  error?: string;
}

/**
 * Result of cancelling a stream
 */
export interface CancelResult {
  success: boolean;
  txHash?: string;
  details?: {
    streamId: string;
    totalDeposit: string;
    vestedForRecipient: string;
    alreadyWithdrawn: string;
    remainingForRecipient: string;
    refundForSender: string;
    refundForSenderFormatted: string;
  };
  error?: string;
}

/**
 * Balance information for a stream
 */
export interface BalanceInfo {
  /** Amount available for withdrawal right now */
  withdrawable: string;
  /** Total amount that has vested (may include already withdrawn) */
  vested: string;
  /** Amount already withdrawn */
  withdrawn: string;
  /** Total deposited amount */
  total: string;
}

/**
 * Interface for stream contract operations
 *
 * Implement this interface for:
 * - MockStreamService: Uses database for simulation (current implementation)
 * - ContractStreamService: Uses real on-chain Sablier-style contracts
 */
export interface IStreamContract {
  /**
   * Create a new payment stream
   *
   * Mock: Creates a database entry
   * Contract: Calls createStream on the streaming contract, locks funds
   */
  createStream(params: CreateStreamParams): Promise<CreateStreamResult>;

  /**
   * Withdraw available (vested) funds from a stream
   *
   * Mock: Updates database withdrawn amount
   * Contract: Calls withdrawFromStream, transfers vested tokens to recipient
   *
   * @param streamId - The stream identifier
   * @param recipientAddress - Address of the caller (must be recipient)
   */
  withdrawFromStream(
    streamId: string,
    recipientAddress: string
  ): Promise<WithdrawResult>;

  /**
   * Cancel an active stream (sender only)
   *
   * Mock: Marks stream as inactive in database
   * Contract: Calls cancelStream, returns unvested tokens to sender
   *
   * @param streamId - The stream identifier
   * @param senderAddress - Address of the caller (must be sender)
   */
  cancelStream(streamId: string, senderAddress: string): Promise<CancelResult>;

  /**
   * Get stream details by ID
   *
   * Mock: Fetches from database
   * Contract: Calls getStream view function
   */
  getStream(streamId: string): Promise<Stream | null>;

  /**
   * Get withdrawable balance for a stream
   *
   * Mock: Calculates based on time elapsed
   * Contract: Calls balanceOf view function
   */
  balanceOf(streamId: string): Promise<BalanceInfo>;

  /**
   * Get all streams for an address
   *
   * Mock: Queries database
   * Contract: Indexes contract events or uses subgraph
   *
   * @param address - Wallet address
   * @param role - 'sending' or 'receiving'
   */
  getStreamsByAddress(
    address: string,
    role: 'sending' | 'receiving'
  ): Promise<Stream[]>;
}
