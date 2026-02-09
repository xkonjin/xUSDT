/**
 * SendMoneyForm Component Tests
 * Tests for the main payment form component
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SendMoneyForm } from "../SendMoneyForm";

// Mock dependencies
jest.mock("@/lib/send", () => ({
  sendMoney: jest.fn(),
}));

jest.mock("@/lib/sounds", () => ({
  playSound: jest.fn(),
  hapticFeedback: jest.fn(),
}));

jest.mock("@plasma-pay/ui", () => ({
  useAssistantReaction: () => ({
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onLoading: jest.fn(),
  }),
  getUserFriendlyError: (msg: string) => msg,
  PaymentProgress: () => null,
}));

jest.mock("../ui/Toast", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock("../ui/ModalPortal", () => ({
  ModalPortal: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div data-testid="modal-portal">{children}</div> : null),
}));

jest.mock("../RecentContacts", () => ({
  RecentContacts: () => null,
  default: () => null,
}));

describe("SendMoneyForm", () => {
  const mockWallet = {
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  } as any;

  const defaultProps = {
    wallet: mockWallet,
    balance: "100.00",
    contacts: [] as any[],
    contactsLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the form", () => {
    render(<SendMoneyForm {...defaultProps} />);

    // Component uses aria-label "Recipient email, phone, or wallet address"
    expect(screen.getByLabelText(/recipient/i)).toBeInTheDocument();
    // Component uses aria-label "Payment amount in USD"
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    // Submit button says "Review Payment"
    expect(
      screen.getByRole("button", { name: /review payment/i })
    ).toBeInTheDocument();
  });

  it("should show Send Money heading", () => {
    render(<SendMoneyForm {...defaultProps} />);
    expect(screen.getByText("Send Money")).toBeInTheDocument();
  });

  it("should disable review button when no recipient or amount", () => {
    render(<SendMoneyForm {...defaultProps} />);

    const reviewButton = screen.getByRole("button", {
      name: /review payment/i,
    });
    expect(reviewButton).toBeDisabled();
  });

  it("should show insufficient balance warning when amount exceeds balance", async () => {
    render(<SendMoneyForm {...defaultProps} balance="50.00" />);

    const recipientInput = screen.getByLabelText(/recipient/i);
    fireEvent.change(recipientInput, {
      target: { value: "test@example.com" },
    });

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: "100.00" } });

    await waitFor(() => {
      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
    });
  });

  it("should disable review button when insufficient balance", async () => {
    render(<SendMoneyForm {...defaultProps} balance="25.00" />);

    const recipientInput = screen.getByLabelText(/recipient/i);
    fireEvent.change(recipientInput, {
      target: { value: "test@example.com" },
    });

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: "50.00" } });

    const reviewButton = screen.getByRole("button", { name: /review/i });
    expect(reviewButton).toBeDisabled();
  });

  it("should enable review button when amount is within balance", async () => {
    render(<SendMoneyForm {...defaultProps} balance="100.00" />);

    const recipientInput = screen.getByLabelText(/recipient/i);
    fireEvent.change(recipientInput, {
      target: { value: "test@example.com" },
    });

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: "50.00" } });

    const reviewButton = screen.getByRole("button", { name: /review/i });
    expect(reviewButton).not.toBeDisabled();
  });

  it("should not show insufficient balance when amount equals balance", async () => {
    render(<SendMoneyForm {...defaultProps} balance="100.00" />);

    const recipientInput = screen.getByLabelText(/recipient/i);
    fireEvent.change(recipientInput, {
      target: { value: "test@example.com" },
    });

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: "100.00" } });

    await waitFor(() => {
      expect(
        screen.queryByText(/insufficient balance/i)
      ).not.toBeInTheDocument();
    });
  });

  it("should show amount validation for too-small amounts", async () => {
    render(<SendMoneyForm {...defaultProps} />);

    const recipientInput = screen.getByLabelText(/recipient/i);
    fireEvent.change(recipientInput, {
      target: { value: "test@example.com" },
    });

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: "0.001" } });

    await waitFor(() => {
      expect(screen.getByText(/minimum.*0\.01/i)).toBeInTheDocument();
    });
  });

  it("should show amount validation for too-large amounts", async () => {
    render(<SendMoneyForm {...defaultProps} />);

    const recipientInput = screen.getByLabelText(/recipient/i);
    fireEvent.change(recipientInput, {
      target: { value: "test@example.com" },
    });

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: "10001.00" } });

    await waitFor(() => {
      expect(screen.getByText(/maximum.*10,000/i)).toBeInTheDocument();
    });
  });

  it("should show confirmation modal when submitting valid form", async () => {
    render(<SendMoneyForm {...defaultProps} />);

    const recipientInput = screen.getByLabelText(/recipient/i);
    fireEvent.change(recipientInput, {
      target: { value: "test@example.com" },
    });

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: "10.00" } });

    const reviewButton = screen.getByRole("button", { name: /review/i });
    fireEvent.click(reviewButton);

    await waitFor(() => {
      expect(screen.getByText(/confirm payment/i)).toBeInTheDocument();
    });
  });

  it("should show quick amount buttons", () => {
    render(<SendMoneyForm {...defaultProps} />);

    expect(screen.getByText("$5")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getByText("$50")).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("should show fund wallet button when insufficient balance and handler provided", async () => {
    const mockOnFundWallet = jest.fn();
    render(
      <SendMoneyForm
        {...defaultProps}
        balance="10.00"
        onFundWallet={mockOnFundWallet}
      />
    );

    const recipientInput = screen.getByLabelText(/recipient/i);
    fireEvent.change(recipientInput, {
      target: { value: "test@example.com" },
    });

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: "50.00" } });

    await waitFor(() => {
      expect(screen.getByText(/add funds/i)).toBeInTheDocument();
    });

    const fundButton = screen.getByText(/add funds/i);
    fireEvent.click(fundButton);
    expect(mockOnFundWallet).toHaveBeenCalled();
  });

  it("should handle zero balance correctly", async () => {
    render(<SendMoneyForm {...defaultProps} balance="0.00" />);

    const recipientInput = screen.getByLabelText(/recipient/i);
    fireEvent.change(recipientInput, {
      target: { value: "test@example.com" },
    });

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: "10.00" } });

    await waitFor(() => {
      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
    });

    const reviewButton = screen.getByRole("button", { name: /review/i });
    expect(reviewButton).toBeDisabled();
  });

  it("should show zero fees text", () => {
    render(<SendMoneyForm {...defaultProps} />);
    expect(screen.getByText(/zero fees/i)).toBeInTheDocument();
  });
});
