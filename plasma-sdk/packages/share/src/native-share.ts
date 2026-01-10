/**
 * Native Share API Utilities
 *
 * Use the Web Share API for native sharing on supported platforms.
 */

export interface NativeShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

/**
 * Check if native sharing is supported
 */
export function isNativeShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Check if file sharing is supported
 */
export function isFileShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'canShare' in navigator;
}

/**
 * Share using the native share dialog
 */
export async function nativeShare(data: NativeShareData): Promise<boolean> {
  if (!isNativeShareSupported()) {
    return false;
  }

  try {
    await navigator.share({
      title: data.title,
      text: data.text,
      url: data.url,
    });
    return true;
  } catch (error) {
    // User cancelled or share failed
    if ((error as Error).name === 'AbortError') {
      // User cancelled - not an error
      return false;
    }
    throw error;
  }
}

/**
 * Share with files using native share
 */
export async function nativeShareWithFiles(data: NativeShareData): Promise<boolean> {
  if (!isFileShareSupported() || !data.files?.length) {
    return false;
  }

  try {
    const shareData = {
      title: data.title,
      text: data.text,
      url: data.url,
      files: data.files,
    };

    if (!navigator.canShare(shareData)) {
      return false;
    }

    await navigator.share(shareData);
    return true;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return false;
    }
    throw error;
  }
}

/**
 * Copy text to clipboard (fallback for non-native share)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined') {
    return false;
  }

  try {
    if ('clipboard' in navigator) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

/**
 * Get available share channels based on platform
 */
export function getAvailableShareChannels(): string[] {
  const channels: string[] = ['copy'];

  if (typeof navigator === 'undefined') {
    return channels;
  }

  // Native share is available
  if (isNativeShareSupported()) {
    channels.push('native');
  }

  // These are always available as URL schemes
  channels.push('whatsapp', 'telegram', 'sms', 'email');

  // Twitter/X
  channels.push('twitter');

  return channels;
}
