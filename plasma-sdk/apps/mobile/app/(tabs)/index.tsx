import { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePostHog } from 'posthog-react-native';

const ACCENT_COLOR = '#00d4ff';

export default function HomeScreen() {
  const posthog = usePostHog();
  const [balance] = useState(125.50);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handleSend = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    posthog.capture('send_initiated', { 
      amount: parseFloat(amount), 
      has_recipient: !!recipient 
    });
    // TODO: Implement send flow
  };

  const handleQuickAction = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    posthog.capture('quick_action_pressed', { action });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.balance}>${balance.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle" size={40} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('send')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(0, 212, 255, 0.2)' }]}>
              <Ionicons name="arrow-up" size={24} color={ACCENT_COLOR} />
            </View>
            <Text style={styles.quickActionText}>Send</Text>
          </Pressable>

          <Pressable 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('request')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
              <Ionicons name="arrow-down" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.quickActionText}>Request</Text>
          </Pressable>

          <Pressable 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('scan')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
              <Ionicons name="scan" size={24} color="#22c55e" />
            </View>
            <Text style={styles.quickActionText}>Scan</Text>
          </Pressable>

          <Pressable 
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('link')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
              <Ionicons name="link" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.quickActionText}>Link</Text>
          </Pressable>
        </View>

        {/* Send Money Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Send Money</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.4)" />
            <TextInput
              style={styles.input}
              placeholder="Email, phone, or address"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={recipient}
              onChangeText={setRecipient}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>

          <TouchableOpacity 
            style={[styles.sendButton, (!recipient || !amount) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!recipient || !amount}
          >
            <Text style={styles.sendButtonText}>Send</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyText}>No recent transactions</Text>
            <Text style={styles.emptySubtext}>Send money to get started</Text>
          </View>
        </View>

        {/* Invite Banner */}
        <TouchableOpacity style={styles.inviteBanner}>
          <View style={styles.inviteIcon}>
            <Ionicons name="gift" size={24} color={ACCENT_COLOR} />
          </View>
          <View style={styles.inviteContent}>
            <Text style={styles.inviteTitle}>Invite Friends</Text>
            <Text style={styles.inviteSubtitle}>Earn $0.10 for each friend</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  balance: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  profileButton: {
    padding: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionButton: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    height: 52,
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  dollarSign: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.4)',
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '600',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT_COLOR,
    borderRadius: 16,
    height: 52,
    gap: 8,
    marginTop: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 100,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  inviteIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteContent: {
    flex: 1,
    marginLeft: 12,
  },
  inviteTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  inviteSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
});
