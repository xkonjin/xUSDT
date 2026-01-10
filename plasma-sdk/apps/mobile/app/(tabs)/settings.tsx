import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePostHog } from 'posthog-react-native';
import { useState } from 'react';

const ACCENT_COLOR = '#00d4ff';

export default function SettingsScreen() {
  const posthog = usePostHog();
  const [notifications, setNotifications] = useState(true);

  const handleToggleNotifications = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications(value);
    posthog.capture('notifications_toggled', { enabled: value });
  };

  const handlePress = (setting: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    posthog.capture('setting_pressed', { setting });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Wallet Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handlePress('wallet')}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="wallet" size={22} color={ACCENT_COLOR} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Connected Wallet</Text>
              <Text style={styles.settingValue}>0x1234...5678</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handlePress('backup')}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="key" size={22} color="#f59e0b" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Backup Wallet</Text>
              <Text style={styles.settingValue}>Export recovery phrase</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="notifications" size={22} color="#8b5cf6" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingValue}>Receive payment alerts</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(0, 212, 255, 0.3)' }}
              thumbColor={notifications ? ACCENT_COLOR : '#666'}
            />
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handlePress('currency')}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="cash" size={22} color="#22c55e" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Default Currency</Text>
              <Text style={styles.settingValue}>USD</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>

        {/* Referral Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earn Rewards</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, styles.referralItem]}
            onPress={() => handlePress('referral')}
          >
            <View style={[styles.settingIcon, styles.referralIcon]}>
              <Ionicons name="gift" size={22} color={ACCENT_COLOR} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Invite Friends</Text>
              <Text style={styles.settingValue}>Earn $0.10 per referral</Text>
            </View>
            <View style={styles.referralBadge}>
              <Text style={styles.referralBadgeText}>$0</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handlePress('help')}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="help-circle" size={22} color="rgba(255,255,255,0.6)" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Help Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handlePress('contact')}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="chatbubble" size={22} color="rgba(255,255,255,0.6)" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Contact Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handlePress('about')}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="information-circle" size={22} color="rgba(255,255,255,0.6)" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>About</Text>
              <Text style={styles.settingValue}>Version 1.0.0</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => handlePress('logout')}
        >
          <Ionicons name="log-out" size={22} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Plasma Pay v1.0.0</Text>
          <Text style={styles.footerText}>Powered by Plasma Network</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 14,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  settingValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  referralItem: {
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    borderBottomWidth: 0,
    marginHorizontal: 20,
    borderRadius: 16,
  },
  referralIcon: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
  },
  referralBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  referralBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 100,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 4,
  },
});
