import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InstallPWABanner } from "../InstallPWABanner";
import { promptInstall, isInstalled } from "@/lib/pwa";

// Mock PWA utilities
jest.mock("@/lib/pwa", () => ({
  promptInstall: jest.fn(),
  isInstalled: jest.fn(),
}));

const mockedPromptInstall = promptInstall as jest.Mock;
const mockedIsInstalled = isInstalled as jest.Mock;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key],
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  writable: true,
  value: localStorageMock,
});

describe("InstallPWABanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it("does not render when app is installed", () => {
    mockedIsInstalled.mockReturnValue(true);

    render(<InstallPWABanner />);
    expect(screen.queryByText("Install Plenmo")).not.toBeInTheDocument();
  });

  it("does not render when banner was previously dismissed", () => {
    mockedIsInstalled.mockReturnValue(false);
    localStorageMock.setItem("pwa-banner-dismissed", "true");

    render(<InstallPWABanner />);
    expect(screen.queryByText("Install Plenmo")).not.toBeInTheDocument();
  });

  it("does not render by default (waiting for installable event)", () => {
    mockedIsInstalled.mockReturnValue(false);

    render(<InstallPWABanner />);
    expect(screen.queryByText("Install Plenmo")).not.toBeInTheDocument();
  });

  it("renders banner when installable event is dispatched", async () => {
    mockedIsInstalled.mockReturnValue(false);

    render(<InstallPWABanner />);

    // Dispatch installable event
    window.dispatchEvent(new Event("pwa-installable"));

    await waitFor(() => {
      expect(screen.getByText("Install Plenmo")).toBeInTheDocument();
    });
  });

  it("shows correct message when banner is displayed", async () => {
    mockedIsInstalled.mockReturnValue(false);

    render(<InstallPWABanner />);
    window.dispatchEvent(new Event("pwa-installable"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Get quick access and work offline. Install the app for the best experience."
        )
      ).toBeInTheDocument();
    });
  });

  it("calls promptInstall when Install button is clicked", async () => {
    mockedIsInstalled.mockReturnValue(false);
    mockedPromptInstall.mockResolvedValue(true);

    const user = userEvent.setup();
    render(<InstallPWABanner />);
    window.dispatchEvent(new Event("pwa-installable"));

    await waitFor(() => {
      expect(screen.getByText("Install")).toBeInTheDocument();
    });

    const installButton = screen.getByText("Install");
    await user.click(installButton);

    expect(mockedPromptInstall).toHaveBeenCalled();
  });

  it("shows installing state while installing", async () => {
    mockedIsInstalled.mockReturnValue(false);
    let resolvePrompt: (value: boolean) => void;
    mockedPromptInstall.mockReturnValue(
      new Promise((resolve) => {
        resolvePrompt = resolve;
      })
    );

    const user = userEvent.setup();
    render(<InstallPWABanner />);
    window.dispatchEvent(new Event("pwa-installable"));

    await waitFor(() => {
      expect(screen.getByText("Install")).toBeInTheDocument();
    });

    const installButton = screen.getByText("Install");
    await user.click(installButton);

    expect(screen.getByText("Installing...")).toBeInTheDocument();

    // Resolve the promise
    resolvePrompt!(true);
  });

  it("hides banner after successful installation", async () => {
    mockedIsInstalled.mockReturnValue(false);
    mockedPromptInstall.mockResolvedValue(true);

    const user = userEvent.setup();
    render(<InstallPWABanner />);
    window.dispatchEvent(new Event("pwa-installable"));

    await waitFor(() => {
      expect(screen.getByText("Install")).toBeInTheDocument();
    });

    const installButton = screen.getByText("Install");
    await user.click(installButton);

    await waitFor(() => {
      expect(screen.queryByText("Install Plenmo")).not.toBeInTheDocument();
    });
  });

  it("keeps banner showing after failed installation", async () => {
    mockedIsInstalled.mockReturnValue(false);
    mockedPromptInstall.mockResolvedValue(false);

    const user = userEvent.setup();
    render(<InstallPWABanner />);
    window.dispatchEvent(new Event("pwa-installable"));

    await waitFor(() => {
      expect(screen.getByText("Install")).toBeInTheDocument();
    });

    const installButton = screen.getByText("Install");
    await user.click(installButton);

    await waitFor(() => {
      expect(screen.getByText("Install Plenmo")).toBeInTheDocument();
      expect(screen.getByText("Install")).toBeInTheDocument();
    });
  });

  it('dismisses banner when "Not now" is clicked', async () => {
    mockedIsInstalled.mockReturnValue(false);

    const user = userEvent.setup();
    render(<InstallPWABanner />);
    window.dispatchEvent(new Event("pwa-installable"));

    await waitFor(() => {
      expect(screen.getByText("Not now")).toBeInTheDocument();
    });

    const dismissButton = screen.getByText("Not now");
    await user.click(dismissButton);

    expect(screen.queryByText("Install Plenmo")).not.toBeInTheDocument();
    expect(localStorageMock.getItem("pwa-banner-dismissed")).toBe("true");
  });

  it("dismisses banner when close button is clicked", async () => {
    mockedIsInstalled.mockReturnValue(false);

    const user = userEvent.setup();
    render(<InstallPWABanner />);
    window.dispatchEvent(new Event("pwa-installable"));

    await waitFor(() => {
      expect(screen.getByLabelText("Close banner")).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText("Close banner");
    await user.click(closeButton);

    expect(screen.queryByText("Install Plenmo")).not.toBeInTheDocument();
    expect(localStorageMock.getItem("pwa-banner-dismissed")).toBe("true");
  });

  it("does not show banner if previously dismissed", async () => {
    mockedIsInstalled.mockReturnValue(false);
    localStorageMock.setItem("pwa-banner-dismissed", "true");

    render(<InstallPWABanner />);
    window.dispatchEvent(new Event("pwa-installable"));

    // Wait to ensure banner doesn't appear
    await waitFor(
      () => {
        expect(screen.queryByText("Install Plenmo")).not.toBeInTheDocument();
      },
      { timeout: 100 }
    );
  });

  it("disables install button while installing", async () => {
    mockedIsInstalled.mockReturnValue(false);
    let resolvePrompt: (value: boolean) => void;
    mockedPromptInstall.mockReturnValue(
      new Promise((resolve) => {
        resolvePrompt = resolve;
      })
    );

    const user = userEvent.setup();
    render(<InstallPWABanner />);
    window.dispatchEvent(new Event("pwa-installable"));

    await waitFor(() => {
      const installButton = screen.getByText("Install");
      expect(installButton).toBeEnabled();
    });

    const installButton = screen.getByText("Install");
    await user.click(installButton);

    await waitFor(() => {
      const installingButton = screen.getByText("Installing...");
      expect(installingButton).toBeDisabled();
    });

    resolvePrompt!(true);
  });

  it("cleans up event listener on unmount", () => {
    mockedIsInstalled.mockReturnValue(false);

    const { unmount } = render(<InstallPWABanner />);

    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "pwa-installable",
      expect.any(Function)
    );
  });
});
