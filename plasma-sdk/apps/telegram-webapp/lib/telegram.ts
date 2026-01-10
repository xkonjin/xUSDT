/**
 * Telegram WebApp SDK Utilities
 *
 * Helpers for interacting with Telegram Mini App features.
 */

// Type declarations for Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
    auth_date?: number;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  sendData: (data: string) => void;
  switchInlineQuery: (query: string, choose_chat_types?: string[]) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text?: string;
    }>;
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  setHeaderColor: (color: 'bg_color' | 'secondary_bg_color' | string) => void;
  setBackgroundColor: (color: 'bg_color' | 'secondary_bg_color' | string) => void;
}

/**
 * Check if running inside Telegram WebApp
 */
export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp;
}

/**
 * Get the Telegram WebApp instance
 */
export function getWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp || null;
}

/**
 * Get the current Telegram user
 */
export function getTelegramUser(): TelegramUser | null {
  const webapp = getWebApp();
  return webapp?.initDataUnsafe?.user || null;
}

/**
 * Get the start parameter (for referral codes, etc.)
 */
export function getStartParam(): string | null {
  const webapp = getWebApp();
  return webapp?.initDataUnsafe?.start_param || null;
}

/**
 * Initialize the Telegram WebApp
 */
export function initTelegramWebApp(): void {
  const webapp = getWebApp();
  if (webapp) {
    webapp.ready();
    webapp.expand();
    webapp.setHeaderColor('#0a0a0f');
    webapp.setBackgroundColor('#0a0a0f');
  }
}

/**
 * Trigger haptic feedback
 */
export function hapticFeedback(type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy'): void {
  const webapp = getWebApp();
  if (!webapp) return;

  if (type === 'success' || type === 'error' || type === 'warning') {
    webapp.HapticFeedback.notificationOccurred(type);
  } else {
    webapp.HapticFeedback.impactOccurred(type);
  }
}

/**
 * Show the main button
 */
export function showMainButton(text: string, onClick: () => void): void {
  const webapp = getWebApp();
  if (!webapp) return;

  webapp.MainButton.setText(text);
  webapp.MainButton.onClick(onClick);
  webapp.MainButton.show();
}

/**
 * Hide the main button
 */
export function hideMainButton(): void {
  const webapp = getWebApp();
  if (!webapp) return;

  webapp.MainButton.hide();
}

/**
 * Show back button
 */
export function showBackButton(onClick: () => void): void {
  const webapp = getWebApp();
  if (!webapp) return;

  webapp.BackButton.onClick(onClick);
  webapp.BackButton.show();
}

/**
 * Hide back button
 */
export function hideBackButton(): void {
  const webapp = getWebApp();
  if (!webapp) return;

  webapp.BackButton.hide();
}

/**
 * Open a link
 */
export function openLink(url: string, inApp: boolean = false): void {
  const webapp = getWebApp();
  if (webapp) {
    webapp.openLink(url, { try_instant_view: inApp });
  } else {
    window.open(url, '_blank');
  }
}

/**
 * Share to chat
 */
export function shareToChat(text: string): void {
  const webapp = getWebApp();
  if (webapp) {
    webapp.switchInlineQuery(text, ['users', 'groups', 'channels']);
  }
}

/**
 * Close the webapp
 */
export function closeWebApp(): void {
  const webapp = getWebApp();
  webapp?.close();
}

/**
 * Show a popup
 */
export function showPopup(
  title: string,
  message: string,
  buttons?: Array<{ id: string; text: string; type?: 'default' | 'destructive' }>
): Promise<string> {
  return new Promise((resolve) => {
    const webapp = getWebApp();
    if (webapp) {
      webapp.showPopup(
        { title, message, buttons: buttons || [{ type: 'ok' }] },
        (buttonId) => resolve(buttonId)
      );
    } else {
      alert(message);
      resolve('ok');
    }
  });
}

/**
 * Show a confirm dialog
 */
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const webapp = getWebApp();
    if (webapp) {
      webapp.showConfirm(message, resolve);
    } else {
      resolve(confirm(message));
    }
  });
}
