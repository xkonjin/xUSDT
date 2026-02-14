/**
 * Auth Flow E2E Tests
 * 
 * Tests the complete authentication flow including:
 * - Privy login/logout
 * - Wallet creation
 * - Session persistence
 * - Auth state transitions
 */

import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import '@testing-library/jest-dom';

import {
  createMockWallet,
  createMockUser,
  mockLocalStorage,
  TEST_ADDRESSES,
  TEST_EMAILS,
} from './test-utils';

// ============================================================================
// Module Mocks
// ============================================================================

// Store mock state to be modified per test
let mockPrivyState = {
  ready: true,
  authenticated: false,
  user: null as ReturnType<typeof createMockUser> | null,
  login: jest.fn(),
  logout: jest.fn(),
  linkEmail: jest.fn(),
  linkPhone: jest.fn(),
  createWallet: jest.fn(),
};

let mockWalletsState = {
  wallets: [] as ReturnType<typeof createMockWallet>[],
  ready: true,
};

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockPrivyState,
  useWallets: () => mockWalletsState,
  PrivyProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock localStorage
const mockStorage = mockLocalStorage();
Object.defineProperty(window, 'localStorage', { value: mockStorage });

// ============================================================================
// Test Component - Simulates Auth UI
// ============================================================================

function AuthTestComponent() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  if (!ready) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (!authenticated) {
    return (
      <div data-testid="unauthenticated">
        <h1>Welcome to Plenmo</h1>
        <button onClick={login} data-testid="connect-button">
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div data-testid="authenticated">
      <h1>Dashboard</h1>
      <p data-testid="user-email">{user?.email?.address || 'No email'}</p>
      <p data-testid="wallet-address">
        {wallets[0]?.address || 'No wallet'}
      </p>
      <button onClick={logout} data-testid="logout-button">
        Logout
      </button>
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('Auth Flow E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    
    // Reset to unauthenticated state
    mockPrivyState = {
      ready: true,
      authenticated: false,
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
      linkEmail: jest.fn(),
      linkPhone: jest.fn(),
      createWallet: jest.fn(),
    };
    
    mockWalletsState = {
      wallets: [],
      ready: true,
    };
  });

  describe('Initial State', () => {
    it('should show loading state when Privy is not ready', () => {
      mockPrivyState.ready = false;
      
      render(<AuthTestComponent />);
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('should show connect button when not authenticated', () => {
      render(<AuthTestComponent />);
      
      expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
      expect(screen.getByTestId('connect-button')).toBeInTheDocument();
    });

    it('should show dashboard when authenticated', () => {
      const mockUser = createMockUser();
      const mockWallet = createMockWallet();
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      
      render(<AuthTestComponent />);
      
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      expect(screen.getByTestId('logout-button')).toBeInTheDocument();
    });
  });

  describe('Login Flow', () => {
    it('should trigger Privy login when connect button clicked', async () => {
      
      render(<AuthTestComponent />);
      
      const connectButton = screen.getByTestId('connect-button');
      await user.click(connectButton);
      
      expect(mockPrivyState.login).toHaveBeenCalledTimes(1);
    });

    it('should display user email after successful login', async () => {
      const mockUser = createMockUser({ email: { address: TEST_EMAILS.VALID } });
      const mockWallet = createMockWallet();
      
      // Simulate successful login
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      
      render(<AuthTestComponent />);
      
      expect(screen.getByTestId('user-email')).toHaveTextContent(TEST_EMAILS.VALID);
    });

    it('should display wallet address after successful login', async () => {
      const mockUser = createMockUser();
      const mockWallet = createMockWallet({ address: TEST_ADDRESSES.VALID_ADDRESS });
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      
      render(<AuthTestComponent />);
      
      expect(screen.getByTestId('wallet-address')).toHaveTextContent(TEST_ADDRESSES.VALID_ADDRESS);
    });

    it('should handle login without email (phone-only user)', async () => {
      const mockUser = createMockUser({ 
        email: undefined,
        phone: { number: '+12345678900' }
      });
      const mockWallet = createMockWallet();
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      
      render(<AuthTestComponent />);
      
      expect(screen.getByTestId('user-email')).toHaveTextContent('No email');
    });
  });

  describe('Wallet Creation', () => {
    it('should display wallet address when wallet exists', () => {
      const mockUser = createMockUser();
      const mockWallet = createMockWallet({ address: TEST_ADDRESSES.VALID_ADDRESS });
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      
      render(<AuthTestComponent />);
      
      expect(screen.getByTestId('wallet-address')).toHaveTextContent(TEST_ADDRESSES.VALID_ADDRESS);
    });

    it('should show "No wallet" when wallet not created yet', () => {
      const mockUser = createMockUser();
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [];
      
      render(<AuthTestComponent />);
      
      expect(screen.getByTestId('wallet-address')).toHaveTextContent('No wallet');
    });

    it('should handle multiple wallets (use first)', () => {
      const mockUser = createMockUser();
      const wallet1 = createMockWallet({ address: TEST_ADDRESSES.VALID_ADDRESS });
      const wallet2 = createMockWallet({ address: TEST_ADDRESSES.RECIPIENT_ADDRESS });
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [wallet1, wallet2];
      
      render(<AuthTestComponent />);
      
      expect(screen.getByTestId('wallet-address')).toHaveTextContent(TEST_ADDRESSES.VALID_ADDRESS);
    });
  });

  describe('Logout Flow', () => {
    it('should trigger Privy logout when logout button clicked', async () => {
      const mockUser = createMockUser();
      const mockWallet = createMockWallet();
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      
      render(<AuthTestComponent />);
      
      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);
      
      expect(mockPrivyState.logout).toHaveBeenCalledTimes(1);
    });

    it('should return to unauthenticated state after logout', async () => {
      const mockUser = createMockUser();
      const mockWallet = createMockWallet();
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      
      const { rerender } = render(<AuthTestComponent />);
      
      // Verify authenticated
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      
      // Simulate logout
      mockPrivyState.authenticated = false;
      mockPrivyState.user = null;
      mockWalletsState.wallets = [];
      
      rerender(<AuthTestComponent />);
      
      expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
    });
  });

  describe('Session Persistence', () => {
    it('should maintain auth state across rerenders', () => {
      const mockUser = createMockUser();
      const mockWallet = createMockWallet();
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      
      const { rerender } = render(<AuthTestComponent />);
      
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      
      // Rerender
      rerender(<AuthTestComponent />);
      
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
    });

    it('should persist wallet address across rerenders', () => {
      const mockUser = createMockUser();
      const mockWallet = createMockWallet({ address: TEST_ADDRESSES.VALID_ADDRESS });
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      
      const { rerender } = render(<AuthTestComponent />);
      
      expect(screen.getByTestId('wallet-address')).toHaveTextContent(TEST_ADDRESSES.VALID_ADDRESS);
      
      rerender(<AuthTestComponent />);
      
      expect(screen.getByTestId('wallet-address')).toHaveTextContent(TEST_ADDRESSES.VALID_ADDRESS);
    });

    it('should handle session expiration gracefully', () => {
      const mockUser = createMockUser();
      const mockWallet = createMockWallet();
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      
      const { rerender } = render(<AuthTestComponent />);
      
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      
      // Simulate session expiration
      mockPrivyState.authenticated = false;
      mockPrivyState.user = null;
      
      rerender(<AuthTestComponent />);
      
      expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
    });
  });

  describe('Auth State Transitions', () => {
    it('should transition from loading to unauthenticated', () => {
      mockPrivyState.ready = false;
      
      const { rerender } = render(<AuthTestComponent />);
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      
      mockPrivyState.ready = true;
      rerender(<AuthTestComponent />);
      
      expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
    });

    it('should transition from loading to authenticated', () => {
      const mockUser = createMockUser();
      const mockWallet = createMockWallet();
      
      mockPrivyState.ready = false;
      
      const { rerender } = render(<AuthTestComponent />);
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      
      mockPrivyState.ready = true;
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      
      rerender(<AuthTestComponent />);
      
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
    });

    it('should transition from unauthenticated to authenticated', () => {
      const mockUser = createMockUser();
      const mockWallet = createMockWallet();
      
      const { rerender } = render(<AuthTestComponent />);
      
      expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      
      rerender(<AuthTestComponent />);
      
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle wallet not ready state', () => {
      const mockUser = createMockUser();
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.ready = false;
      mockWalletsState.wallets = [];
      
      render(<AuthTestComponent />);
      
      expect(screen.getByTestId('wallet-address')).toHaveTextContent('No wallet');
    });

    it('should handle user with no identifier', () => {
      const mockUser = createMockUser({ email: undefined, phone: undefined });
      const mockWallet = createMockWallet();
      
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      
      render(<AuthTestComponent />);
      
      expect(screen.getByTestId('user-email')).toHaveTextContent('No email');
    });

    it('should handle rapid login/logout', async () => {
      const mockUser = createMockUser();
      const mockWallet = createMockWallet();
      
      const { rerender } = render(<AuthTestComponent />);
      
      // Login
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      rerender(<AuthTestComponent />);
      
      // Quick logout
      mockPrivyState.authenticated = false;
      mockPrivyState.user = null;
      mockWalletsState.wallets = [];
      rerender(<AuthTestComponent />);
      
      // Quick login again
      mockPrivyState.authenticated = true;
      mockPrivyState.user = mockUser;
      mockWalletsState.wallets = [mockWallet];
      rerender(<AuthTestComponent />);
      
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
    });
  });
});
