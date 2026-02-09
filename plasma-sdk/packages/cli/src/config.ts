/**
 * Config Manager - Persistent CLI configuration
 */

import Conf from "conf";
import type { CLIConfig, WalletConfig } from "./types";

const DEFAULT_CONFIG: CLIConfig = {
  wallets: [],
  activeWallet: undefined,
  defaultNetwork: "plasma",
  facilitatorUrl: "https://pay.plasma.xyz",
  autoGas: true,
  preferPlasma: true,
};

export class ConfigManager {
  private config: Conf<CLIConfig>;

  constructor() {
    this.config = new Conf<CLIConfig>({
      projectName: "plasma-pay",
      defaults: DEFAULT_CONFIG,
    });
  }

  /**
   * Get the full config
   */
  getAll(): CLIConfig {
    return {
      wallets: this.config.get("wallets", []),
      activeWallet: this.config.get("activeWallet"),
      defaultNetwork: this.config.get("defaultNetwork", "plasma"),
      facilitatorUrl: this.config.get(
        "facilitatorUrl",
        "https://pay.plasma.xyz"
      ),
      autoGas: this.config.get("autoGas", true),
      preferPlasma: this.config.get("preferPlasma", true),
    };
  }

  /**
   * Get active wallet
   */
  getActiveWallet(): WalletConfig | undefined {
    const activeAddress = this.config.get("activeWallet");
    if (!activeAddress) return undefined;

    const wallets = this.config.get("wallets", []);
    return wallets.find(
      (w: any) => w.address.toLowerCase() === activeAddress.toLowerCase()
    );
  }

  /**
   * Set active wallet
   */
  setActiveWallet(address: string): void {
    this.config.set("activeWallet", address);
  }

  /**
   * Add a wallet
   */
  addWallet(wallet: WalletConfig): void {
    const wallets = this.config.get("wallets", []);
    const existing = wallets.findIndex(
      (w: any) => w.address.toLowerCase() === wallet.address.toLowerCase()
    );

    if (existing >= 0) {
      wallets[existing] = { ...wallets[existing], ...wallet };
    } else {
      wallets.push(wallet);
    }

    this.config.set("wallets", wallets);

    // Set as active if it's the first wallet
    if (wallets.length === 1) {
      this.setActiveWallet(wallet.address);
    }
  }

  /**
   * Remove a wallet
   */
  removeWallet(address: string): boolean {
    const wallets = this.config.get("wallets", []);
    const filtered = wallets.filter(
      (w: any) => w.address.toLowerCase() !== address.toLowerCase()
    );

    if (filtered.length === wallets.length) return false;

    this.config.set("wallets", filtered);

    // Clear active wallet if it was removed
    const activeWallet = this.config.get("activeWallet");
    if (activeWallet?.toLowerCase() === address.toLowerCase()) {
      this.config.set("activeWallet", filtered[0]?.address);
    }

    return true;
  }

  /**
   * List all wallets
   */
  listWallets(): WalletConfig[] {
    return this.config.get("wallets", []);
  }

  /**
   * Update wallet
   */
  updateWallet(address: string, updates: Partial<WalletConfig>): void {
    const wallets = this.config.get("wallets", []);
    const index = wallets.findIndex(
      (w: any) => w.address.toLowerCase() === address.toLowerCase()
    );

    if (index >= 0) {
      wallets[index] = { ...wallets[index], ...updates };
      this.config.set("wallets", wallets);
    }
  }

  /**
   * Set facilitator URL
   */
  setFacilitatorUrl(url: string): void {
    this.config.set("facilitatorUrl", url);
  }

  /**
   * Set default network
   */
  setDefaultNetwork(network: "plasma" | "base" | "ethereum"): void {
    this.config.set("defaultNetwork", network);
  }

  /**
   * Set auto gas preference
   */
  setAutoGas(enabled: boolean): void {
    this.config.set("autoGas", enabled);
  }

  /**
   * Set prefer Plasma preference
   */
  setPreferPlasma(enabled: boolean): void {
    this.config.set("preferPlasma", enabled);
  }

  /**
   * Reset config to defaults
   */
  reset(): void {
    this.config.clear();
  }

  /**
   * Get config file path
   */
  getConfigPath(): string {
    return this.config.path;
  }

  /**
   * Export config as JSON
   */
  export(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /**
   * Import config from JSON
   */
  import(json: string): void {
    const imported = JSON.parse(json) as Partial<CLIConfig>;

    if (imported.wallets) this.config.set("wallets", imported.wallets);
    if (imported.activeWallet)
      this.config.set("activeWallet", imported.activeWallet);
    if (imported.defaultNetwork)
      this.config.set("defaultNetwork", imported.defaultNetwork);
    if (imported.facilitatorUrl)
      this.config.set("facilitatorUrl", imported.facilitatorUrl);
    if (imported.autoGas !== undefined)
      this.config.set("autoGas", imported.autoGas);
    if (imported.preferPlasma !== undefined)
      this.config.set("preferPlasma", imported.preferPlasma);
  }
}

export default ConfigManager;
