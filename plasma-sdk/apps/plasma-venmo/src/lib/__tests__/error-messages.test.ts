import { getUserFriendlyError } from "../error-messages";

describe("getUserFriendlyError", () => {
  it("maps ERC20 balance exceeded error", () => {
    const error = "ERC20: transfer amount exceeds balance";
    const result = getUserFriendlyError(error);
    expect(result).toBe("Insufficient balance. Please add funds to continue.");
  });

  it("maps exceeds balance error", () => {
    const error = "transfer amount exceeds balance";
    const result = getUserFriendlyError(error);
    expect(result).toBe("Insufficient balance. Please add funds to continue.");
  });

  it("maps empty or invalid response error", () => {
    const error = "Empty or invalid response from server";
    const result = getUserFriendlyError(error);
    expect(result).toBe("Something went wrong. Please try again.");
  });

  it("maps network errors", () => {
    expect(getUserFriendlyError("Network error occurred")).toBe(
      "Network issue. Check your connection and try again."
    );
    expect(getUserFriendlyError("ETIMEDOUT")).toBe(
      "Network issue. Check your connection and try again."
    );
    expect(getUserFriendlyError("fetch failed")).toBe(
      "Network issue. Check your connection and try again."
    );
  });

  it("maps user rejection errors", () => {
    expect(getUserFriendlyError("user rejected transaction")).toBe(
      "Transaction cancelled."
    );
    expect(getUserFriendlyError("User denied transaction signature")).toBe(
      "Transaction cancelled."
    );
  });

  it("maps deadline errors", () => {
    const error = "Transaction deadline exceeded";
    const result = getUserFriendlyError(error);
    expect(result).toBe("Transaction expired. Please try again.");
  });

  it("maps nonce errors", () => {
    const error = "nonce has already been used";
    const result = getUserFriendlyError(error);
    expect(result).toBe(
      "Transaction conflict. Please wait a moment and try again."
    );
  });

  it("handles Error objects", () => {
    const error = new Error("ERC20: transfer amount exceeds balance");
    const result = getUserFriendlyError(error);
    expect(result).toBe("Insufficient balance. Please add funds to continue.");
  });

  it("handles error objects with message property", () => {
    const error = { message: "user rejected transaction" };
    const result = getUserFriendlyError(error);
    expect(result).toBe("Transaction cancelled.");
  });

  it("falls back to base error handler for unknown errors", () => {
    const error = "Some random error message";
    const result = getUserFriendlyError(error);
    expect(result).toContain("Something went wrong");
  });

  it("handles rate limit errors from base handler", () => {
    const error = "Too many requests - 429";
    const result = getUserFriendlyError(error);
    expect(result).toContain("many requests");
  });

  it("handles timeout errors from base handler", () => {
    const error = "Request timed out";
    const result = getUserFriendlyError(error);
    expect(result).toContain("timed out");
  });
});
