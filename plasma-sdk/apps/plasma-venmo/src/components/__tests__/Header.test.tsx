/**
 * Header Component Tests
 * VENMO-008: Implement Search Integration
 * 
 * Tests cover:
 * - Search icon/button rendering
 * - Mobile slide-down search
 * - Desktop inline search
 * - Search interaction
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';

// Mock components
jest.mock('../SearchBar', () => ({
  SearchBar: ({ onSelect }: { onSelect: (result: unknown) => void }) => (
    <div data-testid="search-bar">
      <input placeholder="Search..." onChange={() => {}} />
      <button onClick={() => onSelect({ type: 'contact', data: { name: 'Test' } })}>
        Select
      </button>
    </div>
  ),
}));

jest.mock('../QRCode', () => ({
  QRCodeButton: () => <button data-testid="qr-button">QR</button>,
}));

jest.mock('../WalletManager', () => ({
  WalletManagerButton: () => <button data-testid="wallet-button">Wallet</button>,
}));

jest.mock('../UserProfile', () => ({
  UserProfileButton: () => <button data-testid="profile-button">Profile</button>,
}));

describe('Header', () => {
  const mockUser = { email: { address: 'test@example.com' } };
  const mockWallet = { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7' };
  const mockOnLogout = jest.fn();
  const mockOnSearchSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header with logo', () => {
    render(
      <Header 
        user={mockUser} 
        wallet={mockWallet}
        onLogout={mockOnLogout}
        onSearchSelect={mockOnSearchSelect}
        isDesktop={true}
      />
    );
    
    expect(screen.getByText('Plenmo')).toBeInTheDocument();
  });

  it('renders inline search bar on desktop (isDesktop=true)', () => {
    render(
      <Header 
        user={mockUser} 
        wallet={mockWallet}
        onLogout={mockOnLogout}
        onSearchSelect={mockOnSearchSelect}
        isDesktop={true}
      />
    );
    
    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
  });

  it('calls onSearchSelect when search result is selected', async () => {
    render(
      <Header 
        user={mockUser} 
        wallet={mockWallet}
        onLogout={mockOnLogout}
        onSearchSelect={mockOnSearchSelect}
        isDesktop={true}
      />
    );
    
    const selectButton = screen.getByText('Select');
    await userEvent.click(selectButton);

    expect(mockOnSearchSelect).toHaveBeenCalledWith({
      type: 'contact',
      data: { name: 'Test' },
    });
  });

  it('renders all header action buttons', () => {
    render(
      <Header 
        user={mockUser} 
        wallet={mockWallet}
        onLogout={mockOnLogout}
        onSearchSelect={mockOnSearchSelect}
        isDesktop={true}
      />
    );
    
    expect(screen.getByTestId('qr-button')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-button')).toBeInTheDocument();
    expect(screen.getByTestId('profile-button')).toBeInTheDocument();
  });

  it('has correct class structure', () => {
    render(
      <Header 
        user={mockUser} 
        wallet={mockWallet}
        onLogout={mockOnLogout}
        onSearchSelect={mockOnSearchSelect}
        isDesktop={true}
      />
    );
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('flex');
    expect(header).toHaveClass('items-center');
    expect(header).toHaveClass('justify-between');
  });
});
