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
import { usePostHog } from 'posthog-react-native';

const ACCENT_COLOR = '#00d4ff';

export default function StreamsScreen() {
  const posthog = usePostHog();
  const [tab, setTab] = useState<'sending' | 'receiving'>('sending');
  const [streams] = useState<any[]>([]);

  const handleCreateStream = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    posthog.capture('create_stream_pressed');
    // TODO: Navigate to create stream
  };

  const handleTabChange = (newTab: 'sending' | 'receiving') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTab(newTab);
    posthog.capture('stream_tab_changed', { tab: newTab });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Plasma Stream</Text>
            <Text style={styles.subtitle}>Real-time payment streaming</Text>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateStream}>
            <Ionicons name="add" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === 'sending' && styles.tabActive]}
            onPress={() => handleTabChange('sending')}
          >
            <Ionicons 
              name="arrow-up" 
              size={18} 
              color={tab === 'sending' ? '#000' : 'rgba(255,255,255,0.6)'} 
            />
            <Text style={[styles.tabText, tab === 'sending' && styles.tabTextActive]}>
              Sending
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, tab === 'receiving' && styles.tabActive]}
            onPress={() => handleTabChange('receiving')}
          >
            <Ionicons 
              name="arrow-down" 
              size={18} 
              color={tab === 'receiving' ? '#000' : 'rgba(255,255,255,0.6)'} 
            />
            <Text style={[styles.tabText, tab === 'receiving' && styles.tabTextActive]}>
              Receiving
            </Text>
          </Pressable>
        </View>

        {/* Streams List */}
        <View style={styles.section}>
          {streams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trending-up" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>
                {tab === 'sending' ? 'No outgoing streams' : 'No incoming streams'}
              </Text>
              <Text style={styles.emptySubtext}>
                {tab === 'sending' 
                  ? 'Create a stream to pay someone over time' 
                  : 'Streams you receive will appear here'}
              </Text>
              {tab === 'sending' && (
                <TouchableOpacity style={styles.emptyButton} onPress={handleCreateStream}>
                  <Text style={styles.emptyButtonText}>Create your first stream</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            streams.map((stream) => (
              <TouchableOpacity key={stream.id} style={styles.streamCard}>
                <View style={styles.streamHeader}>
                  <View style={styles.streamIcon}>
                    <Ionicons 
                      name={tab === 'sending' ? 'arrow-up' : 'arrow-down'} 
                      size={20} 
                      color={ACCENT_COLOR} 
                    />
                  </View>
                  <View style={styles.streamInfo}>
                    <Text style={styles.streamAddress}>
                      {stream.address.slice(0, 6)}...{stream.address.slice(-4)}
                    </Text>
                    <Text style={styles.streamRate}>
                      ${stream.ratePerSecond}/sec
                    </Text>
                  </View>
                </View>
                <View style={styles.streamProgress}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[styles.progressFill, { width: `${stream.progress}%` }]} 
                    />
                  </View>
                  <Text style={styles.streamAmount}>
                    ${stream.streamed.toFixed(2)} / ${stream.total.toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Features */}
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Why Stream Payments?</Text>
          
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="time" size={24} color={ACCENT_COLOR} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Real-time Payments</Text>
              <Text style={styles.featureDesc}>Money flows every second, not monthly</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="flash" size={24} color="#f59e0b" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Instant Access</Text>
              <Text style={styles.featureDesc}>Withdraw earned funds anytime</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="shield-checkmark" size={24} color="#22c55e" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Trust Built In</Text>
              <Text style={styles.featureDesc}>Cancel anytime, get remaining funds back</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: ACCENT_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: ACCENT_COLOR,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  tabTextActive: {
    color: '#000',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
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
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptyButton: {
    marginTop: 20,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT_COLOR,
  },
  streamCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  streamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streamIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streamInfo: {
    flex: 1,
    marginLeft: 12,
  },
  streamAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  streamRate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  streamProgress: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT_COLOR,
    borderRadius: 3,
  },
  streamAmount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'right',
  },
  features: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
    marginLeft: 14,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  featureDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
});
