"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Wallet,
  Settings,
  Copy,
  Check,
  X,
  ChevronRight,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { Avatar } from "./ui/Avatar";
import { formatAddress, copyToClipboard } from "@/lib/utils";
import { ModalPortal } from "./ui/ModalPortal";

interface UserProfileProps {
  user: {
    email?: { address: string };
    phone?: { number: string };
    wallet?: { address: string };
  } | null;
  walletAddress?: string;
  onLogout?: () => void;
}

export function UserProfileButton({
  user,
  walletAddress,
  onLogout,
}: UserProfileProps) {
  const [showModal, setShowModal] = useState(false);
  const displayName =
    user?.email?.address ||
    user?.phone?.number ||
    formatAddress(walletAddress || "");

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
      >
        <Avatar name={displayName} size="sm" />
      </button>

      {showModal && (
        <UserProfileModal
          user={user}
          walletAddress={walletAddress}
          onClose={() => setShowModal(false)}
          onLogout={onLogout}
        />
      )}
    </>
  );
}

interface UserProfileModalProps extends UserProfileProps {
  onClose: () => void;
}

function UserProfileModal({
  user,
  walletAddress,
  onClose,
  onLogout,
}: UserProfileModalProps) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const displayName = user?.email?.address || user?.phone?.number || "User";
  const email = user?.email?.address;

  const navigateToSettings = (tab?: string) => {
    onClose();
    router.push(tab ? `/settings?tab=${tab}` : "/settings");
  };

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    const success = await copyToClipboard(walletAddress);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    onClose();
    onLogout?.();
  };

  return (
    <ModalPortal
      isOpen={true}
      onClose={onClose}
      zIndex={110}
      containerClassName="items-start pt-20"
      wrapperClassName="max-w-sm"
    >
      <div className="relative w-full bg-[rgb(var(--bg-elevated))] border border-white/[0.06] rounded-2xl overflow-hidden">
        {/* Header with profile info */}
        <div className="relative bg-plenmo-500/10 p-6 pb-16">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>

          <div className="flex flex-col items-center">
            <Avatar
              name={displayName}
              size="xl"
              className="ring-4 ring-white/20 mb-3"
            />
            <h2 className="text-xl font-bold text-white">{displayName}</h2>
            {email && displayName !== email && (
              <p className="text-white/60 text-sm">{email}</p>
            )}
          </div>
        </div>

        {/* Wallet address card */}
        <div className="-mt-8 mx-4 relative z-10">
          <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-plenmo-500/10">
                  <Wallet className="w-5 h-5 text-plenmo-500" />
                </div>
                <div>
                  <p className="text-white/50 text-xs">Wallet Address</p>
                  <p className="text-white font-mono text-sm">
                    {formatAddress(walletAddress || "", 8, 6)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopyAddress}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/50" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="p-4 space-y-1">
          <MenuItem
            icon={User}
            label="Edit Profile"
            onClick={() => navigateToSettings("profile")}
          />
          <MenuItem
            icon={Bell}
            label="Notifications"
            onClick={() => navigateToSettings("notifications")}
          />
          <MenuItem
            icon={Shield}
            label="Security"
            onClick={() => navigateToSettings("security")}
          />
          <MenuItem
            icon={Settings}
            label="Settings"
            onClick={() => navigateToSettings("general")}
          />
          <MenuItem
            icon={HelpCircle}
            label="Help & Support"
            onClick={() => window.open("https://plasma.to", "_blank")}
          />

          <div className="border-t border-white/10 my-3" />

          <MenuItem
            icon={LogOut}
            label="Sign Out"
            onClick={handleLogout}
            destructive
          />
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <p className="text-white/30 text-xs text-center">
            Plenmo v0.1.0 • Powered by Plasma Chain
          </p>
        </div>
      </div>
    </ModalPortal>
  );
}

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
  disabled,
}: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : destructive
          ? "hover:bg-red-500/10 text-red-400"
          : "hover:bg-white/5 text-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`w-5 h-5 ${
            destructive ? "text-red-400" : "text-white/50"
          }`}
        />
        <span className="font-medium">{label}</span>
      </div>
      {!destructive && <ChevronRight className="w-4 h-4 text-white/30" />}
    </button>
  );
}
