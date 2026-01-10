import { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { usePostHog } from 'posthog-react-native';

const ACCENT_COLOR = '#00d4ff';

export default function BillsScreen() {
  const posthog = usePostHog();
  const [bills] = useState<any[]>([]);

  const handleScanReceipt = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    posthog.capture('scan_receipt_pressed');

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      posthog.capture('receipt_captured', { uri: result.assets[0].uri });
      // TODO: Process receipt
    }
  };

  const handleUploadReceipt = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    posthog.capture('upload_receipt_pressed');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      posthog.capture('receipt_uploaded', { uri: result.assets[0].uri });
      // TODO: Process receipt
    }
  };

  const handleCreateManual = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    posthog.capture('manual_bill_pressed');
    // TODO: Navigate to manual bill creation
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Splitzy</Text>
          <Text style={styles.subtitle}>Split bills with friends</Text>
        </View>

        {/* Create Bill Options */}
        <View style={styles.createSection}>
          <Pressable style={styles.primaryButton} onPress={handleScanReceipt}>
            <View style={styles.buttonIcon}>
              <Ionicons name="camera" size={28} color="#000" />
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonTitle}>Scan Receipt</Text>
              <Text style={styles.buttonSubtitle}>AI extracts items automatically</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(0,0,0,0.4)" />
          </Pressable>

          <View style={styles.secondaryButtons}>
            <Pressable style={styles.secondaryButton} onPress={handleUploadReceipt}>
              <Ionicons name="image" size={24} color={ACCENT_COLOR} />
              <Text style={styles.secondaryButtonText}>Upload</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={handleCreateManual}>
              <Ionicons name="create" size={24} color={ACCENT_COLOR} />
              <Text style={styles.secondaryButtonText}>Manual</Text>
            </Pressable>
          </View>
        </View>

        {/* Bills List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Bills</Text>
          
          {bills.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>No bills yet</Text>
              <Text style={styles.emptySubtext}>Scan a receipt to get started</Text>
            </View>
          ) : (
            bills.map((bill) => (
              <TouchableOpacity key={bill.id} style={styles.billCard}>
                <View style={styles.billInfo}>
                  <Text style={styles.billTitle}>{bill.title}</Text>
                  <Text style={styles.billAmount}>${bill.total.toFixed(2)}</Text>
                </View>
                <View style={styles.billMeta}>
                  <Text style={styles.billParticipants}>
                    {bill.participants} people
                  </Text>
                  <View style={[
                    styles.billStatus,
                    bill.status === 'completed' && styles.billStatusComplete
                  ]}>
                    <Text style={styles.billStatusText}>{bill.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* How it Works */}
        <View style={styles.howItWorks}>
          <Text style={styles.howItWorksTitle}>How it works</Text>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Scan Receipt</Text>
              <Text style={styles.stepDesc}>AI reads items & prices</Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Assign Items</Text>
              <Text style={styles.stepDesc}>Tap items to assign to friends</Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Share & Collect</Text>
              <Text style={styles.stepDesc}>Friends pay via link - zero fees</Text>
            </View>
          </View>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  createSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT_COLOR,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  buttonIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flex: 1,
    marginLeft: 14,
  },
  buttonTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  buttonSubtitle: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
    marginTop: 2,
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
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
  billCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  billInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT_COLOR,
  },
  billMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billParticipants: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  billStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  billStatusComplete: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  billStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#f59e0b',
  },
  howItWorks: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  howItWorksTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT_COLOR,
  },
  stepContent: {
    marginLeft: 12,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  stepDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
});
