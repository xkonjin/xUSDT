import { sendMoney } from "@/lib/send";

// Mock viem
jest.mock("viem", () => ({
  parseUnits: jest.fn(() => BigInt(1000000)),
}));

// Mock @plasma-pay/core via the resolved path (moduleNameMapper resolves to source)
jest.mock("@plasma-pay/core", () => ({
  PLASMA_MAINNET_CHAIN_ID: 9745,
  USDT0_ADDRESS: "0x4444444444444444444444444444444444444444",
  splitSignature: jest.fn(),
}));

// Mock @plasma-pay/gasless via the resolved path
jest.mock("@plasma-pay/gasless", () => ({
  createTransferParams: jest.fn(),
  buildTransferAuthorizationTypedData: jest.fn(),
}));

// Mock local modules
jest.mock("@/lib/crypto", () => ({
  splitSignature: jest.fn(),
}));

jest.mock("@/lib/retry", () => ({
  withRetry: jest.fn(),
  isRetryableError: jest.fn(),
}));

// Import mocked modules after jest.mock calls
import {
  createTransferParams,
  buildTransferAuthorizationTypedData,
} from "@plasma-pay/gasless";
import { splitSignature } from "@/lib/crypto";
import { withRetry } from "@/lib/retry";

const mockCreateTransferParams = createTransferParams as jest.MockedFunction<
  typeof createTransferParams
>;
const mockBuildTransferAuth =
  buildTransferAuthorizationTypedData as jest.MockedFunction<
    typeof buildTransferAuthorizationTypedData
  >;
const mockSplitSignature = splitSignature as jest.MockedFunction<
  typeof splitSignature
>;
const mockWithRetry = withRetry as jest.MockedFunction<typeof withRetry>;

const mockWallet = {
  address: "0x1111111111111111111111111111111111111111",
  signTypedData: jest.fn(),
};

const mockParams = {
  from: "0x1111111111111111111111111111111111111111",
  to: "0x2222222222222222222222222222222222222222",
  value: BigInt(1000000),
  validAfter: 0,
  validBefore: 999999999,
  nonce: "0x" + "1".repeat(64),
};

const mockSignatureParts = {
  v: 27,
  r: "0x" + "2".repeat(64),
  s: "0x" + "3".repeat(64),
};

const mockJsonResponse = (data: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 400,
  json: async () => data,
});

describe("sendMoney", () => {
  const originalMerchant = process.env.NEXT_PUBLIC_MERCHANT_ADDRESS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTransferParams.mockReturnValue(mockParams as any);
    mockBuildTransferAuth.mockReturnValue({
      domain: {},
      types: {},
      primaryType: "TransferWithAuthorization",
      message: {},
    } as any);
    mockSplitSignature.mockReturnValue(mockSignatureParts as any);
    mockWithRetry.mockImplementation(async (fn: () => Promise<unknown>) =>
      fn()
    );
    mockWallet.signTypedData.mockResolvedValue("0xsignature");
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MERCHANT_ADDRESS = originalMerchant;
  });

  it("returns an error when recipient resolution fails", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ error: "Recipient not found" }, false)
    );

    const result = await sendMoney(mockWallet as any, {
      recipientIdentifier: "missing@example.com",
      amount: "10.00",
    });

    expect(result).toEqual({
      success: false,
      error: "Recipient not found",
    });
  });

  it("submits a direct transfer for registered recipients", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch
      .mockResolvedValueOnce(
        mockJsonResponse({ needsClaim: false, address: mockParams.to })
      )
      .mockResolvedValueOnce(mockJsonResponse({ txHash: "0xabc" }));

    const result = await sendMoney(mockWallet as any, {
      recipientIdentifier: "0x2222222222222222222222222222222222222222",
      amount: "1.00",
      memo: "Lunch",
      senderEmail: "sender@example.com",
    });

    expect(result).toEqual({ success: true, txHash: "0xabc" });
    expect(mockWithRetry).toHaveBeenCalledTimes(1);
    expect(mockCreateTransferParams).toHaveBeenCalledWith(
      mockWallet.address,
      mockParams.to,
      expect.any(BigInt)
    );

    const submitBody = JSON.parse(
      (mockFetch.mock.calls[1] as any)[1].body as string
    );
    expect(submitBody).toMatchObject({
      from: mockParams.from,
      to: mockParams.to,
      value: mockParams.value.toString(),
      validAfter: mockParams.validAfter,
      validBefore: mockParams.validBefore,
      nonce: mockParams.nonce,
      v: mockSignatureParts.v,
      r: mockSignatureParts.r,
      s: mockSignatureParts.s,
    });
  });

  it("returns an error when submit-transfer fails", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch
      .mockResolvedValueOnce(
        mockJsonResponse({ needsClaim: false, address: mockParams.to })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({ message: "Transfer failed" }, false)
      );

    const result = await sendMoney(mockWallet as any, {
      recipientIdentifier: "0x2222222222222222222222222222222222222222",
      amount: "1.00",
    });

    expect(result).toEqual({
      success: false,
      error: "Transfer failed",
    });
  });

  it("blocks claim flow when escrow address is missing", async () => {
    process.env.NEXT_PUBLIC_MERCHANT_ADDRESS = "";
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ needsClaim: true }));

    const result = await sendMoney(mockWallet as any, {
      recipientIdentifier: "unregistered@example.com",
      amount: "5.00",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/claim links are currently unavailable/i);
  });

  it("creates claims and submits escrow transfer for unregistered recipients", async () => {
    process.env.NEXT_PUBLIC_MERCHANT_ADDRESS =
      "0x3333333333333333333333333333333333333333";
    const mockFetch = global.fetch as jest.Mock;
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ needsClaim: true }))
      .mockResolvedValueOnce(
        mockJsonResponse({ claimUrl: "https://plasma.to/claim/abc" })
      )
      .mockResolvedValueOnce(mockJsonResponse({ txHash: "0xescrow" }))
      .mockResolvedValueOnce(mockJsonResponse({ success: true }));

    const result = await sendMoney(mockWallet as any, {
      recipientIdentifier: "newuser@example.com",
      amount: "12.34",
      memo: "Welcome",
      senderEmail: "sender@example.com",
    });

    expect(result).toEqual({
      success: true,
      needsClaim: true,
      claimUrl: "https://plasma.to/claim/abc",
    });

    const claimBody = JSON.parse(
      (mockFetch.mock.calls[1] as any)[1].body as string
    );
    expect(claimBody).toMatchObject({
      senderAddress: mockParams.from,
      recipientEmail: "newuser@example.com",
      amount: "12.34",
      memo: "Welcome",
    });
  });

  it("returns an error when claim creation fails", async () => {
    process.env.NEXT_PUBLIC_MERCHANT_ADDRESS =
      "0x3333333333333333333333333333333333333333";
    const mockFetch = global.fetch as jest.Mock;
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ needsClaim: true }))
      .mockResolvedValueOnce(
        mockJsonResponse({ error: "Claim failed" }, false)
      );

    const result = await sendMoney(mockWallet as any, {
      recipientIdentifier: "newuser@example.com",
      amount: "12.34",
    });

    expect(result).toEqual({
      success: false,
      error: "Claim failed",
    });
  });
});
