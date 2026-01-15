/**
 * Tests for Telegram WebApp SDK Utilities
 *
 * Tests core utilities for interacting with Telegram Mini App features.
 */

import {
  isTelegramWebApp,
  getWebApp,
  getTelegramUser,
  getStartParam,
  initTelegramWebApp,
  hapticFeedback,
  showMainButton,
  hideMainButton,
  showBackButton,
  hideBackButton,
  openLink,
  shareToChat,
  closeWebApp,
  showPopup,
  showConfirm,
} from '../telegram';

// Mock TelegramWebApp structure
const createMockWebApp = () => ({
  initData: 'test_init_data',
  initDataUnsafe: {
    user: {
      id: 123456789,
      first_name: 'John',
      last_name: 'Doe',
      username: 'johndoe',
      language_code: 'en',
      is_premium: true,
    },
    start_param: 'referral_code_123',
    auth_date: Date.now() / 1000,
    hash: 'test_hash',
  },
  version: '7.0',
  platform: 'ios',
  colorScheme: 'dark' as const,
  themeParams: {},
  isExpanded: false,
  viewportHeight: 600,
  viewportStableHeight: 600,
  headerColor: '#000000',
  backgroundColor: '#000000',
  BackButton: {
    isVisible: false,
    show: jest.fn(),
    hide: jest.fn(),
    onClick: jest.fn(),
    offClick: jest.fn(),
  },
  MainButton: {
    text: '',
    color: '',
    textColor: '',
    isVisible: false,
    isActive: true,
    isProgressVisible: false,
    setText: jest.fn(),
    onClick: jest.fn(),
    offClick: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
    showProgress: jest.fn(),
    hideProgress: jest.fn(),
  },
  HapticFeedback: {
    impactOccurred: jest.fn(),
    notificationOccurred: jest.fn(),
    selectionChanged: jest.fn(),
  },
  ready: jest.fn(),
  expand: jest.fn(),
  close: jest.fn(),
  sendData: jest.fn(),
  switchInlineQuery: jest.fn(),
  openLink: jest.fn(),
  openTelegramLink: jest.fn(),
  showPopup: jest.fn(),
  showAlert: jest.fn(),
  showConfirm: jest.fn(),
  enableClosingConfirmation: jest.fn(),
  disableClosingConfirmation: jest.fn(),
  setHeaderColor: jest.fn(),
  setBackgroundColor: jest.fn(),
});

describe('Telegram WebApp Utilities', () => {
  let mockWebApp: ReturnType<typeof createMockWebApp>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockWebApp = createMockWebApp();
    
    // Setup window.Telegram
    (window as any).Telegram = {
      WebApp: mockWebApp,
    };
  });

  afterEach(() => {
    // Clean up
    delete (window as any).Telegram;
  });

  describe('isTelegramWebApp', () => {
    it('should return true when running in Telegram WebApp', () => {
      expect(isTelegramWebApp()).toBe(true);
    });

    it('should return false when Telegram WebApp is not available', () => {
      delete (window as any).Telegram;
      expect(isTelegramWebApp()).toBe(false);
    });

    it('should return false when WebApp is undefined', () => {
      (window as any).Telegram = {};
      expect(isTelegramWebApp()).toBe(false);
    });
  });

  describe('getWebApp', () => {
    it('should return WebApp instance when available', () => {
      const webapp = getWebApp();
      expect(webapp).toBe(mockWebApp);
    });

    it('should return null when WebApp is not available', () => {
      delete (window as any).Telegram;
      const webapp = getWebApp();
      expect(webapp).toBeNull();
    });
  });

  describe('getTelegramUser', () => {
    it('should return user data when available', () => {
      const user = getTelegramUser();
      expect(user).toEqual({
        id: 123456789,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        language_code: 'en',
        is_premium: true,
      });
    });

    it('should return null when user is not available', () => {
      (mockWebApp.initDataUnsafe as any).user = undefined;
      const user = getTelegramUser();
      expect(user).toBeNull();
    });

    it('should return null when WebApp is not available', () => {
      delete (window as any).Telegram;
      const user = getTelegramUser();
      expect(user).toBeNull();
    });
  });

  describe('getStartParam', () => {
    it('should return start_param when available', () => {
      const param = getStartParam();
      expect(param).toBe('referral_code_123');
    });

    it('should return null when start_param is not available', () => {
      (mockWebApp.initDataUnsafe as any).start_param = undefined;
      const param = getStartParam();
      expect(param).toBeNull();
    });

    it('should return null when WebApp is not available', () => {
      delete (window as any).Telegram;
      const param = getStartParam();
      expect(param).toBeNull();
    });
  });

  describe('initTelegramWebApp', () => {
    it('should call ready, expand, and set colors', () => {
      initTelegramWebApp();
      
      expect(mockWebApp.ready).toHaveBeenCalled();
      expect(mockWebApp.expand).toHaveBeenCalled();
      expect(mockWebApp.setHeaderColor).toHaveBeenCalledWith('#0a0a0f');
      expect(mockWebApp.setBackgroundColor).toHaveBeenCalledWith('#0a0a0f');
    });

    it('should not throw when WebApp is not available', () => {
      delete (window as any).Telegram;
      expect(() => initTelegramWebApp()).not.toThrow();
    });
  });

  describe('hapticFeedback', () => {
    it('should call notificationOccurred for success', () => {
      hapticFeedback('success');
      expect(mockWebApp.HapticFeedback.notificationOccurred).toHaveBeenCalledWith('success');
    });

    it('should call notificationOccurred for error', () => {
      hapticFeedback('error');
      expect(mockWebApp.HapticFeedback.notificationOccurred).toHaveBeenCalledWith('error');
    });

    it('should call notificationOccurred for warning', () => {
      hapticFeedback('warning');
      expect(mockWebApp.HapticFeedback.notificationOccurred).toHaveBeenCalledWith('warning');
    });

    it('should call impactOccurred for light', () => {
      hapticFeedback('light');
      expect(mockWebApp.HapticFeedback.impactOccurred).toHaveBeenCalledWith('light');
    });

    it('should call impactOccurred for medium', () => {
      hapticFeedback('medium');
      expect(mockWebApp.HapticFeedback.impactOccurred).toHaveBeenCalledWith('medium');
    });

    it('should call impactOccurred for heavy', () => {
      hapticFeedback('heavy');
      expect(mockWebApp.HapticFeedback.impactOccurred).toHaveBeenCalledWith('heavy');
    });

    it('should not throw when WebApp is not available', () => {
      delete (window as any).Telegram;
      expect(() => hapticFeedback('success')).not.toThrow();
    });
  });

  describe('showMainButton', () => {
    it('should set text, onClick handler, and show the button', () => {
      const callback = jest.fn();
      showMainButton('Pay Now', callback);
      
      expect(mockWebApp.MainButton.setText).toHaveBeenCalledWith('Pay Now');
      expect(mockWebApp.MainButton.onClick).toHaveBeenCalledWith(callback);
      expect(mockWebApp.MainButton.show).toHaveBeenCalled();
    });

    it('should not throw when WebApp is not available', () => {
      delete (window as any).Telegram;
      expect(() => showMainButton('Pay', jest.fn())).not.toThrow();
    });
  });

  describe('hideMainButton', () => {
    it('should hide the main button', () => {
      hideMainButton();
      expect(mockWebApp.MainButton.hide).toHaveBeenCalled();
    });

    it('should not throw when WebApp is not available', () => {
      delete (window as any).Telegram;
      expect(() => hideMainButton()).not.toThrow();
    });
  });

  describe('showBackButton', () => {
    it('should set onClick handler and show the back button', () => {
      const callback = jest.fn();
      showBackButton(callback);
      
      expect(mockWebApp.BackButton.onClick).toHaveBeenCalledWith(callback);
      expect(mockWebApp.BackButton.show).toHaveBeenCalled();
    });

    it('should not throw when WebApp is not available', () => {
      delete (window as any).Telegram;
      expect(() => showBackButton(jest.fn())).not.toThrow();
    });
  });

  describe('hideBackButton', () => {
    it('should hide the back button', () => {
      hideBackButton();
      expect(mockWebApp.BackButton.hide).toHaveBeenCalled();
    });

    it('should not throw when WebApp is not available', () => {
      delete (window as any).Telegram;
      expect(() => hideBackButton()).not.toThrow();
    });
  });

  describe('openLink', () => {
    it('should call WebApp.openLink when in Telegram', () => {
      openLink('https://example.com');
      expect(mockWebApp.openLink).toHaveBeenCalledWith('https://example.com', { try_instant_view: false });
    });

    it('should use instant view when inApp is true', () => {
      openLink('https://example.com', true);
      expect(mockWebApp.openLink).toHaveBeenCalledWith('https://example.com', { try_instant_view: true });
    });

    it('should fall back to window.open when WebApp is not available', () => {
      delete (window as any).Telegram;
      const mockOpen = jest.fn();
      window.open = mockOpen;
      
      openLink('https://example.com');
      expect(mockOpen).toHaveBeenCalledWith('https://example.com', '_blank');
    });
  });

  describe('shareToChat', () => {
    it('should call switchInlineQuery with text and chat types', () => {
      shareToChat('Check this out!');
      expect(mockWebApp.switchInlineQuery).toHaveBeenCalledWith('Check this out!', ['users', 'groups', 'channels']);
    });

    it('should not throw when WebApp is not available', () => {
      delete (window as any).Telegram;
      expect(() => shareToChat('Test')).not.toThrow();
    });
  });

  describe('closeWebApp', () => {
    it('should call WebApp.close', () => {
      closeWebApp();
      expect(mockWebApp.close).toHaveBeenCalled();
    });

    it('should not throw when WebApp is not available', () => {
      delete (window as any).Telegram;
      expect(() => closeWebApp()).not.toThrow();
    });
  });

  describe('showPopup', () => {
    it('should call WebApp.showPopup and resolve with button id', async () => {
      mockWebApp.showPopup.mockImplementation((params, callback) => {
        callback?.('confirm');
      });

      const result = await showPopup('Title', 'Message', [
        { id: 'confirm', text: 'OK' },
        { id: 'cancel', text: 'Cancel' },
      ]);

      expect(mockWebApp.showPopup).toHaveBeenCalled();
      expect(result).toBe('confirm');
    });

    it('should use default ok button when buttons not provided', async () => {
      mockWebApp.showPopup.mockImplementation((params, callback) => {
        callback?.('ok');
      });

      const result = await showPopup('Title', 'Message');
      expect(result).toBe('ok');
    });

    it('should fall back to alert when WebApp is not available', async () => {
      delete (window as any).Telegram;
      const mockAlert = jest.fn();
      window.alert = mockAlert;

      const result = await showPopup('Title', 'Test message');
      expect(mockAlert).toHaveBeenCalledWith('Test message');
      expect(result).toBe('ok');
    });
  });

  describe('showConfirm', () => {
    it('should call WebApp.showConfirm and resolve with boolean', async () => {
      mockWebApp.showConfirm.mockImplementation((message, callback) => {
        callback?.(true);
      });

      const result = await showConfirm('Are you sure?');
      expect(mockWebApp.showConfirm).toHaveBeenCalledWith('Are you sure?', expect.any(Function));
      expect(result).toBe(true);
    });

    it('should resolve with false when user cancels', async () => {
      mockWebApp.showConfirm.mockImplementation((message, callback) => {
        callback?.(false);
      });

      const result = await showConfirm('Are you sure?');
      expect(result).toBe(false);
    });

    it('should fall back to window.confirm when WebApp is not available', async () => {
      delete (window as any).Telegram;
      const mockConfirm = jest.fn().mockReturnValue(true);
      window.confirm = mockConfirm;

      const result = await showConfirm('Are you sure?');
      expect(mockConfirm).toHaveBeenCalledWith('Are you sure?');
      expect(result).toBe(true);
    });
  });
});
