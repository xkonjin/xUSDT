import { getUserFriendlyError, getErrorAction } from '../error-messages';

describe('getUserFriendlyError', () => {
  it('should handle user rejection errors', () => {
    const error = new Error('User rejected the request');
    const message = getUserFriendlyError(error);
    expect(message).toBe('Transaction cancelled. Please try again when ready.');
  });

  it('should handle wallet not found errors', () => {
    const error = new Error('No wallet found');
    const message = getUserFriendlyError(error);
    expect(message).toBe('No wallet detected. Please install MetaMask or another Web3 wallet.');
  });

  it('should handle insufficient balance errors', () => {
    const error = new Error('Insufficient funds for transfer');
    const message = getUserFriendlyError(error);
    expect(message).toBe('Insufficient balance. Please add funds to continue.');
  });

  it('should handle network errors', () => {
    const error = new Error('Network connection failed');
    const message = getUserFriendlyError(error);
    expect(message).toBe('Network connection lost. Please check your internet and try again.');
  });

  it('should handle timeout errors', () => {
    const error = new Error('Request timed out');
    const message = getUserFriendlyError(error);
    expect(message).toBe('Request timed out. Please try again.');
  });

  it('should handle contract revert errors', () => {
    const error = new Error('execution reverted');
    const message = getUserFriendlyError(error);
    expect(message).toBe('Transaction failed. Please check your balance and try again.');
  });

  it('should handle server errors', () => {
    const error = new Error('empty or invalid response from server');
    const message = getUserFriendlyError(error);
    expect(message).toBe('Server error. Please try again in a moment.');
  });

  it('should handle gas errors', () => {
    const error = new Error('out of gas');
    const message = getUserFriendlyError(error);
    expect(message).toBe('Transaction requires more gas. Please try again.');
  });

  it('should handle deadline errors', () => {
    const error = new Error('deadline expired');
    const message = getUserFriendlyError(error);
    expect(message).toBe('Payment authorization expired. Please request a new payment.');
  });

  it('should handle generic errors', () => {
    const error = new Error('Something went wrong');
    const message = getUserFriendlyError(error);
    expect(message).toBe('Something went wrong. Please try again or contact support.');
  });

  it('should handle unknown errors', () => {
    const error = 'Unknown error';
    const message = getUserFriendlyError(error);
    expect(message).toBe('Transaction failed. Please try again or contact support.');
  });
});

describe('getErrorAction', () => {
  it('should return Add Funds action for insufficient balance', () => {
    const error = new Error('Insufficient balance');
    const action = getErrorAction(error);
    expect(action).toBe('Add Funds');
  });

  it('should return Install Wallet action for missing wallet', () => {
    const error = new Error('wallet not found');
    const action = getErrorAction(error);
    expect(action).toBe('Install Wallet');
  });

  it('should return Retry action for network errors', () => {
    const error = new Error('network connection failed');
    const action = getErrorAction(error);
    expect(action).toBe('Retry');
  });

  it('should return null for errors without specific actions', () => {
    const error = new Error('Generic error');
    const action = getErrorAction(error);
    expect(action).toBeNull();
  });
});
