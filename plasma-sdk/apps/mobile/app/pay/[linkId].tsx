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

interface PaymentLink {
  amount: number;
  recipientName: string;
  memo?: string;
  status: string;
}

export default function PayScreen() {
  const { linkId } = useLocalSearchParams<{ linkId: string }>();
  const posthog = usePostHog();
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    posthog.capture('payment_link_viewed', { linkId });
    
    // Simulate fetching payment link data
    setTimeout(() => {
      setPaymentLink({
        amount: 15.00,
        recipientName: 'Sarah',
        memo: 'Coffee',
        status: 'active',
      });
      setLoading(false);
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId]);

  const handlePay = async () => {
    setPaying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    posthog.capture('payment_initiated', { linkId, amount: paymentLink?.amount ?? null });

    // Simulate payment
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    posthog.capture('payment_completed', { linkId, amount: paymentLink?.amount ?? null });
    
    setSuccess(true);
    setPaying(false);
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
          <Text style={styles.loadingText}>Loading payment...</Text>
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
          <Text style={styles.successTitle}>Paid!</Text>
          <Text style={styles.successAmount}>${paymentLink?.amount.toFixed(2)}</Text>
          <Text style={styles.successSubtitle}>
            sent to {paymentLink?.recipientName}
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!paymentLink) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Payment Not Found</Text>
          <Text style={styles.errorSubtitle}>
            This link may have expired
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
        {/* Recipient Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {paymentLink.recipientName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.title}>Pay {paymentLink.recipientName}</Text>

        {/* Amount */}
        <Text style={styles.amount}>${paymentLink.amount.toFixed(2)}</Text>
        <Text style={styles.currency}>USDT0</Text>

        {/* Memo */}
        {paymentLink.memo && (
          <View style={styles.memoContainer}>
            <Text style={styles.memoLabel}>For</Text>
            <Text style={styles.memoText}>{paymentLink.memo}</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Pay Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, paying && styles.payButtonDisabled]}
          onPress={handlePay}
          disabled={paying}
        >
          {paying ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="#000" />
              <Text style={styles.payButtonText}>
                Pay ${paymentLink.amount.toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.feeText}>Zero gas fees • Instant</Text>
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${ACCENT_COLOR}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: ACCENT_COLOR,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 32,
  },
  amount: {
    fontSize: 56,
    fontWeight: '700',
    color: '#fff',
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
    alignItems: 'center',
  },
  memoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  memoText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT_COLOR,
    borderRadius: 16,
    height: 56,
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
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
