import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePostHog } from 'posthog-react-native';

const ACCENT_COLOR = '#00d4ff';

interface ClaimData {
  amount: number;
  senderName: string;
  memo?: string;
  status: string;
}

export default function ClaimScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const posthog = usePostHog();
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    posthog.capture('claim_page_viewed', { token });
    
    // Simulate fetching claim data
    setTimeout(() => {
      setClaim({
        amount: 25.00,
        senderName: 'John',
        memo: 'Lunch money',
        status: 'pending',
      });
      setLoading(false);
    }, 1000);
  }, [token]);

  const handleClaim = async () => {
    setClaiming(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    posthog.capture('claim_initiated', { token, amount: claim?.amount });

    // Simulate claiming
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    posthog.capture('claim_completed', { token, amount: claim?.amount });
    
    setSuccess(true);
    setClaiming(false);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT_COLOR} />
          <Text style={styles.loadingText}>Loading your gift...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={48} color="#22c55e" />
          </View>
          <Text style={styles.successTitle}>Claimed!</Text>
          <Text style={styles.successAmount}>${claim?.amount.toFixed(2)}</Text>
          <Text style={styles.successSubtitle}>
            USDT0 added to your wallet
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!claim) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Claim Not Found</Text>
          <Text style={styles.errorSubtitle}>
            This link may have expired or been used
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeIconButton}>
          <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Gift Icon */}
        <View style={styles.giftIcon}>
          <Ionicons name="gift" size={48} color={ACCENT_COLOR} />
        </View>

        <Text style={styles.title}>You received money!</Text>
        <Text style={styles.subtitle}>From {claim.senderName}</Text>

        {/* Amount */}
        <Text style={styles.amount}>${claim.amount.toFixed(2)}</Text>
        <Text style={styles.currency}>USDT0</Text>

        {/* Memo */}
        {claim.memo && (
          <View style={styles.memoContainer}>
            <Text style={styles.memoText}>"{claim.memo}"</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Claim Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.claimButton, claiming && styles.claimButtonDisabled]}
          onPress={handleClaim}
          disabled={claiming}
        >
          {claiming ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="gift" size={20} color="#000" />
              <Text style={styles.claimButtonText}>
                Claim ${claim.amount.toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.feeText}>Zero gas fees on Plasma</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  closeIconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  giftIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${ACCENT_COLOR}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 32,
  },
  amount: {
    fontSize: 56,
    fontWeight: '700',
    color: ACCENT_COLOR,
  },
  currency: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  memoContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },
  memoText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT_COLOR,
    borderRadius: 16,
    height: 56,
    gap: 8,
  },
  claimButtonDisabled: {
    opacity: 0.7,
  },
  claimButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  feeText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34,197,94,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#22c55e',
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
    marginBottom: 32,
  },
  doneButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 32,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
});
