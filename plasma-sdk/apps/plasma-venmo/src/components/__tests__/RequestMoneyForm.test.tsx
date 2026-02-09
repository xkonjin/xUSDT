import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestMoneyForm } from "../RequestMoneyForm";

// Mock fetch
global.fetch = jest.fn();

describe("RequestMoneyForm", () => {
  const mockWalletAddress =
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7" as `0x${string}`;
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          paymentLink: { id: "123", url: "https://plasma.to/pay/123" },
        }),
    });
  });

  it("renders the request money form", () => {
    render(
      <RequestMoneyForm
        walletAddress={mockWalletAddress}
        onSuccess={mockOnSuccess}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Request Money" })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
  });

  it("disables submit button when wallet is not connected", () => {
    render(
      <RequestMoneyForm walletAddress={undefined} onSuccess={mockOnSuccess} />
    );

    const form = document.querySelector("form")!;
    const submitButton = within(form).getByRole("button");
    expect(submitButton).toBeDisabled();
  });

  it("validates amount - zero is invalid", async () => {
    render(
      <RequestMoneyForm
        walletAddress={mockWalletAddress}
        onSuccess={mockOnSuccess}
      />
    );

    const amountInput = screen.getByPlaceholderText("0.00");
    const form = document.querySelector("form")!;
    const submitButton = within(form).getByRole("button");

    await userEvent.type(amountInput, "0");

    // canSubmit requires parsedAmount > 0
    expect(submitButton).toBeDisabled();
  });

  it("enables submit with valid amount", async () => {
    render(
      <RequestMoneyForm
        walletAddress={mockWalletAddress}
        onSuccess={mockOnSuccess}
      />
    );

    const amountInput = screen.getByPlaceholderText("0.00");
    const form = document.querySelector("form")!;
    const submitButton = within(form).getByRole("button");

    await userEvent.type(amountInput, "25");

    expect(submitButton).toBeEnabled();
  });

  it("submits request successfully", async () => {
    render(
      <RequestMoneyForm
        walletAddress={mockWalletAddress}
        onSuccess={mockOnSuccess}
      />
    );

    const amountInput = screen.getByPlaceholderText("0.00");
    const form = document.querySelector("form")!;
    const submitButton = within(form).getByRole("button");

    await userEvent.type(amountInput, "25");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/payment-links",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("shows share view after successful request", async () => {
    render(
      <RequestMoneyForm
        walletAddress={mockWalletAddress}
        onSuccess={mockOnSuccess}
      />
    );

    const amountInput = screen.getByPlaceholderText("0.00");
    const form = document.querySelector("form")!;
    const submitButton = within(form).getByRole("button");

    await userEvent.type(amountInput, "25");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Share Your Request")).toBeInTheDocument();
    });
  });

  it("handles API error gracefully", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Failed to create request" }),
    });

    render(
      <RequestMoneyForm
        walletAddress={mockWalletAddress}
        onSuccess={mockOnSuccess}
      />
    );

    const amountInput = screen.getByPlaceholderText("0.00");
    const form = document.querySelector("form")!;
    const submitButton = within(form).getByRole("button");

    await userEvent.type(amountInput, "25");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });
});
