import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SendMoneyForm } from '../SendMoneyForm'
import * as sendLib from '@/lib/send'

// Mock the send library
jest.mock('@/lib/send')

// Mock the sounds library
jest.mock('@/lib/sounds', () => ({
  playSound: jest.fn(),
  hapticFeedback: jest.fn(),
}))

describe('SendMoneyForm', () => {
  const mockWallet = {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
    chainId: 'eip155:9745',
    walletClient: 'privy',
    connectorType: 'embedded',
    imported: false,
    recoveryMethod: 'privy',
    chainType: 'ethereum',
    signTypedData: jest.fn(),
  } as any

  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the send money form', () => {
    render(<SendMoneyForm wallet={mockWallet} onSuccess={mockOnSuccess} />)
    
    expect(screen.getByText('Send Money')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Email, phone, or wallet/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
    expect(screen.getByText('Review Payment')).toBeInTheDocument()
  })

  it('disables submit button when wallet is not connected', () => {
    render(<SendMoneyForm wallet={null} onSuccess={mockOnSuccess} />)
    
    const form = document.querySelector('form')!
    const submitButton = within(form).getByRole('button', { name: /Review Payment|Send \$/i })
    expect(submitButton).toBeDisabled()
  })

  it('validates recipient input - invalid', async () => {
    render(<SendMoneyForm wallet={mockWallet} onSuccess={mockOnSuccess} />)
    
    const recipientInput = screen.getByPlaceholderText(/Email, phone, or wallet/i)
    const amountInput = screen.getByPlaceholderText('0.00')
    const form = document.querySelector('form')!
    const submitButton = within(form).getByRole('button', { name: /Review Payment|Send \$/i })

    // Invalid recipient
    await userEvent.type(recipientInput, 'invalid')
    await userEvent.type(amountInput, '10')
    
    expect(submitButton).toBeDisabled()
  })

  it('validates recipient input - valid email', async () => {
    render(<SendMoneyForm wallet={mockWallet} onSuccess={mockOnSuccess} />)
    
    const recipientInput = screen.getByPlaceholderText(/Email, phone, or wallet/i)
    const amountInput = screen.getByPlaceholderText('0.00')
    const form = document.querySelector('form')!
    const submitButton = within(form).getByRole('button', { name: /Review Payment|Send \$/i })

    await userEvent.type(recipientInput, 'test@example.com')
    await userEvent.type(amountInput, '10')
    
    expect(submitButton).toBeEnabled()
  })

  it('validates recipient input - valid wallet address', async () => {
    render(<SendMoneyForm wallet={mockWallet} onSuccess={mockOnSuccess} />)
    
    const recipientInput = screen.getByPlaceholderText(/Email, phone, or wallet/i)
    const amountInput = screen.getByPlaceholderText('0.00')
    const form = document.querySelector('form')!
    const submitButton = within(form).getByRole('button', { name: /Review Payment|Send \$/i })

    await userEvent.type(recipientInput, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7')
    await userEvent.type(amountInput, '10')
    
    expect(submitButton).toBeEnabled()
  })

  it('validates amount - zero is invalid', async () => {
    render(<SendMoneyForm wallet={mockWallet} onSuccess={mockOnSuccess} />)
    
    const recipientInput = screen.getByPlaceholderText(/Email, phone, or wallet/i)
    const amountInput = screen.getByPlaceholderText('0.00')
    const form = document.querySelector('form')!
    const submitButton = within(form).getByRole('button', { name: /Review Payment|Send \$/i })

    await userEvent.type(recipientInput, 'test@example.com')
    await userEvent.type(amountInput, '0')
    
    expect(submitButton).toBeDisabled()
  })

  it('validates amount - positive is valid', async () => {
    render(<SendMoneyForm wallet={mockWallet} onSuccess={mockOnSuccess} />)
    
    const recipientInput = screen.getByPlaceholderText(/Email, phone, or wallet/i)
    const amountInput = screen.getByPlaceholderText('0.00')
    const form = document.querySelector('form')!
    const submitButton = within(form).getByRole('button', { name: /Review Payment|Send \$/i })

    await userEvent.type(recipientInput, 'test@example.com')
    await userEvent.type(amountInput, '10.50')
    
    expect(submitButton).toBeEnabled()
  })

  it('shows confirmation modal when form is submitted', async () => {
    render(<SendMoneyForm wallet={mockWallet} balance="100.00" onSuccess={mockOnSuccess} />)
    
    const recipientInput = screen.getByPlaceholderText(/Email, phone, or wallet/i)
    const amountInput = screen.getByPlaceholderText('0.00')
    const form = document.querySelector('form')!
    const submitButton = within(form).getByRole('button', { name: /Review Payment|Send \$/i })

    await userEvent.type(recipientInput, 'test@example.com')
    await userEvent.type(amountInput, '10.50')
    await userEvent.click(submitButton)

    // Check confirmation modal appears
    await waitFor(() => {
      expect(screen.getByText('Confirm Payment')).toBeInTheDocument()
      expect(screen.getByText('Sending')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  it('allows canceling the confirmation modal', async () => {
    render(<SendMoneyForm wallet={mockWallet} balance="100.00" onSuccess={mockOnSuccess} />)
    
    const recipientInput = screen.getByPlaceholderText(/Email, phone, or wallet/i)
    const amountInput = screen.getByPlaceholderText('0.00')
    const form = document.querySelector('form')!
    const submitButton = within(form).getByRole('button', { name: /Review Payment|Send \$/i })

    await userEvent.type(recipientInput, 'test@example.com')
    await userEvent.type(amountInput, '10')
    await userEvent.click(submitButton)

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Confirm Payment')).toBeInTheDocument()
    })

    // Cancel modal
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await userEvent.click(cancelButton)

    // Modal should disappear
    await waitFor(() => {
      expect(screen.queryByText('Confirm Payment')).not.toBeInTheDocument()
    })
  })

  it('shows insufficient balance warning when amount exceeds balance', async () => {
    render(<SendMoneyForm wallet={mockWallet} balance="5.00" onSuccess={mockOnSuccess} />)
    
    const recipientInput = screen.getByPlaceholderText(/Email, phone, or wallet/i)
    const amountInput = screen.getByPlaceholderText('0.00')

    await userEvent.type(recipientInput, 'test@example.com')
    await userEvent.type(amountInput, '10')
    
    await waitFor(() => {
      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument()
    })
  })

  it('prevents submission when balance is insufficient', async () => {
    render(<SendMoneyForm wallet={mockWallet} balance="5.00" onSuccess={mockOnSuccess} />)
    
    const recipientInput = screen.getByPlaceholderText(/Email, phone, or wallet/i)
    const amountInput = screen.getByPlaceholderText('0.00')
    const form = document.querySelector('form')!
    const submitButton = within(form).getByRole('button', { name: /Review Payment|Send \$/i })

    await userEvent.type(recipientInput, 'test@example.com')
    await userEvent.type(amountInput, '10')
    await userEvent.click(submitButton)

    // Should show error, not confirmation modal
    await waitFor(() => {
      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument()
      expect(screen.queryByText('Confirm Payment')).not.toBeInTheDocument()
    })
  })
})
