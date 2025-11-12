/**
 * User Profile Page
 * 
 * Mobile-first profile management interface.
 * Users can set display names that appear on leaderboards.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { connectWallet, getCurrentAccount } from "../../../lib/wallet";

interface Profile {
  wallet_address: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  has_profile: boolean;
}

function ProfileContent() {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [displayName, setDisplayName] = useState("");
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [checkingName, setCheckingName] = useState(false);
  const [bio, setBio] = useState("");

  useEffect(() => {
    checkWallet();
  }, []);

  useEffect(() => {
    if (account) {
      loadProfile();
    }
  }, [account]);

  const checkWallet = async () => {
    try {
      const addr = await getCurrentAccount();
      setAccount(addr);
    } catch {
      // Wallet not connected
    }
  };

  const loadProfile = async () => {
    if (!account) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/polymarket/profile?walletAddress=${account}`);
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkNameAvailability = async (name: string) => {
    if (!name || name.length < 3) {
      setNameAvailable(null);
      return;
    }

    try {
      setCheckingName(true);
      const response = await fetch(`/api/polymarket/profile/check-name/${encodeURIComponent(name)}`);
      
      if (response.ok) {
        const data = await response.json();
        setNameAvailable(data.is_valid && data.is_available);
      }
    } catch (err) {
      console.error("Error checking name:", err);
    } finally {
      setCheckingName(false);
    }
  };

  useEffect(() => {
    if (displayName && displayName.length >= 3) {
      const timeoutId = setTimeout(() => {
        checkNameAvailability(displayName);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setNameAvailable(null);
    }
  }, [displayName]);

  const handleSave = async () => {
    if (!account) {
      try {
        const addr = await connectWallet();
        setAccount(addr);
        if (!addr) {
          setError("Please connect your wallet");
          return;
        }
      } catch (err) {
        setError(`Wallet connection failed: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
    }

    if (displayName && displayName.length < 3) {
      setError("Display name must be at least 3 characters");
      return;
    }

    if (displayName && nameAvailable === false) {
      setError("Display name is not available");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/polymarket/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_address: account,
          display_name: displayName || null,
          bio: bio || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.error || "Failed to save profile");
      }

      const data = await response.json();
      setProfile(data);
      setSuccess(true);
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="xui-container" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div style={{ textAlign: "center", padding: "48px 16px" }}>
          <p style={{ opacity: 0.7 }}>Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="xui-container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: "40px", textAlign: "center" }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: "12px", letterSpacing: "-0.02em", color: "var(--palantir-text-primary)" }}>
          Your Profile
        </h1>
        <p style={{ color: "var(--palantir-text-secondary)", fontSize: 16 }}>
          Set your display name to appear on leaderboards
        </p>
      </div>

      {/* Wallet Connection */}
      {!account && (
        <Card style={{ marginBottom: "24px", background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
          <div style={{ padding: "24px", textAlign: "center" }}>
            <p style={{ color: "var(--palantir-text-secondary)", marginBottom: "16px", fontSize: 15 }}>
              Connect your wallet to manage your profile
            </p>
            <Button onClick={checkWallet} variant="primary" style={{ minWidth: "200px" }}>
              Connect Wallet
            </Button>
          </div>
        </Card>
      )}

      {/* Profile Form */}
      {account && (
        <>
          <Card style={{ marginBottom: "24px" }}>
            <div style={{ padding: "24px" }}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: "8px", color: "var(--palantir-text-secondary)" }}>
                  Wallet Address
                </label>
                <p style={{ fontSize: 14, color: "var(--palantir-text-secondary)", fontFamily: "monospace" }}>
                  {account}
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: "8px", color: "var(--palantir-text-secondary)" }}>
                  Display Name
                </label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your display name"
                  maxLength={20}
                  style={{ fontSize: 16, padding: "12px" }}
                />
                <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                  {checkingName && (
                    <span style={{ fontSize: 12, color: "var(--palantir-text-muted)" }}>Checking...</span>
                  )}
                  {!checkingName && displayName.length >= 3 && nameAvailable === true && (
                    <span style={{ fontSize: 12, color: "#10b981" }}>✓ Available</span>
                  )}
                  {!checkingName && displayName.length >= 3 && nameAvailable === false && (
                    <span style={{ fontSize: 12, color: "#ef4444" }}>✗ Not available</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "var(--palantir-text-muted)", marginTop: "4px" }}>
                  3-20 characters, letters, numbers, and underscores only
                </p>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: "8px", color: "var(--palantir-text-secondary)" }}>
                  Bio (Optional)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={200}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: 14,
                    borderRadius: "8px",
                    border: "1px solid var(--palantir-border)",
                    background: "var(--palantir-gray-light)",
                    color: "var(--palantir-text-primary)",
                    fontFamily: "'Inter', sans-serif",
                    resize: "vertical",
                  }}
                />
                <p style={{ fontSize: 12, color: "var(--palantir-text-muted)", marginTop: "4px", textAlign: "right" }}>
                  {bio.length}/200
                </p>
              </div>

              {error && (
                <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", marginBottom: "16px" }}>
                  <p style={{ color: "#ef4444", fontSize: 13, textAlign: "center" }}>{error}</p>
                </div>
              )}

              {success && (
                <div style={{ padding: "12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", marginBottom: "16px" }}>
                  <p style={{ color: "#10b981", fontSize: 13, textAlign: "center" }}>Profile saved successfully!</p>
                </div>
              )}

              <Button
                onClick={handleSave}
                variant="primary"
                disabled={saving || (displayName.length > 0 && displayName.length < 3) || nameAvailable === false}
                style={{ width: "100%", minHeight: "56px", fontSize: 16, fontWeight: 600 }}
              >
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </Card>

          {/* Current Profile Info */}
          {profile && profile.has_profile && (
            <Card style={{ marginBottom: "24px", background: "rgba(59, 130, 246, 0.05)" }}>
              <div style={{ padding: "20px" }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "12px", color: "var(--palantir-text-primary)", letterSpacing: "-0.01em" }}>Current Profile</h3>
                {profile.display_name && (
                  <p style={{ fontSize: 14, color: "var(--palantir-text-secondary)", marginBottom: "8px" }}>
                    Display Name: <strong style={{ color: "var(--palantir-text-primary)" }}>{profile.display_name}</strong>
                  </p>
                )}
                {profile.bio && (
                  <p style={{ fontSize: 14, color: "var(--palantir-text-secondary)" }}>
                    Bio: {profile.bio}
                  </p>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Back Button */}
      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <Button onClick={() => router.back()} variant="outline" style={{ minWidth: "120px" }}>
          ← Back
        </Button>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

