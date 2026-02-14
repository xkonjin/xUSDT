import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { OfflineIndicator } from "../OfflineIndicator";
import { isOnline, setupNetworkListeners } from "@/lib/pwa";

const mockedIsOnline = isOnline as jest.Mock;
const mockedSetupNetworkListeners = setupNetworkListeners as jest.Mock;

// Mock PWA utilities
jest.mock("@/lib/pwa", () => ({
  isOnline: jest.fn(),
  setupNetworkListeners: jest.fn(),
}));

describe("OfflineIndicator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when online by default", () => {
    mockedIsOnline.mockReturnValue(true);

    render(<OfflineIndicator />);
    expect(screen.queryByText("Back online")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No internet connection")
    ).not.toBeInTheDocument();
  });

  it("shows offline message when initially offline", () => {
    mockedIsOnline.mockReturnValue(false);
    mockedSetupNetworkListeners.mockReturnValue(jest.fn());

    render(<OfflineIndicator />);
    // Component renders because online=false, even though showMessage=false
    // The condition `!showMessage && online` returns null only when online
    expect(screen.queryByText("Back online")).not.toBeInTheDocument();
    expect(screen.getByText("No internet connection")).toBeInTheDocument();
  });

  it("shows online message when coming back online", async () => {
    mockedIsOnline.mockReturnValue(false);
    let onOnlineCallback: (() => void) | null = null;

    mockedSetupNetworkListeners.mockImplementation((onOnline: () => void) => {
      onOnlineCallback = onOnline;
      return () => {};
    });

    render(<OfflineIndicator />);

    // Simulate coming online
    expect(onOnlineCallback).not.toBeNull();
    if (onOnlineCallback) {
      onOnlineCallback();
    }

    await waitFor(() => {
      expect(screen.getByText("Back online")).toBeInTheDocument();
    });
  });

  it("shows offline message when going offline", async () => {
    mockedIsOnline.mockReturnValue(true);
    let onOfflineCallback: (() => void) | null = null;

    mockedSetupNetworkListeners.mockImplementation(
      (onOnline: () => void, onOffline: () => void) => {
        onOfflineCallback = onOffline;
        return () => {};
      }
    );

    render(<OfflineIndicator />);

    // Simulate going offline
    expect(onOfflineCallback).not.toBeNull();
    if (onOfflineCallback) {
      onOfflineCallback();
    }

    await waitFor(() => {
      expect(screen.getByText("No internet connection")).toBeInTheDocument();
    });
  });

  it("hides online message after 3 seconds", async () => {
    mockedIsOnline.mockReturnValue(false);
    let onOnlineCallback: (() => void) | null = null;

    mockedSetupNetworkListeners.mockImplementation((onOnline: () => void) => {
      onOnlineCallback = onOnline;
      return () => {};
    });

    render(<OfflineIndicator />);

    // Simulate coming online
    if (onOnlineCallback) {
      onOnlineCallback();
    }

    await waitFor(() => {
      expect(screen.getByText("Back online")).toBeInTheDocument();
    });

    // Wait for message to hide (3 seconds)
    await waitFor(
      () => {
        expect(screen.queryByText("Back online")).not.toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });

  it("applies correct styling for online state", async () => {
    mockedIsOnline.mockReturnValue(false);
    let onOnlineCallback: (() => void) | null = null;

    mockedSetupNetworkListeners.mockImplementation((onOnline: () => void) => {
      onOnlineCallback = onOnline;
      return () => {};
    });

    render(<OfflineIndicator />);

    if (onOnlineCallback) {
      onOnlineCallback();
    }

    await waitFor(() => {
      const container = screen.getByText("Back online").closest(".clay-card");
      expect(container).toHaveClass("bg-green-500/20");
      expect(container).toHaveClass("border-green-500/30");
    });
  });

  it("applies correct styling for offline state", async () => {
    mockedIsOnline.mockReturnValue(true);
    let onOfflineCallback: (() => void) | null = null;

    mockedSetupNetworkListeners.mockImplementation(
      (onOnline: () => void, onOffline: () => void) => {
        onOfflineCallback = onOffline;
        return () => {};
      }
    );

    render(<OfflineIndicator />);

    if (onOfflineCallback) {
      onOfflineCallback();
    }

    await waitFor(() => {
      const container = screen
        .getByText("No internet connection")
        .closest(".clay-card");
      expect(container).toHaveClass("bg-orange-500/20");
      expect(container).toHaveClass("border-orange-500/30");
    });
  });

  it("shows green indicator for online state", async () => {
    mockedIsOnline.mockReturnValue(false);
    let onOnlineCallback: (() => void) | null = null;

    mockedSetupNetworkListeners.mockImplementation((onOnline: () => void) => {
      onOnlineCallback = onOnline;
      return () => {};
    });

    render(<OfflineIndicator />);

    if (onOnlineCallback) {
      onOnlineCallback();
    }

    await waitFor(() => {
      const indicator = document.querySelector(".bg-green-400");
      expect(indicator).toBeInTheDocument();
    });
  });

  it("shows orange indicator for offline state", async () => {
    mockedIsOnline.mockReturnValue(true);
    let onOfflineCallback: (() => void) | null = null;

    mockedSetupNetworkListeners.mockImplementation(
      (onOnline: () => void, onOffline: () => void) => {
        onOfflineCallback = onOffline;
        return () => {};
      }
    );

    render(<OfflineIndicator />);

    if (onOfflineCallback) {
      onOfflineCallback();
    }

    await waitFor(() => {
      const indicator = document.querySelector(".bg-orange-400");
      expect(indicator).toBeInTheDocument();
    });
  });

  it("sets up network listeners on mount", () => {
    mockedIsOnline.mockReturnValue(true);

    render(<OfflineIndicator />);

    expect(setupNetworkListeners).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("cleans up network listeners on unmount", () => {
    mockedIsOnline.mockReturnValue(true);
    const cleanup = jest.fn();
    mockedSetupNetworkListeners.mockReturnValue(cleanup);

    const { unmount } = render(<OfflineIndicator />);

    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("handles rapid online/offline switches", async () => {
    mockedIsOnline.mockReturnValue(true);
    let onOnlineCallback: (() => void) | null = null;
    let onOfflineCallback: (() => void) | null = null;

    mockedSetupNetworkListeners.mockImplementation(
      (onOnline: () => void, onOffline: () => void) => {
        onOnlineCallback = onOnline;
        onOfflineCallback = onOffline;
        return () => {};
      }
    );

    render(<OfflineIndicator />);

    // Go offline
    if (onOfflineCallback) {
      onOfflineCallback();
    }

    await waitFor(() => {
      expect(screen.getByText("No internet connection")).toBeInTheDocument();
    });

    // Come back online
    if (onOnlineCallback) {
      onOnlineCallback();
    }

    await waitFor(() => {
      expect(screen.getByText("Back online")).toBeInTheDocument();
      expect(
        screen.queryByText("No internet connection")
      ).not.toBeInTheDocument();
    });
  });

  it("has correct positioning", async () => {
    mockedIsOnline.mockReturnValue(false);
    let onOfflineCallback: (() => void) | null = null;

    mockedSetupNetworkListeners.mockImplementation(
      (onOnline: () => void, onOffline: () => void) => {
        onOfflineCallback = onOffline;
        return () => {};
      }
    );

    render(<OfflineIndicator />);

    if (onOfflineCallback) {
      onOfflineCallback();
    }

    await waitFor(() => {
      // The text is inside span > .clay-card div > outer fixed div
      const innerDiv = screen
        .getByText("No internet connection")
        .closest(".clay-card");
      const outerDiv = innerDiv?.parentElement;
      expect(outerDiv).toHaveClass("fixed");
      expect(outerDiv).toHaveClass("top-4");
      expect(outerDiv).toHaveClass("left-1/2");
      expect(outerDiv).toHaveClass("-translate-x-1/2");
    });
  });

  it("applies transition classes", async () => {
    mockedIsOnline.mockReturnValue(false);
    let onOfflineCallback: (() => void) | null = null;

    mockedSetupNetworkListeners.mockImplementation(
      (onOnline: () => void, onOffline: () => void) => {
        onOfflineCallback = onOffline;
        return () => {};
      }
    );

    render(<OfflineIndicator />);

    if (onOfflineCallback) {
      onOfflineCallback();
    }

    await waitFor(() => {
      const innerDiv = screen
        .getByText("No internet connection")
        .closest(".clay-card");
      const outerDiv = innerDiv?.parentElement;
      expect(outerDiv).toHaveClass("transition-all");
      expect(outerDiv).toHaveClass("duration-300");
    });
  });
});
