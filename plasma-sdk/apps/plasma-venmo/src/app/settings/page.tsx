"use client";

import { useState, useEffect } from "react";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Settings,
  Save,
  Loader2,
  Check,
} from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

type SettingsTab = "profile" | "notifications" | "security" | "general";

export default function SettingsPage() {
  const { authenticated, ready, wallet, user, logout } = usePlasmaWallet();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile settings
  const [displayName, setDisplayName] = useState("");

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [transactionAlerts, setTransactionAlerts] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Security settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // General settings
  const [currency, setCurrency] = useState("USD");
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    // Load user settings from API
    async function loadSettings() {
      if (!wallet?.address) return;
      try {
        const response = await fetch(
          `/api/user-settings?address=${wallet.address}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            setDisplayName(data.settings.displayName || "");
            setEmailNotifications(data.settings.emailNotifications ?? true);
            setTransactionAlerts(data.settings.transactionAlerts ?? true);
            setMarketingEmails(data.settings.marketingEmails ?? false);
            setCurrency(data.settings.currency || "USD");
            setTheme(data.settings.theme || "dark");
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
    loadSettings();
  }, [wallet?.address]);

  const handleSave = async () => {
    if (!wallet?.address) return;
    setSaving(true);
    try {
      const response = await fetch("/api/user-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: wallet.address,
          displayName,
          emailNotifications,
          transactionAlerts,
          marketingEmails,
          currency,
          theme,
        }),
      });
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[rgb(var(--bg-primary))]">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[rgb(var(--bg-primary))] p-4">
        <div className="text-center">
          <p className="text-white/50 mb-4">Please log in to access settings</p>
          <Link
            href="/"
            className="clay-button inline-block px-6 py-3 text-sm font-semibold"
          >
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "general", label: "General", icon: Settings },
  ];

  const userEmail = user?.email?.address;
  const userPhone = user?.phone?.number;

  return (
    <main className="min-h-dvh bg-[rgb(var(--bg-primary))] p-4">
      <div className="max-w-2xl mx-auto pt-4">
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </header>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-48 flex-shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 -mx-2 px-2 md:mx-0 md:px-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === tab.id
                      ? "bg-plenmo-500/10 text-plenmo-500"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-[rgb(var(--bg-elevated))] border border-white/[0.06] rounded-2xl p-6">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <h2 className="font-heading font-semibold text-white text-sm uppercase tracking-wider mb-4">
                    Profile Settings
                  </h2>

                  <div className="flex items-center gap-4">
                    <Avatar
                      name={displayName || userEmail || wallet?.address || ""}
                      size="xl"
                    />
                    <div>
                      <p className="text-white font-medium">
                        {displayName || "Set your name"}
                      </p>
                      <p className="text-white/50 text-sm">
                        {userEmail || userPhone || wallet?.address}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/50 text-sm mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your name"
                      className="clay-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-white/50 text-sm mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={userEmail || ""}
                      disabled
                      className="clay-input w-full opacity-50 cursor-not-allowed"
                    />
                    <p className="text-white/30 text-xs mt-1">
                      Email is managed through your login provider
                    </p>
                  </div>

                  <div>
                    <label className="block text-white/50 text-sm mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={userPhone || "Not set"}
                      disabled
                      className="clay-input w-full opacity-50 cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <h2 className="font-heading font-semibold text-white text-sm uppercase tracking-wider mb-4">
                    Notification Preferences
                  </h2>

                  <div className="space-y-4 divide-y divide-white/[0.06]">
                    <ToggleSetting
                      label="Email Notifications"
                      description="Receive important updates via email"
                      enabled={emailNotifications}
                      onChange={setEmailNotifications}
                    />
                    <ToggleSetting
                      label="Transaction Alerts"
                      description="Get notified when you send or receive money"
                      enabled={transactionAlerts}
                      onChange={setTransactionAlerts}
                    />
                    <ToggleSetting
                      label="Marketing Emails"
                      description="Receive news, tips, and promotional content"
                      enabled={marketingEmails}
                      onChange={setMarketingEmails}
                    />
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <h2 className="font-heading font-semibold text-white text-sm uppercase tracking-wider mb-4">
                    Security Settings
                  </h2>

                  <div className="space-y-4 divide-y divide-white/[0.06]">
                    <ToggleSetting
                      label="Two-Factor Authentication"
                      description="Add an extra layer of security to your account"
                      enabled={twoFactorEnabled}
                      onChange={setTwoFactorEnabled}
                      disabled
                      comingSoon
                    />

                    <div className="p-4 rounded-2xl bg-white/5 pt-8">
                      <h3 className="text-white font-medium mb-2">
                        Connected Devices
                      </h3>
                      <p className="text-white/50 text-sm mb-3">
                        Manage devices that have access to your account
                      </p>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                        <div>
                          <p className="text-white text-sm">Current Device</p>
                          <p className="text-white/40 text-xs">
                            Last active: Now
                          </p>
                        </div>
                        <span className="text-green-400 text-xs">Active</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 pt-8">
                      <h3 className="text-white font-medium mb-2">
                        Export Private Key
                      </h3>
                      <p className="text-white/50 text-sm mb-3">
                        Export your embedded wallet private key
                      </p>
                      <button
                        onClick={() =>
                          window.open(
                            "https://docs.privy.io/guide/react/wallets/export",
                            "_blank"
                          )
                        }
                        className="text-amber-400 text-sm hover:text-amber-300 transition-colors"
                      >
                        Learn about exporting →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* General Tab */}
              {activeTab === "general" && (
                <div className="space-y-6">
                  <h2 className="font-heading font-semibold text-white text-sm uppercase tracking-wider mb-4">
                    General Settings
                  </h2>

                  <div>
                    <label className="block text-white/50 text-sm mb-2">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="clay-input w-full"
                    >
                      <option
                        className="bg-[rgb(28,28,36)] text-white"
                        value="USD"
                      >
                        USD ($)
                      </option>
                      <option
                        className="bg-[rgb(28,28,36)] text-white"
                        value="EUR"
                      >
                        EUR (€)
                      </option>
                      <option
                        className="bg-[rgb(28,28,36)] text-white"
                        value="GBP"
                      >
                        GBP (£)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/50 text-sm mb-2">
                      Theme
                    </label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="clay-input w-full"
                    >
                      <option
                        className="bg-[rgb(28,28,36)] text-white"
                        value="dark"
                      >
                        Dark
                      </option>
                      <option
                        className="bg-[rgb(28,28,36)] text-white"
                        value="light"
                        disabled
                      >
                        Light (Coming Soon)
                      </option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-white/[0.06]">
                    <h3 className="text-white font-medium mb-2">Danger Zone</h3>
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to sign out?")) {
                          logout?.();
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="clay-button clay-button-primary flex items-center justify-center gap-2 w-full"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : saved ? (
                    <>
                      <Check className="w-5 h-5" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function ToggleSetting({
  label,
  description,
  enabled,
  onChange,
  disabled,
  comingSoon,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-4 first:pt-0 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <p className="text-white font-medium">{label}</p>
          {comingSoon && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
              Coming Soon
            </span>
          )}
        </div>
        <p className="text-white/50 text-sm">{description}</p>
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        role="switch"
        aria-checked={enabled}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? "bg-plenmo-500" : "bg-white/20"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : ""
          }`}
        />
      </button>
    </div>
  );
}
